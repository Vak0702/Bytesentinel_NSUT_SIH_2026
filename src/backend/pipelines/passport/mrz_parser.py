import re
from datetime import date


def clean_mrz_line(line: str) -> str:
    """
    Normalize OCR output into MRZ characters.
    """

    line = line.upper().strip()

    # Keep only ICAO MRZ characters.
    line = re.sub(r"[^A-Z0-9<]", "", line)

    return line


def expand_year(two_digit_year: int) -> int:
    """
    Expand YY into YYYY.

    Passport MRZ dates use two-digit years.
    """
    current_year = date.today().year
    current_yy = current_year % 100

    if two_digit_year <= current_yy:
        return 2000 + two_digit_year

    return 1900 + two_digit_year


def parse_mrz_date(value: str, date_type: str) -> str | None:
    """
    Convert YYMMDD -> YYYY-MM-DD.

    MRZ stores only a two-digit year, so the century has to be
    inferred from the type of date.

    DOB:
        00-26 -> 2000-2026
        27-99 -> 1927-1999

    Expiry:
        Current passport expiries are treated as 2000-2099.
    """

    if not re.fullmatch(r"\d{6}", value):
        return None

    yy = int(value[0:2])
    mm = int(value[2:4])
    dd = int(value[4:6])

    if date_type == "dob":
        current_yy = date.today().year % 100

        if yy <= current_yy:
            yyyy = 2000 + yy
        else:
            yyyy = 1900 + yy

    elif date_type == "expiry":
        yyyy = 2000 + yy

    else:
        raise ValueError(f"Unknown date type: {date_type}")

    try:
        return date(yyyy, mm, dd).isoformat()
    except ValueError:
        return None


def parse_name_field(value: str):
    """
    Parse:

        SURNAME<<GIVEN<NAMES

    into surname and given names.
    """

    value = value.rstrip("<")

    if "<<" in value:
        surname, given = value.split("<<", 1)
    else:
        # Damaged separator fallback.
        parts = value.split("<")

        surname = parts[0] if parts else ""
        given = " ".join(
            part for part in parts[1:]
            if part
        )

    surname = surname.replace("<", " ").strip()
    given = given.replace("<", " ").strip()

    return surname, given


def parse_td3(line1: str, line2: str) -> dict:
    """
    Parse a TD3 passport MRZ.

    TD3:
        Line 1 = 44 characters
        Line 2 = 44 characters
    """

    line1 = clean_mrz_line(line1)
    line2 = clean_mrz_line(line2)

    # OCR may return extra characters.
    line1 = line1[:44]
    line2 = line2[:44]

    if len(line1) < 5:
        raise ValueError("Invalid TD3 line 1.")

    if len(line2) < 28:
        raise ValueError("Invalid TD3 line 2.")

    # ---------------------------------------------------------
    # LINE 1
    # ---------------------------------------------------------

    # Position 0: document type
    # Position 1-2: issuing state
    # Position 5-43: name field
    name_field = line1[5:44]

    surname, given_names = parse_name_field(name_field)

    # ---------------------------------------------------------
    # LINE 2
    # ---------------------------------------------------------

    # Positions:
    # 0-8   passport number
    # 9     passport number check digit
    # 10-12 nationality
    # 13-18 DOB
    # 19    DOB check digit
    # 20    sex
    # 21-26 expiry
    # 27    expiry check digit
    # 28-42 optional/personal number
    # 43    overall check digit

    passport_number = line2[0:9]
    nationality = line2[10:13]
    dob_raw = line2[13:19]
    gender = line2[20]
    expiry_raw = line2[21:27]

    passport_number = passport_number.rstrip("<")
    nationality = nationality.strip()
    gender = gender if gender in ("M", "F", "X") else None

    dob = parse_mrz_date(dob_raw, "dob")
    expiry = parse_mrz_date(expiry_raw, "expiry")   

    # ---------------------------------------------------------
    # NAME
    # ---------------------------------------------------------

    name_parts = []

    if surname:
        name_parts.append(surname.title())

    if given_names:
        name_parts.append(given_names.title())

    full_name = " ".join(name_parts)

    return {
        "name": full_name or None,
        "surname": surname.title() if surname else None,
        "given_names": given_names.title() if given_names else None,
        "passport_number": passport_number or None,
        "nationality": nationality or None,
        "date_of_birth": dob,
        "date_of_expiry": expiry,
        "gender": gender,
    }


def _score_td3_line1(line: str) -> int:
    """
    Score how likely a line is to be TD3 MRZ line 1.

    TD3 line 1 normally looks like:

        P<INDSURNAME<<GIVEN<NAMES<<<<...

    We intentionally use structural checks rather than exact text.
    """

    score = 0

    if line.startswith("P<"):
        score += 100

    # Issuing country code is positions 2-4.
    if len(line) >= 5:
        country = line[2:5]

        if (
            len(country) == 3
            and country.isalpha()
        ):
            score += 30

    # Name field normally contains << separating surname/given names.
    if "<<" in line:
        score += 40

    # TD3 name area contains many '<' filler/separator characters.
    if line.count("<") >= 3:
        score += 10

    # A line of roughly TD3 length is a strong hint.
    if 35 <= len(line) <= 50:
        score += 10

    return score


def _score_td3_line2(line: str) -> int:
    """
    Score how likely a line is to be TD3 MRZ line 2.

    TD3 line 2:

        0-8   passport number
        9     check digit
        10-12 nationality
        13-18 DOB
        19    DOB check digit
        20    sex
        21-26 expiry
        27    expiry check digit
        ...
    """

    score = 0

    if len(line) >= 28:
        score += 10

    # Passport number area normally has letters/digits.
    if len(line) >= 9:
        passport_part = line[:9]

        if any(ch.isdigit() for ch in passport_part):
            score += 15

    # Position 9 should be a check digit.
    if len(line) >= 10 and line[9].isdigit():
        score += 20

    # Nationality is normally 3 letters.
    if len(line) >= 13:
        nationality = line[10:13]

        if (
            len(nationality) == 3
            and nationality.isalpha()
        ):
            score += 35

    # DOB: YYMMDD
    if len(line) >= 19 and line[13:19].isdigit():
        score += 25

    # DOB check digit
    if len(line) >= 20 and line[19].isdigit():
        score += 10

    # Sex
    if len(line) >= 21 and line[20] in ("M", "F", "X"):
        score += 15

    # Expiry: YYMMDD
    if len(line) >= 27 and line[21:27].isdigit():
        score += 25

    # Expiry check digit
    if len(line) >= 28 and line[27].isdigit():
        score += 10

    # TD3 lines are normally close to 44 chars.
    if 35 <= len(line) <= 50:
        score += 10

    return score


def parse_mrz(lines: list[str]) -> dict:
    """
    Parse OCR-recognized MRZ lines.

    This version identifies TD3 lines using MRZ structure rather than
    requiring the OCR output to be perfectly formatted.
    """

    if not lines:
        raise ValueError("No MRZ lines supplied.")

    # ---------------------------------------------------------
    # Normalize OCR lines.
    # ---------------------------------------------------------

    cleaned = []

    for line in lines:
        if not line or not line.strip():
            continue

        normalized = clean_mrz_line(line)

        if normalized:
            cleaned.append(normalized)

    if len(cleaned) < 2:
        raise ValueError(
            f"Could not identify TD3 MRZ lines. "
            f"Only {len(cleaned)} usable OCR lines found."
        )

    # ---------------------------------------------------------
    # Score every OCR line independently.
    # ---------------------------------------------------------

    scored_line1 = sorted(
        (
            (_score_td3_line1(line), line)
            for line in cleaned
        ),
        key=lambda item: item[0],
        reverse=True,
    )

    scored_line2 = sorted(
        (
            (_score_td3_line2(line), line)
            for line in cleaned
        ),
        key=lambda item: item[0],
        reverse=True,
    )

    line1 = None
    line2 = None

    # Strong structural identification.
    if scored_line1 and scored_line1[0][0] >= 40:
        line1 = scored_line1[0][1]

    if scored_line2 and scored_line2[0][0] >= 40:
        line2 = scored_line2[0][1]

    # ---------------------------------------------------------
    # Fallback 1:
    # If OCR damaged "P<", choose the best name-like line.
    # ---------------------------------------------------------

    if line1 is None:
        for score, candidate in scored_line1:
            if "<<" in candidate and candidate.count("<") >= 2:
                line1 = candidate
                break

    # ---------------------------------------------------------
    # Fallback 2:
    # For a clean MRZ crop there should normally be exactly two
    # useful lines. Use the two longest candidates.
    # ---------------------------------------------------------

    if line1 is None or line2 is None:

        longest = sorted(
            cleaned,
            key=len,
            reverse=True,
        )

        if len(longest) >= 2:

            if line1 is None:
                # Prefer a line with obvious name separator.
                for candidate in longest:
                    if candidate != line2 and "<<" in candidate:
                        line1 = candidate
                        break

                if line1 is None:
                    line1 = longest[0]

            if line2 is None:
                for candidate in longest:
                    if candidate != line1:
                        line2 = candidate
                        break

    # ---------------------------------------------------------
    # Final validation.
    # ---------------------------------------------------------

    if line1 is None or line2 is None:
        raise ValueError(
            "Could not identify TD3 MRZ lines."
        )

    # The name line must contain a document/name structure.
    # The second line must be long enough for the fixed TD3 fields.
    if len(line1) < 10 or len(line2) < 28:
        raise ValueError(
            "Identified MRZ lines are too short for TD3."
        )

    # Make sure they are not accidentally the same line.
    if line1 == line2:
        raise ValueError(
            "The same OCR line was selected twice."
        )

    return parse_td3(line1, line2)
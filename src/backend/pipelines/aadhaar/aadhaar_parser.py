import re
from datetime import datetime


# =========================================================
# EXTRACTION
# =========================================================


def extract_aadhaar_number(text):
    """
    Extract a 12-digit Aadhaar number.

    Handles:
        1234 5678 9012
        123456789012
    """

    # Prefer a number appearing near Aadhaar-related text.
    for line in text.splitlines():

        if "aadhaar" in line.lower():

            match = re.search(
                r"\b\d{4}\s?\d{4}\s?\d{4}\b",
                line
            )

            if match:
                return match.group().replace(" ", "")

    # Fallback.
    match = re.search(
        r"\b\d{4}\s?\d{4}\s?\d{4}\b",
        text
    )

    if match:
        return match.group().replace(" ", "")

    return None


def extract_dob(text):
    """
    Extract date of birth.

    Examples:
        DOB: 30/05/1995
        DOB:30/05/1995
        DOB - 30/05/1995
        GHTRG/DOB:30/05/1995
    """

    match = re.search(
        r"DOB\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})",
        text,
        re.IGNORECASE
    )

    if match:
        return match.group(1).replace("-", "/")

    return None


def extract_gender(text):
    """
    Extract gender.
    """

    match = re.search(
        r"\b(FEMALE|MALE)\b",
        text,
        re.IGNORECASE
    )

    if match:
        return match.group(1).upper()

    return None


def extract_name(text):
    """
    Extract name from the front side.

    The parser looks for DOB and searches backwards
    for the nearest meaningful line.
    """

    lines = text.splitlines()

    ignored_lines = {
        "government of india",
        "aadhaar",
        "unique identification authority of india"
    }

    for i, line in enumerate(lines):

        line = line.strip()

        if "DOB" in line.upper() and i > 0:

            for j in range(i - 1, -1, -1):

                candidate = lines[j].strip()

                if not candidate:
                    continue

                if candidate.lower() in ignored_lines:
                    continue

                return candidate

    return None


def extract_vid(text):
    """
    Extract a 16-digit VID.

    Examples:
        VID : 9186 7890 6417 0314
        VID:9186789064170314
    """

    match = re.search(
        r"VID\s*:?\s*(\d{4}\s?\d{4}\s?\d{4}\s?\d{4})",
        text,
        re.IGNORECASE
    )

    if match:
        return match.group(1).replace(" ", "")

    return None


def extract_address(text):
    """
    Extract address from the Aadhaar back side.
    """

    lines = text.splitlines()

    address_lines = []
    collecting = False

    for line in lines:

        line = line.strip()

        if "ADDRESS:" in line.upper():
            collecting = True
            continue

        if collecting:

            # VID marks the end of the address section.
            if re.search(
                r"\bVID\s*:?",
                line,
                re.IGNORECASE
            ):
                break

            # Aadhaar number also marks the end.
            if re.search(
                r"\b\d{4}\s?\d{4}\s?\d{4}\b",
                line
            ):
                break

            if line:
                address_lines.append(line)

    if address_lines:
        return " ".join(address_lines)

    return None


# =========================================================
# VALIDATION
# =========================================================


def validate_aadhaar_number(aadhaar_number):
    """
    Check whether Aadhaar number contains exactly 12 digits.

    Note:
    This checks format only. It does NOT authenticate
    the number with UIDAI.
    """

    if not aadhaar_number:
        return False

    return bool(
        re.fullmatch(r"\d{12}", aadhaar_number)
    )


def validate_dob(dob):
    """
    Check whether DOB is a real DD/MM/YYYY date.
    """

    if not dob:
        return False

    try:
        datetime.strptime(
            dob,
            "%d/%m/%Y"
        )

        return True

    except ValueError:
        return False


def validate_gender(gender):
    """
    Check whether gender is MALE or FEMALE.
    """

    return gender in {
        "MALE",
        "FEMALE"
    }


def validate_vid(vid):
    """
    Check whether VID contains exactly 16 digits.
    """

    if not vid:
        return False

    return bool(
        re.fullmatch(r"\d{16}", vid)
    )


def validate_required_fields(result):
    """
    Check whether all required fields are present.
    """

    required_fields = [
        "name",
        "date_of_birth",
        "gender",
        "aadhaar_number",
        "address",
        "vid"
    ]

    return {
        field: bool(result.get(field))
        for field in required_fields
    }


# =========================================================
# FRONT / BACK CONSISTENCY
# =========================================================


def check_front_back_match(
    front_aadhaar_number,
    back_aadhaar_number
):
    """
    Compare Aadhaar numbers from both sides.

    Returns:
        True  -> numbers match
        False -> numbers don't match
        None  -> one/both numbers unavailable
    """

    if (
        not front_aadhaar_number
        or not back_aadhaar_number
    ):
        return None

    return (
        front_aadhaar_number
        == back_aadhaar_number
    )


# =========================================================
# MAIN PARSER
# =========================================================


def parse_aadhaar(
    front_text,
    back_text
):
    """
    Parse both sides of an Aadhaar document.
    """

    # -----------------------------
    # FRONT
    # -----------------------------

    front_aadhaar_number = extract_aadhaar_number(
        front_text
    )

    # -----------------------------
    # BACK
    # -----------------------------

    back_aadhaar_number = extract_aadhaar_number(
        back_text
    )

    # -----------------------------
    # Extract fields
    # -----------------------------

    result = {

        "name":
            extract_name(front_text),

        "date_of_birth":
            extract_dob(front_text),

        "gender":
            extract_gender(front_text),

        "aadhaar_number":
            front_aadhaar_number,

        "address":
            extract_address(back_text),

        "vid":
            extract_vid(back_text),

        # Internal value used for consistency check.
        "back_aadhaar_number":
            back_aadhaar_number
    }

    # -----------------------------
    # Validation
    # -----------------------------

    required_fields = validate_required_fields(
        result
    )

    front_back_match = check_front_back_match(
        front_aadhaar_number,
        back_aadhaar_number
    )

    result["validation"] = {

        "aadhaar_number_format":
            validate_aadhaar_number(
                front_aadhaar_number
            ),

        "dob_format":
            validate_dob(
                result["date_of_birth"]
            ),

        "gender_valid":
            validate_gender(
                result["gender"]
            ),

        "vid_format":
            validate_vid(
                result["vid"]
            ),

        "required_fields_present":
            required_fields,

        "front_back_aadhaar_match":
            front_back_match
    }

    return result
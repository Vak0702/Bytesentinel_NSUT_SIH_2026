"""
Turn parsed MRZ fields into the shape the database and the console expect.

This module was imported by `passport_mrz.py` but was not in the files you
handed over, so this is a fresh implementation. It does three things:

  1. maps MRZ field names onto the `passports` table's column names
  2. normalises values (ICAO dates, `<` filler, three-letter country codes)
  3. reports how confident the extraction is, per field

Deliberately no database access here. This module is pure data transformation,
which means it can be tested without a running MySQL and reused by anything
that has MRZ fields in hand. The comparison against stored records lives in
`services/passport_matcher.py`, where it can see the database.
"""

from __future__ import annotations

import re
from datetime import date

# ICAO 9303 assigns a weight cycle of 7, 3, 1 across each field, and maps
# letters to 10-35. The check digit is the weighted sum mod 10. This is what
# lets us catch an OCR misread without consulting any database at all.
_CHECK_WEIGHTS = (7, 3, 1)


def _char_value(char: str) -> int:
    if char.isdigit():
        return int(char)
    if char == "<":
        return 0
    if "A" <= char <= "Z":
        return ord(char) - ord("A") + 10
    return 0


def compute_check_digit(field: str) -> int:
    """ICAO 9303 check digit for an MRZ field."""
    total = 0
    for index, char in enumerate(field):
        total += _char_value(char) * _CHECK_WEIGHTS[index % 3]
    return total % 10


def verify_check_digit(field: str, digit: str) -> bool | None:
    """
    True / False if the digit can be checked, None if the OCR did not give us
    a digit to check against. None matters: "we could not verify" is different
    information from "it failed", and collapsing the two would make a blurry
    scan look like a forgery.
    """
    if not field or not digit or not digit.isdigit():
        return None
    return compute_check_digit(field) == int(digit)


def clean_field(value: str | None) -> str | None:
    """Strip MRZ filler characters and collapse whitespace."""
    if not value:
        return None
    cleaned = value.replace("<", " ").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or None


def normalise_passport_number(value: str | None) -> str | None:
    """
    Uppercase, strip filler and spaces.

    Note what is NOT done here: no correcting 0 to O or 1 to I. Those are the
    classic OCR confusions, but silently "fixing" a passport number is how you
    turn a genuine mismatch into a false match. If the number is misread the
    check digit will fail and the officer gets told, which is the correct
    outcome.
    """
    if not value:
        return None
    cleaned = re.sub(r"[^A-Z0-9]", "", value.upper())
    return cleaned or None


def is_expired(expiry_iso: str | None) -> bool | None:
    if not expiry_iso:
        return None
    try:
        return date.fromisoformat(expiry_iso) < date.today()
    except ValueError:
        return None


def build_passport_result(
    extracted_data: dict,
    mrz_lines: tuple[str, str] | None = None,
) -> dict:
    """
    Map parsed MRZ output onto the `passports` table's columns.

    Returns:
        {
          "document_type": "PASSPORT",
          "fields":     {...}   ready to compare with a passports row
          "checks":     {...}   ICAO check-digit verification
          "confidence": 0.0-1.0
          "issues":     [...]   human-readable problems
          "raw":        {...}   whatever the parser produced, unmodified
        }
    """
    fields = {
        "passport_number": normalise_passport_number(extracted_data.get("passport_number")),
        "name": clean_field(extracted_data.get("name")),
        "surname": clean_field(extracted_data.get("surname")),
        "given_names": clean_field(extracted_data.get("given_names")),
        "nationality": (extracted_data.get("nationality") or "").strip().upper() or None,
        "date_of_birth": extracted_data.get("date_of_birth"),
        "date_of_expiry": extracted_data.get("date_of_expiry"),
        "gender": extracted_data.get("gender"),
    }

    issues: list[str] = []
    checks: dict[str, bool | None] = {}

    # --- ICAO check digits, if we still have the raw second line ----------
    if mrz_lines and len(mrz_lines) == 2 and len(mrz_lines[1]) >= 28:
        line2 = mrz_lines[1]
        checks = {
            "passport_number": verify_check_digit(line2[0:9], line2[9]),
            "date_of_birth": verify_check_digit(line2[13:19], line2[19]),
            "date_of_expiry": verify_check_digit(line2[21:27], line2[27]),
        }
        for label, passed in checks.items():
            if passed is False:
                issues.append(
                    f"MRZ check digit failed for {label.replace('_', ' ')} — "
                    f"likely an OCR misread or an altered document."
                )

    # --- Structural sanity ------------------------------------------------
    if not fields["passport_number"]:
        issues.append("No passport number could be read from the MRZ.")
    elif not 6 <= len(fields["passport_number"]) <= 9:
        issues.append(
            f"Passport number '{fields['passport_number']}' has an unusual length."
        )

    if not fields["name"]:
        issues.append("No name could be read from the MRZ.")

    if fields["nationality"] and not re.fullmatch(r"[A-Z]{3}", fields["nationality"]):
        issues.append(f"Nationality '{fields['nationality']}' is not a valid 3-letter code.")

    if not fields["date_of_birth"]:
        issues.append("Date of birth could not be parsed.")

    if not fields["date_of_expiry"]:
        issues.append("Expiry date could not be parsed.")
    elif is_expired(fields["date_of_expiry"]):
        issues.append(f"Passport expired on {fields['date_of_expiry']}.")

    # --- Confidence -------------------------------------------------------
    # Two components: how many fields we got, and how many check digits
    # passed. A document where every field parsed but the check digits fail
    # should NOT read as high confidence — that combination is exactly what a
    # tampered MRZ looks like.
    expected = ["passport_number", "name", "nationality", "date_of_birth",
                "date_of_expiry", "gender"]
    present = sum(1 for key in expected if fields.get(key))
    completeness = present / len(expected)

    verified = [value for value in checks.values() if value is not None]
    integrity = (sum(1 for v in verified if v) / len(verified)) if verified else 0.6

    confidence = round(completeness * 0.6 + integrity * 0.4, 4)

    return {
        "document_type": "PASSPORT",
        "fields": fields,
        "checks": checks,
        "confidence": confidence,
        "issues": issues,
        "raw": dict(extracted_data),
    }

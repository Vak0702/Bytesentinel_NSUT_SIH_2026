"""
Compare what the OCR read off the document against what the database holds.

This is the heart of the verification: an MRZ that parses perfectly still tells
you nothing until you check it against the authoritative record. A forged
passport can carry a flawless, self-consistent MRZ — every check digit valid —
because the forger computed them correctly. What it cannot do is match a record
it was never issued against.

Output is a per-field comparison, so the console can show the officer exactly
which fields agree and which do not, rather than a single opaque verdict.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date

from models import Passport

# How much each field contributes to the overall match score. Passport number
# is the join key rather than a scored field, so it is not in here.
FIELD_WEIGHTS = {
    "name": 30,
    "date_of_birth": 30,
    "nationality": 20,
    "date_of_expiry": 15,
    "gender": 5,
}


def _normalise_name(value: str | None) -> str:
    """
    Reduce a name to something comparable.

    MRZ is ASCII-only and uppercase, so 'MÜLLER' is transliterated to 'MUELLER'
    or 'MULLER' depending on the issuing state, while the database may hold the
    accented form. Stripping diacritics and punctuation before comparing avoids
    flagging honest travellers over an encoding difference.
    """
    if not value:
        return ""
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^A-Z ]", " ", ascii_only.upper()).split())


def _name_similarity(extracted: str | None, stored: str | None) -> float:
    """
    Token-based comparison, returning 0.0-1.0.

    Word-set overlap rather than character distance, because the common real
    difference is word *order* and *presence* — 'Kumari Meera' vs 'Meera
    Kumari', or a stored middle name the MRZ truncated — not misspelling. A
    character-level metric would penalise reordering heavily and miss the point.
    """
    left = set(_normalise_name(extracted).split())
    right = set(_normalise_name(stored).split())

    if not left or not right:
        return 0.0
    if left == right:
        return 1.0

    overlap = len(left & right)
    # Divide by the smaller set: a stored 'Meera Devi Kumari' against an MRZ
    # 'Meera Kumari' should score well, since MRZ truncates long names by design.
    return overlap / min(len(left), len(right))


def _date_equal(extracted: str | None, stored) -> bool | None:
    if not extracted or stored is None:
        return None
    try:
        return date.fromisoformat(extracted) == stored
    except (ValueError, TypeError):
        return None


def _gender_equal(extracted: str | None, stored: str | None) -> bool | None:
    if not extracted or not stored:
        return None
    initials = {"M": "M", "F": "F", "X": "X",
                "MALE": "M", "FEMALE": "F", "OTHER": "X"}
    return initials.get(extracted.upper()) == initials.get(stored.upper(), stored.upper()[:1])


def compare_with_record(extracted: dict, record: Passport) -> dict:
    """
    Field-by-field comparison of extracted MRZ data against a stored passport.

    `extracted` is the `fields` dict from build_passport_result().
    """
    comparisons = []
    score = 0.0
    available_weight = 0

    # --- name ------------------------------------------------------------
    similarity = _name_similarity(extracted.get("name"), record.name)
    name_status = "MATCH" if similarity >= 0.99 else "PARTIAL" if similarity >= 0.5 else "MISMATCH"
    comparisons.append({
        "field": "Name",
        "extracted": extracted.get("name"),
        "onRecord": record.name,
        "status": name_status,
        "similarity": round(similarity, 3),
    })
    available_weight += FIELD_WEIGHTS["name"]
    score += FIELD_WEIGHTS["name"] * similarity

    # --- date of birth ----------------------------------------------------
    dob_equal = _date_equal(extracted.get("date_of_birth"), record.date_of_birth)
    comparisons.append({
        "field": "Date of birth",
        "extracted": extracted.get("date_of_birth"),
        "onRecord": record.date_of_birth.isoformat() if record.date_of_birth else None,
        "status": "MATCH" if dob_equal else "NOT_CHECKED" if dob_equal is None else "MISMATCH",
    })
    if dob_equal is not None:
        available_weight += FIELD_WEIGHTS["date_of_birth"]
        score += FIELD_WEIGHTS["date_of_birth"] * (1 if dob_equal else 0)

    # --- nationality ------------------------------------------------------
    extracted_nat = (extracted.get("nationality") or "").upper() or None
    stored_nat = (record.nationality or "").upper() or None
    nat_equal = (extracted_nat == stored_nat) if extracted_nat and stored_nat else None
    comparisons.append({
        "field": "Nationality",
        "extracted": extracted_nat,
        "onRecord": record.nationality,
        "status": "MATCH" if nat_equal else "NOT_CHECKED" if nat_equal is None else "MISMATCH",
    })
    if nat_equal is not None:
        available_weight += FIELD_WEIGHTS["nationality"]
        score += FIELD_WEIGHTS["nationality"] * (1 if nat_equal else 0)

    # --- expiry -----------------------------------------------------------
    expiry_equal = _date_equal(extracted.get("date_of_expiry"), record.date_of_expiry)
    comparisons.append({
        "field": "Date of expiry",
        "extracted": extracted.get("date_of_expiry"),
        "onRecord": record.date_of_expiry.isoformat() if record.date_of_expiry else None,
        "status": "MATCH" if expiry_equal else "NOT_CHECKED" if expiry_equal is None else "MISMATCH",
    })
    if expiry_equal is not None:
        available_weight += FIELD_WEIGHTS["date_of_expiry"]
        score += FIELD_WEIGHTS["date_of_expiry"] * (1 if expiry_equal else 0)

    # --- gender -----------------------------------------------------------
    gender_equal = _gender_equal(extracted.get("gender"), record.gender)
    comparisons.append({
        "field": "Gender",
        "extracted": extracted.get("gender"),
        "onRecord": record.gender,
        "status": "MATCH" if gender_equal else "NOT_CHECKED" if gender_equal is None else "MISMATCH",
    })
    if gender_equal is not None:
        available_weight += FIELD_WEIGHTS["gender"]
        score += FIELD_WEIGHTS["gender"] * (1 if gender_equal else 0)

    # Score as a percentage of the weight we could actually evaluate, so a
    # record missing a gender column does not drag an otherwise perfect match
    # down. Unknowable is not the same as wrong.
    match_score = round((score / available_weight * 100) if available_weight else 0, 1)

    mismatches = [c for c in comparisons if c["status"] == "MISMATCH"]

    return {
        "comparisons": comparisons,
        "matchScore": match_score,
        "mismatchCount": len(mismatches),
        "mismatchedFields": [c["field"] for c in mismatches],
    }


def verify_against_database(extracted: dict) -> dict:
    """
    Look the passport up and grade the result.

    Returns a dict shaped for both the console and the `validation_results`
    table, with a `databaseStatus` of MATCH / MISMATCH / NOT_AVAILABLE and a
    `validationStatus` of VALID / INVALID / REVIEW.
    """
    passport_number = extracted.get("passport_number")

    if not passport_number:
        return {
            "databaseStatus": "NOT_AVAILABLE",
            "validationStatus": "REVIEW",
            "message": "No passport number was readable, so no record could be looked up.",
            "record": None,
            "comparisons": [],
            "matchScore": 0,
        }

    record = Passport.query.filter_by(passport_number=passport_number).first()

    if record is None:
        # Worth being precise about what this means. It is not proof of
        # forgery — the reference database only holds what has been loaded
        # into it. It means a human has to decide.
        return {
            "databaseStatus": "NOT_AVAILABLE",
            "validationStatus": "REVIEW",
            "message": (
                f"Passport {passport_number} is not in the reference database. "
                f"This needs manual verification — it is not by itself evidence "
                f"of a forgery."
            ),
            "record": None,
            "comparisons": [],
            "matchScore": 0,
        }

    comparison = compare_with_record(extracted, record)
    problems: list[str] = []

    if record.document_status == "BLACKLISTED":
        problems.append("This passport is BLACKLISTED.")
    if record.date_of_expiry and record.date_of_expiry < date.today():
        problems.append(f"The record shows this passport expired on {record.date_of_expiry}.")
    for field in comparison["mismatchedFields"]:
        problems.append(f"{field} does not match the record.")

    if record.document_status == "BLACKLISTED" or comparison["mismatchCount"] > 0:
        validation_status = "INVALID"
        database_status = "MISMATCH"
    elif comparison["matchScore"] >= 90:
        validation_status = "VALID"
        database_status = "MATCH"
    else:
        validation_status = "REVIEW"
        database_status = "REVIEW"

    return {
        "databaseStatus": database_status,
        "validationStatus": validation_status,
        "message": " ".join(problems) or "All readable fields match the reference record.",
        "record": record.to_dict(),
        **comparison,
    }

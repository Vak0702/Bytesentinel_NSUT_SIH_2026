"""
Demo data loader.

Two jobs:

1. Make every officer in `officers` sign-in-able. The SQL dump you were given
   contains bcrypt hashes but not the plaintext behind them, and bcrypt is
   one-way by design — nobody can recover those passwords, not even you. So
   this script overwrites each hash with one it generates from a password you
   choose (default `Veridex@2026`).

2. Load the reference documents (passports, visas, national IDs, licences,
   permits) so validation has something to check against on a fresh SQLite
   database. If you imported the .sql dump into MySQL you already have these;
   the script skips anything already present, so running it twice is safe.

Run:  flask --app app seed
      flask --app app seed --password "SomethingElse"
"""

from datetime import date

from extensions import db
from models import (
    DrivingLicense,
    NationalId,
    Officer,
    Passport,
    Permit,
    Visa,
)


def _d(value):
    return date.fromisoformat(value) if value else None


OFFICERS = [
    {"name": "Rajesh Kumar", "email": "rajesh.kumar@gov.in", "badge_number": "DL001", "department": "Legal Affairs", "role": "Senior Officer", "status": "ACTIVE"},
    {"name": "Anita Sharma", "email": "anita.sharma@gov.in", "badge_number": "DL002", "department": "Legal Affairs", "role": "Officer", "status": "ACTIVE"},
    {"name": "Vikram Singh", "email": "vikram.singh@gov.in", "badge_number": "DL003", "department": "Document Verification", "role": "Senior Officer", "status": "ACTIVE"},
    {"name": "Neha Verma", "email": "neha.verma@gov.in", "badge_number": "DL004", "department": "Document Verification", "role": "Officer", "status": "ACTIVE"},
    {"name": "Amit Patel", "email": "amit.patel@gov.in", "badge_number": "DL005", "department": "Immigration", "role": "Officer", "status": "ACTIVE"},
    {"name": "Priya Nair", "email": "priya.nair@gov.in", "badge_number": "DL006", "department": "Immigration", "role": "Senior Officer", "status": "ACTIVE"},
    {"name": "Sanjay Mehta", "email": "sanjay.mehta@gov.in", "badge_number": "DL007", "department": "Legal Affairs", "role": "Officer", "status": "ACTIVE"},
    {"name": "Pooja Yadav", "email": "pooja.yadav@gov.in", "badge_number": "DL008", "department": "Document Verification", "role": "Officer", "status": "ACTIVE"},
    {"name": "Arun Das", "email": "arun.das@gov.in", "badge_number": "DL009", "department": "Immigration", "role": "Officer", "status": "ACTIVE"},
    {"name": "Kavita Joshi", "email": "kavita.joshi@gov.in", "badge_number": "DL010", "department": "Legal Affairs", "role": "Senior Officer", "status": "ACTIVE"},
]

PASSPORTS = [
    {"passport_number": "A1234567", "name": "Sanjay Mudgal", "nationality": "IND", "date_of_birth": "2001-04-15", "date_of_expiry": "2031-04-14", "gender": "M", "document_status": "ACTIVE"},
    {"passport_number": "AB123456", "name": "Sunil Sharma", "nationality": "IND", "date_of_birth": "1999-08-20", "date_of_expiry": "2029-08-19", "gender": "M", "document_status": "ACTIVE"},
    {"passport_number": "K8392041", "name": "Meera Kumari", "nationality": "IND", "date_of_birth": "2000-02-11", "date_of_expiry": "2030-02-10", "gender": "F", "document_status": "BLACKLISTED"},
    {"passport_number": "KP839204", "name": "Anand Veer", "nationality": "IND", "date_of_birth": "1998-11-25", "date_of_expiry": "2032-11-24", "gender": "M", "document_status": "ACTIVE"},
    {"passport_number": "M5729183", "name": "Sneha Gupta", "nationality": "IND", "date_of_birth": "2002-06-10", "date_of_expiry": "2032-06-09", "gender": "F", "document_status": "ACTIVE"},
    {"passport_number": "MR572918", "name": "Arjun Patel", "nationality": "IND", "date_of_birth": "1997-03-18", "date_of_expiry": "2027-03-17", "gender": "M", "document_status": "ACTIVE"},
    {"passport_number": "R1047265", "name": "Ananya Rao", "nationality": "IND", "date_of_birth": "2001-12-05", "date_of_expiry": "2026-12-04", "gender": "F", "document_status": "ACTIVE"},
    {"passport_number": "RT104726", "name": "Rakesh", "nationality": "IND", "date_of_birth": "2003-01-22", "date_of_expiry": "2033-01-21", "gender": "M", "document_status": "ACTIVE"},
    {"passport_number": "H9146253", "name": "Meera Joshi", "nationality": "IND", "date_of_birth": "1996-09-14", "date_of_expiry": "2025-09-13", "gender": "F", "document_status": "EXPIRED"},
    {"passport_number": "XY357208", "name": "Vikram Singh", "nationality": "IND", "date_of_birth": "2000-07-30", "date_of_expiry": "2030-07-29", "gender": "M", "document_status": "ACTIVE"},
    {"passport_number": "AG022535", "name": "Virat Kataria", "nationality": "IND", "date_of_birth": "2007-02-07", "date_of_expiry": "2035-08-24", "gender": "F", "document_status": "ACTIVE"},
]

VISAS = [
    {"visa_number": "IN7K4P92X", "passport_number": "A1234567", "visa_type": "TOURIST", "entries": "M", "stay_duration": 90, "document_status": "ACTIVE"},
    {"visa_number": "IN3R8T51M", "passport_number": "K8392041", "visa_type": "TOURIST", "entries": "S", "stay_duration": 30, "document_status": "BLACKLISTED"},
    {"visa_number": "IN9Q2L67B", "passport_number": "KP839204", "visa_type": "WORK", "entries": "M", "stay_duration": 365, "document_status": "ACTIVE"},
    {"visa_number": "IN5W8C34N", "passport_number": "M5729183", "visa_type": "STUDENT", "entries": "M", "stay_duration": 365, "document_status": "ACTIVE"},
    {"visa_number": "IN2H6V91Q", "passport_number": "MR572918", "visa_type": "BUSINESS", "entries": "S", "stay_duration": 60, "document_status": "ACTIVE"},
    {"visa_number": "IN8D3F75K", "passport_number": "H9146253", "visa_type": "WORK", "entries": "M", "stay_duration": 365, "document_status": "EXPIRED"},
]

NATIONAL_IDS = [
    {"id_number": "458721936104", "name": "Sanjay Mudgal", "nationality": "IND", "date_of_birth": "2001-04-15", "gender": "M"},
    {"id_number": "713604825193", "name": "Meera Kumari", "nationality": "IND", "date_of_birth": "2000-02-11", "gender": "F"},
    {"id_number": "286491753820", "name": "Anand Veer", "nationality": "IND", "date_of_birth": "1998-11-25", "gender": "M"},
    {"id_number": "934167208541", "name": "Kavita Joshi", "nationality": "IND", "date_of_birth": "1997-06-18", "gender": "F"},
    {"id_number": "521803964217", "name": "Manish Tiwari", "nationality": "IND", "date_of_birth": "1995-10-09", "gender": "M"},
    {"id_number": "867295143608", "name": "Ritu Sharma", "nationality": "IND", "date_of_birth": "2002-01-27", "gender": "F"},
    {"id_number": "342718605924", "name": "Vivek Chauhan", "nationality": "IND", "date_of_birth": "1999-12-14", "gender": "M"},
    {"id_number": "695431827052", "name": "Nisha Kapoor", "nationality": "IND", "date_of_birth": "2001-09-03", "gender": "F"},
    {"id_number": "174826395701", "name": "Rajeev Malhotra", "nationality": "IND", "date_of_birth": "1994-05-22", "gender": "M"},
    {"id_number": "803517264918", "name": "Shalini Verma", "nationality": "IND", "date_of_birth": "1998-08-11", "gender": "F"},
]

DRIVING_LICENSES = [
    {"license_number": "DL0420180012345", "name": "Sanjay Mudgal", "date_of_birth": "2001-04-15", "date_of_issue": "2021-06-10", "date_of_expiry": "2041-06-09", "license_type": "LMV"},
    {"license_number": "UP1420190078562", "name": "Rakesh Yadav", "date_of_birth": "1995-11-08", "date_of_issue": "2020-03-15", "date_of_expiry": "2040-03-14", "license_type": "MCWG"},
    {"license_number": "MH0520170034218", "name": "Anand Veer", "date_of_birth": "1998-11-25", "date_of_issue": "2019-09-22", "date_of_expiry": "2039-09-21", "license_type": "LMV"},
    {"license_number": "HR0820200067194", "name": "Pooja Verma", "date_of_birth": "1999-05-19", "date_of_issue": "2021-01-18", "date_of_expiry": "2041-01-17", "license_type": "MCWG"},
    {"license_number": "RJ0320180098451", "name": "Nitin Gupta", "date_of_birth": "2001-01-30", "date_of_issue": "2022-04-05", "date_of_expiry": "2042-04-04", "license_type": "LMV"},
    {"license_number": "KA0720160043279", "name": "Aisha Khan", "date_of_birth": "1997-07-16", "date_of_issue": "2018-11-12", "date_of_expiry": "2038-11-11", "license_type": "MCWG"},
    {"license_number": "GJ1020210085637", "name": "Deepak Patel", "date_of_birth": "1996-12-04", "date_of_issue": "2022-08-20", "date_of_expiry": "2042-08-19", "license_type": "LMV"},
    {"license_number": "TN0120190027486", "name": "Divya Nair", "date_of_birth": "2002-02-21", "date_of_issue": "2023-02-14", "date_of_expiry": "2043-02-13", "license_type": "MCWOG"},
    {"license_number": "MP0620150053912", "name": "Suresh Kumar", "date_of_birth": "1994-09-27", "date_of_issue": "2016-07-08", "date_of_expiry": "2036-07-07", "license_type": "LMV"},
    {"license_number": "PB0920200076143", "name": "Harpreet Singh", "date_of_birth": "1998-10-13", "date_of_issue": "2021-10-25", "date_of_expiry": "2041-10-24", "license_type": "HMV"},
]

PERMITS = [
    {"permit_number": "PRM-DL-582941", "name": "Sanjay Mudgal", "permit_type": "ENTRY", "date_of_issue": "2025-04-10", "date_of_expiry": "2026-04-10", "issuing_authority": "Delhi Border Authority"},
    {"permit_number": "PRM-UP-731628", "name": "Anand Veer", "permit_type": "TRAVEL", "date_of_issue": "2025-07-15", "date_of_expiry": "2026-07-15", "issuing_authority": "Uttar Pradesh Authority"},
    {"permit_number": "PRM-MH-496215", "name": "Kavita Joshi", "permit_type": "WORK", "date_of_issue": "2026-01-20", "date_of_expiry": "2027-01-20", "issuing_authority": "Maharashtra Authority"},
    {"permit_number": "PRM-RJ-824573", "name": "Vivek Chauhan", "permit_type": "ENTRY", "date_of_issue": "2025-09-05", "date_of_expiry": "2026-09-05", "issuing_authority": "Rajasthan Authority"},
    {"permit_number": "PRM-HR-317649", "name": "Manish Tiwari", "permit_type": "TRAVEL", "date_of_issue": "2025-11-12", "date_of_expiry": "2026-11-12", "issuing_authority": "Haryana Authority"},
    {"permit_number": "PRM-KA-685214", "name": "Ritu Sharma", "permit_type": "WORK", "date_of_issue": "2026-02-18", "date_of_expiry": "2027-02-18", "issuing_authority": "Karnataka Authority"},
    {"permit_number": "PRM-GJ-953172", "name": "Nisha Kapoor", "permit_type": "ENTRY", "date_of_issue": "2025-05-22", "date_of_expiry": "2026-05-22", "issuing_authority": "Gujarat Authority"},
    {"permit_number": "PRM-TN-428761", "name": "Rajeev Malhotra", "permit_type": "TRAVEL", "date_of_issue": "2025-08-30", "date_of_expiry": "2026-08-30", "issuing_authority": "Tamil Nadu Authority"},
]

def seed_all(password: str) -> list[str]:
    """Idempotent: inserts what is missing, updates passwords, never deletes."""
    log = []

    # --- officers ---------------------------------------------------------
    created = 0
    for row in OFFICERS:
        officer = Officer.query.filter_by(badge_number=row["badge_number"]).first()
        if officer is None:
            officer = Officer(**row)
            db.session.add(officer)
            created += 1
        officer.set_password(password)
    db.session.flush()
    log.append(f"officers: {created} created, {len(OFFICERS)} passphrases set")

    # --- reference documents ---------------------------------------------
    def upsert(model, key_field, rows, date_fields=()):
        added = 0
        for row in rows:
            payload = dict(row)
            for field in date_fields:
                payload[field] = _d(payload.get(field))
            existing = model.query.filter_by(**{key_field: payload[key_field]}).first()
            if existing is None:
                db.session.add(model(**payload))
                added += 1
        return added

    counts = {
        "passports": upsert(Passport, "passport_number", PASSPORTS,
                            ("date_of_birth", "date_of_expiry")),
        "national_ids": upsert(NationalId, "id_number", NATIONAL_IDS, ("date_of_birth",)),
        "driving_licenses": upsert(DrivingLicense, "license_number", DRIVING_LICENSES,
                                   ("date_of_birth", "date_of_issue", "date_of_expiry")),
        "permits": upsert(Permit, "permit_number", PERMITS,
                          ("date_of_issue", "date_of_expiry")),
    }
    # Visas last: they carry a foreign key to passports.passport_number, so
    # the passport rows have to exist first.
    db.session.flush()
    counts["visas"] = upsert(Visa, "visa_number", VISAS)

    db.session.commit()

    for table, added in counts.items():
        log.append(f"{table}: {added} inserted")
    log.append("")
    log.append(f"Sign in with badge number DL001 - DL010, passphrase: {password}")
    log.append("Or with the email, e.g. rajesh.kumar@gov.in")
    return log


# ---------------------------------------------------------------------------
# Optional: a handful of live cases so the console has something to render.
# `cases`, `documents` and `document_extractions` are empty in the dump, which
# means every page shows an empty state until real screenings start flowing.
# ---------------------------------------------------------------------------

DEMO_CASES = [
    # (case_number, subject, nationality, status, doc_type, extracted fields)
    ("BS-2026-0001", "Meera Kumari", "IND", "OPEN", "PASSPORT",
     {"passport_number": "K8392041", "name": "Meera Kumari", "date_of_birth": "2000-02-11"}),
    ("BS-2026-0002", "Sanjay Mudgal", "IND", "CLEARED", "PASSPORT",
     {"passport_number": "A1234567", "name": "Sanjay Mudgal", "date_of_birth": "2001-04-15"}),
    ("BS-2026-0003", "Meera Joshi", "IND", "UNDER_REVIEW", "PASSPORT",
     {"passport_number": "H9146253", "name": "Meera Joshi", "date_of_birth": "1996-09-14"}),
    ("BS-2026-0004", "Anand Veer", "IND", "OPEN", "PASSPORT",
     {"passport_number": "KP839204", "name": "Anand Veer", "date_of_birth": "1998-11-25"}),
]


def seed_cases() -> list[str]:
    """
    Create demo cases wired to real reference records, so screening them
    produces genuinely different outcomes:

      BS-2026-0001  blacklisted passport  -> INVALID
      BS-2026-0002  clean passport        -> VALID
      BS-2026-0003  expired passport      -> INVALID
      BS-2026-0004  clean, work visa      -> VALID

    Run:  flask --app app seed-cases
    """
    from models import Case, Document, DocumentExtraction, Officer

    officers = Officer.query.order_by(Officer.officer_id).all()
    if not officers:
        return ["No officers found — run `flask --app app seed` first."]

    log = []
    for index, (number, subject, nationality, status, doc_type, fields) in enumerate(DEMO_CASES):
        if Case.query.filter_by(case_number=number).first():
            log.append(f"{number}: already exists, skipped")
            continue

        case = Case(
            officer_id=officers[index % len(officers)].officer_id,
            case_number=number,
            subject_name=subject,
            nationality=nationality,
            status=status,
        )
        db.session.add(case)
        db.session.flush()

        document = Document(
            case_id=case.case_id,
            document_type=doc_type,
            file_name=f"{number.lower()}-{doc_type.lower()}.jpg",
            file_path=f"uploads/{number}/{doc_type.lower()}.jpg",
            mime_type="image/jpeg",
            upload_status="PROCESSED",
        )
        db.session.add(document)
        db.session.flush()

        db.session.add(DocumentExtraction(
            document_id=document.document_id,
            extracted_data=fields,
            ocr_confidence=0.96,
            extraction_status="COMPLETED",
        ))
        log.append(f"{number}: created ({subject}, {status})")

    db.session.commit()
    log.append("")
    log.append("Open New Screening and run BS-2026-0001 — it should come back INVALID (blacklisted).")
    return log

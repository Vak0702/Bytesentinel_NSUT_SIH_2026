"""
/api/screening/* — the verification pipeline.

Right now each stage is a stub with an honest `implemented: False` flag, so
the console renders real API responses instead of hardcoded mock data while
your teammates build the actual OCR, tampering and face modules. Replace one
function body at a time; the routes, the response shape and the React code
never move.
"""

from datetime import date

from flask import Blueprint, request

from extensions import db
from models import Case, Document, Passport, Visa
from utils.audit import record
from utils.auth_guard import current_officer, login_required
from utils.responses import fail, ok

bp = Blueprint("screening", __name__, url_prefix="/api/screening")

PIPELINE_STAGES = [
    {"key": "extraction", "label": "Reading document"},
    {"key": "validation", "label": "Checking rules"},
    {"key": "tampering", "label": "Scanning for tampering"},
    {"key": "face", "label": "Comparing face"},
    {"key": "risk", "label": "Calculating risk"},
]


# --------------------------------------------------------------------------
# Stage 1 — validation. This one is real: it is pure database work, no ML.
# --------------------------------------------------------------------------
def validate_passport(passport_number: str, claimed_name: str | None = None) -> dict:
    """
    Check a passport number against the authoritative `passports` table.

    Returns the same shape the `validation_results` table stores, so wiring
    this to persistence later is a two-line change.
    """
    record_row = Passport.query.filter_by(passport_number=passport_number).first()

    if record_row is None:
        return {
            "formatStatus": "PASS",
            "databaseStatus": "NOT_AVAILABLE",
            "validationStatus": "REVIEW",
            "message": "Passport number is not present in the reference database.",
        }

    problems = []
    if record_row.document_status == "BLACKLISTED":
        problems.append("Passport is blacklisted.")
    if record_row.document_status == "EXPIRED" or record_row.date_of_expiry < date.today():
        problems.append(f"Passport expired on {record_row.date_of_expiry}.")
    if claimed_name and claimed_name.strip().lower() != record_row.name.strip().lower():
        problems.append(
            f"Name on document does not match the record ('{record_row.name}')."
        )

    return {
        "formatStatus": "PASS",
        "databaseStatus": "MATCH" if not problems else "MISMATCH",
        "validationStatus": "VALID" if not problems else "INVALID",
        "message": " ".join(problems) or "Passport matches the reference record.",
        "record": record_row.to_dict(),
    }


def validate_visa(visa_number: str, passport_number: str | None = None) -> dict:
    row = Visa.query.filter_by(visa_number=visa_number).first()
    if row is None:
        return {"validationStatus": "REVIEW", "message": "Visa not found in reference database."}

    problems = []
    if row.document_status != "ACTIVE":
        problems.append(f"Visa status is {row.document_status}.")
    if passport_number and row.passport_number != passport_number:
        problems.append("Visa is not linked to this passport.")

    return {
        "validationStatus": "VALID" if not problems else "INVALID",
        "message": " ".join(problems) or "Visa is active and correctly linked.",
        "record": row.to_dict(),
    }


# --------------------------------------------------------------------------
# Stages 2-4 — not yet built. Owned by whoever takes those modules.
# --------------------------------------------------------------------------
def run_extraction(document: Document) -> dict:
    """TODO: OCR. Write the output to `document_extractions.extracted_data`."""
    return {"implemented": False, "stage": "extraction",
            "note": "Wire your OCR module here and persist a DocumentExtraction row."}


def run_tampering(document: Document) -> dict:
    """TODO: photo / text / stamp / metadata forensics -> `tampering_results`."""
    return {"implemented": False, "stage": "tampering",
            "note": "Return per-channel PASS/SUSPICIOUS/FAIL and an overall score."}


def run_face_match(document: Document) -> dict:
    """TODO: compare the document photo to the live capture -> `face_verification`."""
    return {"implemented": False, "stage": "face",
            "note": "Return MATCH/NO_MATCH/REVIEW and a similarity score in [0,1]."}


def calculate_risk(validation: dict, tampering: dict, face: dict) -> dict:
    """
    Combine stage outputs into a 0-100 risk score.

    Weights live in one place on purpose. When the team argues about how much
    a face mismatch should count, they edit this dict and nothing else.
    """
    weights = {"validation": 45, "tampering": 35, "face": 20}
    score = 0.0

    if validation.get("validationStatus") == "INVALID":
        score += weights["validation"]
    elif validation.get("validationStatus") == "REVIEW":
        score += weights["validation"] * 0.5

    if tampering.get("overall", {}).get("status") == "FAIL":
        score += weights["tampering"]
    elif tampering.get("overall", {}).get("status") == "SUSPICIOUS":
        score += weights["tampering"] * 0.5

    if face.get("status") == "NO_MATCH":
        score += weights["face"]
    elif face.get("status") == "REVIEW":
        score += weights["face"] * 0.5

    score = round(min(score, 100.0), 2)
    if score >= 71:
        decision, label = "HIGH_RISK", "High risk"
    elif score >= 41:
        decision, label = "REVIEW", "Medium risk"
    else:
        decision, label = "CLEAR", "Low risk"

    return {"risk": score, "riskLabel": label, "decision": decision,
            "recommendation": {"CLEAR": "Clear traveller",
                               "REVIEW": "Manual review",
                               "HIGH_RISK": "Flag for investigation"}[decision]}


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@bp.get("/stages")
@login_required
def stages():
    """Lets the console render the progress list from the server's definition."""
    return ok(PIPELINE_STAGES)


@bp.post("/run")
@login_required
def run():
    """
    Run the pipeline for one case and return the console's expected shape:
    {risk, riskLabel, recommendation, stages: {...}}.
    """
    payload = request.get_json(silent=True) or {}
    case_number = payload.get("caseId")
    case = Case.query.filter_by(case_number=case_number).first()
    if case is None:
        return fail(f"No case {case_number}.", code="not_found", status=404)

    document = next(iter(case.documents), None)

    validation = (
        validate_passport(case.primary_passport_number() or "", case.subject_name)
        if case.primary_passport_number()
        else {"validationStatus": "REVIEW", "message": "No passport on file for this case."}
    )
    tampering = run_tampering(document) if document else {"implemented": False}
    face = run_face_match(document) if document else {"implemented": False}

    result = calculate_risk(validation, tampering, face)
    result["stages"] = {"validation": validation, "tampering": tampering, "face": face}

    officer = current_officer()
    record("SCREENING_RUN", f"Screening run on {case.case_number} by {officer.name}.",
           officer_id=officer.officer_id, case_id=case.case_id, commit=False)
    db.session.commit()

    return ok(result)


@bp.get("/verify/passport/<passport_number>")
@login_required
def verify_passport(passport_number: str):
    """Standalone lookup — handy for the header search box."""
    return ok(validate_passport(passport_number))


@bp.get("/verify/visa/<visa_number>")
@login_required
def verify_visa(visa_number: str):
    return ok(validate_visa(visa_number, request.args.get("passport")))

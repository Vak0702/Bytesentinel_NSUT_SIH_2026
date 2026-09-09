"""/api/cases/* — the case list, one case, and officer decisions."""

from flask import Blueprint, request

from extensions import db
from models import Case
from models.case import STATUS_TO_UI
from utils.audit import record
from utils.auth_guard import current_officer, login_required
from utils.responses import fail, ok

bp = Blueprint("cases", __name__, url_prefix="/api/cases")

# The console speaks sentence case; the database speaks enums.
UI_TO_STATUS = {
    "Cleared": "CLEARED",
    "Clear traveller": "CLEARED",
    "Flagged": "FLAGGED",
    "Flag for investigation": "FLAGGED",
    "Rejected": "REJECTED",
    "Reject entry": "REJECTED",
    "Under investigation": "UNDER_REVIEW",
}


@bp.get("")
@login_required
def list_cases():
    """
    Supports ?status=, ?nationality=, ?officer= and ?limit= so the console's
    filter bar can push filtering down to SQL instead of fetching everything
    and filtering in the browser.
    """
    query = Case.query

    status = request.args.get("status")
    if status:
        query = query.filter(Case.status == UI_TO_STATUS.get(status, status.upper()))

    nationality = request.args.get("nationality")
    if nationality and nationality != "any":
        query = query.filter(Case.nationality == nationality)

    officer_badge = request.args.get("officer")
    if officer_badge and officer_badge != "any":
        from models import Officer
        query = query.join(Officer).filter(Officer.badge_number == officer_badge)

    limit = min(int(request.args.get("limit", 200)), 500)
    rows = query.order_by(Case.updated_at.desc()).limit(limit).all()
    return ok([c.to_dict() for c in rows])


@bp.get("/queue")
@login_required
def queue():
    """Travellers waiting at the counter — cases still OPEN."""
    rows = Case.query.filter_by(status="OPEN").order_by(Case.created_at).limit(20).all()
    return ok([
        {
            "name": c.subject_name,
            "nationality": c.nationality,
            "caseId": c.case_number,
            "waiting": "in queue",
        }
        for c in rows
    ])


@bp.get("/flagged")
@login_required
def flagged():
    rows = Case.query.filter(Case.status.in_(["FLAGGED", "UNDER_REVIEW"])).all()
    return ok([c.to_dict() for c in rows])


@bp.get("/investigations")
@login_required
def investigations():
    rows = Case.query.filter_by(status="UNDER_REVIEW").order_by(Case.updated_at.desc()).all()
    return ok([
        {
            "caseId": c.case_number,
            "traveller": c.subject_name,
            "status": STATUS_TO_UI.get(c.status, c.status),
            "officer": c.officer.name if c.officer else None,
            "opened": c.created_at.strftime("%d %b %Y") if c.created_at else None,
        }
        for c in rows
    ])


@bp.get("/<case_number>")
@login_required
def get_case(case_number: str):
    case = Case.query.filter_by(case_number=case_number).first()
    if case is None:
        return fail(f"No case {case_number}.", code="not_found", status=404)

    payload = case.to_dict()
    payload["documents"] = [d.to_dict() for d in case.documents]
    payload["checks"] = {
        "validation": [r.to_dict() for d in case.documents for r in d.validation_results],
        "tampering": [r.to_dict() for d in case.documents for r in d.tampering_results],
        "face": [r.to_dict() for d in case.documents for r in d.face_verifications],
        "screening": [r.to_dict() for d in case.documents for r in d.screening_results],
    }
    return ok(payload)


@bp.post("/<case_number>/decision")
@login_required
def submit_decision(case_number: str):
    """
    Record an officer's final call on a case.

    Note the audit row and the status change are committed together: either
    both land or neither does. A decision with no trail is worse than no
    decision at all.
    """
    case = Case.query.filter_by(case_number=case_number).first()
    if case is None:
        return fail(f"No case {case_number}.", code="not_found", status=404)

    payload = request.get_json(silent=True) or {}
    raw = (payload.get("decision") or "").strip()
    status = UI_TO_STATUS.get(raw)
    if status is None:
        return fail(f"Unknown decision '{raw}'.", code="bad_decision", status=400)

    officer = current_officer()
    case.status = status
    case.officer_id = officer.officer_id

    record(
        f"DECISION_{status}",
        f"{raw} by {officer.name}, badge {officer.badge_number}.",
        officer_id=officer.officer_id,
        case_id=case.case_id,
        commit=False,
    )
    db.session.commit()

    return ok({
        "caseId": case.case_number,
        "decision": raw,
        "recordedAt": case.updated_at.isoformat() if case.updated_at else None,
        "recordedBy": officer.name,
    })

"""/api/activity — the audit trail, rendered as the Officer Activity feed."""

from flask import Blueprint, request

from models import AuditLog
from utils.auth_guard import login_required
from utils.responses import ok

bp = Blueprint("activity", __name__, url_prefix="/api/activity")


@bp.get("")
@login_required
def activity():
    limit = min(int(request.args.get("limit", 100)), 500)
    rows = AuditLog.query.order_by(AuditLog.log_id.desc()).limit(limit).all()
    return ok([entry.to_dict() for entry in rows])

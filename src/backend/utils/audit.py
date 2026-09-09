"""Helper for writing to `audit_logs` without repeating boilerplate."""

from flask import request

from extensions import db
from models import AuditLog


def record(action_type: str, detail: str = "", officer_id: int | None = None,
           case_id: int | None = None, document_id: int | None = None,
           commit: bool = True) -> AuditLog:
    """
    Append one row to the audit trail.

    `commit=False` lets a caller batch the log into the same transaction as
    the change it describes — so you never end up with a log entry for a
    decision that failed to save.
    """
    entry = AuditLog(
        action_type=action_type,
        action_detail=(detail or "")[:255],
        officer_id=officer_id,
        case_id=case_id,
        document_id=document_id,
    )
    db.session.add(entry)
    if commit:
        db.session.commit()
    return entry


def client_ip() -> str:
    """Real client IP even behind one reverse proxy."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    return forwarded.split(",")[0].strip() or (request.remote_addr or "unknown")

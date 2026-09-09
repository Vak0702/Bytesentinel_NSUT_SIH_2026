"""
/api/auth/* — sign-in, sign-out, and "who am I".

Credentials are checked against the `officers` table from
database/legal_dms_database.sql. Officers sign in with either their badge
number (DL001) or their email; the login page labels the field "OFFICER ID",
so badge number is the primary path.
"""

from flask import Blueprint, current_app, request, session

from extensions import db
from models import Officer
from utils.audit import client_ip, record
from utils.auth_guard import SESSION_KEY, current_officer, login_required
from utils.responses import fail, ok

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    identifier = (payload.get("officerId") or payload.get("email") or "").strip()
    password = payload.get("password") or ""
    remember = bool(payload.get("remember"))

    if not identifier or not password:
        return fail("Officer ID and passphrase are both required.",
                    code="missing_credentials", status=400)

    officer = Officer.query.filter(
        (Officer.badge_number == identifier) | (Officer.email == identifier.lower())
    ).first()

    # Deliberately the same message and the same status for "no such officer"
    # and "wrong password". Distinguishing them tells an attacker which badge
    # numbers are real — that is called username enumeration.
    invalid = fail("Invalid officer ID or passphrase.",
                   code="invalid_credentials", status=401)

    if officer is None:
        record("LOGIN_FAILED", f"Unknown identifier '{identifier[:40]}' from {client_ip()}")
        return invalid

    if officer.status != "ACTIVE":
        record("LOGIN_FAILED", f"Inactive account {officer.badge_number}", officer.officer_id)
        return fail("This account is inactive. Contact your station supervisor.",
                    code="account_inactive", status=403)

    if not officer.check_password(password):
        record("LOGIN_FAILED", f"Bad passphrase for {officer.badge_number} from {client_ip()}",
               officer.officer_id)
        return invalid

    # Rotate the session id on login. Without this, a session fixation attack
    # works: an attacker plants a known cookie, you log in with it, and they
    # now share your authenticated session.
    session.clear()
    session[SESSION_KEY] = officer.officer_id
    session.permanent = remember

    record("LOGIN", f"{officer.name} signed in from {client_ip()}", officer.officer_id)

    return ok({
        "officer": officer.to_dict(),
        "redirectTo": current_app.config["CONSOLE_URL"],
    })


@bp.post("/logout")
def logout():
    officer = current_officer()
    if officer:
        record("LOGOUT", f"{officer.name} signed out", officer.officer_id)
    session.clear()
    return ok({"signedOut": True})


@bp.get("/me")
def me():
    """
    Called by the console on every page load to decide whether to render or
    bounce back to the login page. Returns 401 rather than an error page so
    the frontend can handle it as data.
    """
    officer = current_officer()
    if officer is None:
        return fail("No active session.", code="unauthenticated", status=401)
    return ok({"officer": officer.to_dict()})


@bp.get("/officers")
@login_required
def officers():
    """Roster — used for the 'assigned officer' filters in the console."""
    rows = Officer.query.filter_by(status="ACTIVE").order_by(Officer.name).all()
    return ok([
        {"id": o.badge_number, "name": o.name, "initials": o.initials, "role": o.role}
        for o in rows
    ])


@bp.post("/change-password")
@login_required
def change_password():
    payload = request.get_json(silent=True) or {}
    officer = current_officer()

    if not officer.check_password(payload.get("currentPassword") or ""):
        return fail("Current passphrase is incorrect.", code="invalid_credentials", status=401)

    new_password = payload.get("newPassword") or ""
    if len(new_password) < 10:
        return fail("Passphrase must be at least 10 characters.",
                    code="weak_password", status=400)

    officer.set_password(new_password)
    record("PASSWORD_CHANGED", f"{officer.name} changed their passphrase",
           officer.officer_id, commit=False)
    db.session.commit()
    return ok({"changed": True})

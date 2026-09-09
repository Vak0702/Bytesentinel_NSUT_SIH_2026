"""
Session-based auth.

How it works, end to end:

1. `POST /api/auth/login` verifies the password and writes the officer's id
   into Flask's `session` dict.
2. Flask serialises that dict, signs it with `SECRET_KEY` and returns it as
   the `veridex_session` cookie. Signed, not encrypted — a user can read the
   contents but cannot forge them without the key, which is exactly what we
   need. That is why only the *id* goes in, never the name or role: those are
   re-read from the database on every request, so revoking an officer takes
   effect immediately rather than when their cookie expires.
3. `@login_required` reads the id back out and loads the row.

Why sessions and not JWTs here: a JWT would have to be stored somewhere the
browser's JavaScript can reach it, which makes it stealable by any XSS on the
page. An HttpOnly session cookie is not readable by JavaScript at all, and for
a single-backend app you gain nothing from a stateless token.
"""

from functools import wraps

from flask import g, session

from extensions import db

from models import Officer
from .responses import fail

SESSION_KEY = "officer_id"


def current_officer() -> Officer | None:
    """The signed-in officer for this request, or None. Cached on `g`."""
    if "officer" in g:
        return g.officer

    officer_id = session.get(SESSION_KEY)
    officer = None
    if officer_id is not None:
        officer = db.session.get(Officer, officer_id)
        # An officer deactivated mid-session loses access on the next request.
        if officer and officer.status != "ACTIVE":
            officer = None
    g.officer = officer
    return officer


def login_required(view):
    """Reject the request with 401 unless a valid session cookie is present."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        if current_officer() is None:
            session.pop(SESSION_KEY, None)
            return fail("Sign in to continue.", code="unauthenticated", status=401)
        return view(*args, **kwargs)

    return wrapper


def role_required(*roles: str):
    """
    Coarse role gate, e.g. @role_required("Senior Officer").

    Roles live in `officers.role`. Add finer-grained permissions later by
    replacing the membership test — every call site stays the same.
    """

    def decorator(view):
        @wraps(view)
        @login_required
        def wrapper(*args, **kwargs):
            officer = current_officer()
            if officer.role not in roles:
                return fail("Your role does not permit this action.",
                            code="forbidden", status=403)
            return view(*args, **kwargs)

        return wrapper

    return decorator

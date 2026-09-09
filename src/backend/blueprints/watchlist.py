"""
/api/watchlist — blacklisted passports, fraud identities, travel alerts.

Derived from the reference tables rather than a separate watchlist table:
a passport whose `document_status` is BLACKLISTED *is* the watchlist entry.
One source of truth beats two that can disagree.
"""

from datetime import date, timedelta

from flask import Blueprint

from models import Passport, Visa
from utils.auth_guard import login_required
from utils.responses import ok

bp = Blueprint("watchlist", __name__, url_prefix="/api/watchlist")


@bp.get("")
@login_required
def watchlist():
    blacklisted = Passport.query.filter_by(document_status="BLACKLISTED").all()
    blacklisted_visas = Visa.query.filter_by(document_status="BLACKLISTED").all()

    soon = date.today() + timedelta(days=90)
    expiring = (
        Passport.query.filter(Passport.date_of_expiry <= soon)
        .order_by(Passport.date_of_expiry)
        .limit(25)
        .all()
    )

    banner = None
    if blacklisted:
        banner = {
            "tone": "danger",
            "message": f"{len(blacklisted)} blacklisted passport(s) active on the watchlist.",
        }

    return ok({
        "watchlistAlertBanner": banner,
        "blacklistedPassports": {
            "total": len(blacklisted),
            "entries": [p.to_dict() for p in blacklisted],
        },
        "fraudIdentities": {
            "total": len(blacklisted_visas),
            "entries": [v.to_dict() for v in blacklisted_visas],
        },
        "travelAlerts": {
            "total": len(expiring),
            "entries": [
                {**p.to_dict(),
                 "alert": "Expired" if p.date_of_expiry < date.today() else "Expiring soon"}
                for p in expiring
            ],
        },
    })

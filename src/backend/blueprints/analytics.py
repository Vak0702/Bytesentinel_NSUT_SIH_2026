"""
/api/analytics — everything the Dashboard and Reports pages plot.

All of it is computed with SQL aggregates rather than pulling rows into Python
and counting them. On a laptop with ten cases the difference is invisible; on
a real checkpost with a million it is the whole ballgame.
"""

from datetime import date, timedelta

from flask import Blueprint
from sqlalchemy import case as sql_case, func

from extensions import db
from models import Case, Document, Officer, ScreeningResult
from utils.auth_guard import login_required
from utils.responses import ok

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday",
             "Friday", "Saturday", "Sunday"]


def _summary_stats() -> list[dict]:
    total_docs = db.session.query(func.count(Document.document_id)).scalar() or 0
    flagged = db.session.query(func.count(Case.case_id)).filter(
        Case.status == "FLAGGED").scalar() or 0
    under_review = db.session.query(func.count(Case.case_id)).filter(
        Case.status == "UNDER_REVIEW").scalar() or 0
    high_risk = db.session.query(func.count(ScreeningResult.screening_id)).filter(
        ScreeningResult.decision == "HIGH_RISK").scalar() or 0

    def pct(part: int) -> str:
        return f"{round(part / total_docs * 100)}% of all documents" if total_docs else "no documents yet"

    return [
        {"label": "Documents screened", "value": str(total_docs),
         "sub": "all time", "tone": "ink"},
        {"label": "Forgery cases", "value": str(high_risk),
         "sub": pct(high_risk), "tone": "danger"},
        {"label": "Tampering found", "value": "0",
         "sub": "tampering module not yet wired", "tone": "danger"},
        {"label": "Face mismatches", "value": "0",
         "sub": "face module not yet wired", "tone": "warn"},
        {"label": "Travellers flagged", "value": str(flagged),
         "sub": "passed to investigations", "tone": "warn"},
        {"label": "Manual reviews", "value": str(under_review),
         "sub": pct(under_review), "tone": "ink"},
        {"label": "Average processing", "value": "—",
         "sub": "needs per-case timing", "tone": "safe"},
    ]


def _risk_distribution() -> list[dict]:
    buckets = [
        ("Low (0-40)", 0, 40, "var(--color-safe)"),
        ("Medium (41-70)", 41, 70, "var(--color-warn)"),
        ("High (71-100)", 71, 100, "var(--color-danger)"),
    ]
    out = []
    for label, lo, hi, color in buckets:
        count = db.session.query(func.count(ScreeningResult.screening_id)).filter(
            ScreeningResult.risk_score.between(lo, hi)).scalar() or 0
        out.append({"label": label, "value": count, "color": color})
    return out


def _weekly_activity() -> list[dict]:
    """Case counts for the last seven days, keyed Monday-first."""
    since = date.today() - timedelta(days=6)
    rows = (
        db.session.query(func.date(Case.created_at), func.count(Case.case_id))
        .filter(func.date(Case.created_at) >= since)
        .group_by(func.date(Case.created_at))
        .all()
    )
    by_weekday = {}
    for day_value, count in rows:
        parsed = date.fromisoformat(str(day_value)) if not isinstance(day_value, date) else day_value
        by_weekday[DAY_NAMES[parsed.weekday()]] = count

    return [{"day": d, "label": d[:3], "count": by_weekday.get(d, 0)} for d in DAY_NAMES]


def _cases_by_country() -> list[dict]:
    rows = (
        db.session.query(Case.nationality, func.count(Case.case_id))
        .filter(Case.nationality.isnot(None))
        .group_by(Case.nationality)
        .order_by(func.count(Case.case_id).desc())
        .limit(8)
        .all()
    )
    return [{"country": c, "count": n} for c, n in rows]


def _officer_performance() -> list[dict]:
    rows = (
        db.session.query(
            Officer.name,
            func.count(Case.case_id),
            func.sum(sql_case((Case.status == "FLAGGED", 1), else_=0)),
        )
        .outerjoin(Case, Case.officer_id == Officer.officer_id)
        .filter(Officer.status == "ACTIVE")
        .group_by(Officer.officer_id, Officer.name)
        .order_by(func.count(Case.case_id).desc())
        .limit(10)
        .all()
    )
    return [
        {"officer": name, "screened": screened or 0, "flagged": int(flagged or 0),
         "avgTime": "—", "accuracy": "—"}
        for name, screened, flagged in rows
    ]


@bp.get("")
@login_required
def analytics():
    return ok({
        "summaryStats": _summary_stats(),
        "riskDistribution": _risk_distribution(),
        "weeklyScreeningActivity": _weekly_activity(),
        "casesByCountry": _cases_by_country(),
        "officerPerformance": _officer_performance(),
        # Placeholders kept so the Reports page keeps its shape until the
        # tampering module starts writing rows.
        "weeklyForgery": [
            {"week": f"W{w}", "forged": 0, "tampering": 0} for w in range(27, 35)
        ],
        "accuracyBreakdown": {
            "overall": 0,
            "segments": [
                {"label": "Forgeries correctly caught", "value": 0, "color": "var(--color-safe)"},
                {"label": "Cleared travellers wrongly stopped", "value": 0, "color": "var(--color-warn)"},
                {"label": "Missed and caught by an officer", "value": 0, "color": "var(--color-danger)"},
            ],
        },
    })

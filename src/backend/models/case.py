"""The `cases` and `audit_logs` tables."""

from sqlalchemy import Enum, ForeignKey, Integer, String, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from extensions import db

CASE_STATUSES = ("OPEN", "UNDER_REVIEW", "CLEARED", "FLAGGED", "REJECTED")

# The database speaks in SCREAMING_SNAKE enums; the React console renders
# sentence-case strings. Translating in one place keeps the mapping honest.
STATUS_TO_UI = {
    "OPEN": "In queue",
    "UNDER_REVIEW": "Under investigation",
    "CLEARED": "Cleared",
    "FLAGGED": "Flagged",
    "REJECTED": "Rejected",
}
DECISION_TO_UI = {
    "CLEARED": "Cleared",
    "FLAGGED": "Flagged",
    "REJECTED": "Rejected",
}


class Case(db.Model):
    __tablename__ = "cases"

    case_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    officer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("officers.officer_id"), nullable=False
    )
    case_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    subject_name: Mapped[str | None] = mapped_column(String(150))
    nationality: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(Enum(*CASE_STATUSES, name="case_status"), default="OPEN")
    created_at: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )

    officer = relationship("Officer", lazy="joined")
    documents = relationship("Document", back_populates="case", lazy="selectin")

    # ------------------------------------------------------------ helpers --
    def latest_screening(self):
        """Most recent screening result across all documents on this case."""
        results = [
            r for d in self.documents for r in getattr(d, "screening_results", [])
        ]
        return max(results, key=lambda r: r.screened_at or 0, default=None)

    def primary_passport_number(self) -> str | None:
        from .document import Document  # local import: avoids a cycle

        for d in self.documents:
            if d.document_type == "PASSPORT":
                extraction = d.latest_extraction()
                if extraction:
                    return (extraction.extracted_data or {}).get("passport_number")
        return None

    def to_dict(self) -> dict:
        """
        Shape this exactly like the objects the console already renders
        (`src/data/cases.js`). Doing the renaming server-side means the React
        pages need no changes when real data arrives.
        """
        screening = self.latest_screening()
        risk = float(screening.risk_score) if screening else 0
        return {
            "caseId": self.case_number,
            "traveller": self.subject_name,
            "passport": self.primary_passport_number() or "—",
            "nationality": self.nationality,
            "status": STATUS_TO_UI.get(self.status, self.status),
            "decision": DECISION_TO_UI.get(self.status),
            "risk": round(risk),
            "riskLabel": (
                "High risk" if risk >= 71 else "Medium risk" if risk >= 41 else "Low risk"
            ),
            "officer": self.officer.name if self.officer else None,
            "officerBadge": self.officer.badge_number if self.officer else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "documentCount": len(self.documents),
        }


class AuditLog(db.Model):
    """
    Append-only trail. The login page promises every session is "signed, logged
    and attributable" — this table is where that promise is kept.
    """

    __tablename__ = "audit_logs"

    log_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("documents.document_id"))
    case_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cases.case_id"))
    officer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("officers.officer_id"))
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    action_detail: Mapped[str | None] = mapped_column(String(255))
    action_time: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())

    officer = relationship("Officer", lazy="joined")

    TONE_BY_ACTION = {
        "LOGIN": "safe",
        "LOGOUT": "neutral",
        "LOGIN_FAILED": "danger",
        "DECISION_CLEARED": "safe",
        "DECISION_FLAGGED": "danger",
        "DECISION_REJECTED": "danger",
        "SCREENING_RUN": "warn",
    }

    def to_dict(self) -> dict:
        return {
            "id": f"act-{self.log_id}",
            "time": self.action_time.strftime("%Y-%m-%d %H:%M:%S") if self.action_time else "",
            "title": self.action_type.replace("_", " ").title(),
            "description": self.action_detail or "",
            "badge": self.action_type.split("_")[0].title(),
            "tone": self.TONE_BY_ACTION.get(self.action_type, "neutral"),
            "officer": self.officer.name if self.officer else None,
        }

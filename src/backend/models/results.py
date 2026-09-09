"""
Per-document analysis results — one table per pipeline stage.

Keeping these separate (rather than dumping every score onto `documents`)
means each of your teammates can own one module: whoever builds tampering
detection writes only to `tampering_results`, whoever builds face matching
writes only to `face_verification`, and neither can break the other.
"""

from sqlalchemy import DECIMAL, Enum, ForeignKey, Integer, Text, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from extensions import db

PASS_FAIL = ("PASS", "SUSPICIOUS", "FAIL")


def _f(value):
    return float(value) if value is not None else None


class ScreeningResult(db.Model):
    __tablename__ = "screening_results"

    screening_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.document_id"), nullable=False)
    risk_score: Mapped[float] = mapped_column(DECIMAL(5, 2), nullable=False)
    decision: Mapped[str] = mapped_column(Enum("CLEAR", "REVIEW", "HIGH_RISK", name="screening_decision"), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    screened_at: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())

    document = relationship("Document", back_populates="screening_results")

    def to_dict(self) -> dict:
        return {
            "screeningId": self.screening_id,
            "documentId": self.document_id,
            "riskScore": _f(self.risk_score),
            "decision": self.decision,
            "summary": self.summary,
            "screenedAt": self.screened_at.isoformat() if self.screened_at else None,
        }


class ValidationResult(db.Model):
    __tablename__ = "validation_results"

    validation_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.document_id"), nullable=False)
    format_status: Mapped[str | None] = mapped_column(Enum("PASS", "FAIL", "REVIEW", name="format_status"))
    database_status: Mapped[str | None] = mapped_column(
        Enum("MATCH", "MISMATCH", "NOT_AVAILABLE", "REVIEW", name="database_status")
    )
    validation_status: Mapped[str | None] = mapped_column(Enum("VALID", "INVALID", "REVIEW", name="validation_status"))
    validation_message: Mapped[str | None] = mapped_column(Text)
    checked_at: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())

    document = relationship("Document", back_populates="validation_results")

    def to_dict(self) -> dict:
        return {
            "validationId": self.validation_id,
            "documentId": self.document_id,
            "formatStatus": self.format_status,
            "databaseStatus": self.database_status,
            "validationStatus": self.validation_status,
            "message": self.validation_message,
            "checkedAt": self.checked_at.isoformat() if self.checked_at else None,
        }


class TamperingResult(db.Model):
    __tablename__ = "tampering_results"

    tampering_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.document_id"), nullable=False)
    photo_tampering_status: Mapped[str | None] = mapped_column(Enum(*PASS_FAIL, name="photo_tamper_status"))
    text_tampering_status: Mapped[str | None] = mapped_column(Enum(*PASS_FAIL, name="text_tamper_status"))
    stamp_tampering_status: Mapped[str | None] = mapped_column(Enum(*PASS_FAIL, name="stamp_tamper_status"))
    metadata_status: Mapped[str | None] = mapped_column(Enum(*PASS_FAIL, name="metadata_status"))
    photo_tampering_score: Mapped[float | None] = mapped_column(DECIMAL(5, 4))
    text_tampering_score: Mapped[float | None] = mapped_column(DECIMAL(5, 4))
    stamp_tampering_score: Mapped[float | None] = mapped_column(DECIMAL(5, 4))
    metadata_score: Mapped[float | None] = mapped_column(DECIMAL(5, 4))
    overall_score: Mapped[float | None] = mapped_column(DECIMAL(5, 4))
    overall_status: Mapped[str | None] = mapped_column(Enum(*PASS_FAIL, name="overall_tamper_status"))
    details: Mapped[str | None] = mapped_column(Text)
    checked_at: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())

    document = relationship("Document", back_populates="tampering_results")

    def to_dict(self) -> dict:
        return {
            "tamperingId": self.tampering_id,
            "documentId": self.document_id,
            "photo": {"status": self.photo_tampering_status, "score": _f(self.photo_tampering_score)},
            "text": {"status": self.text_tampering_status, "score": _f(self.text_tampering_score)},
            "stamp": {"status": self.stamp_tampering_status, "score": _f(self.stamp_tampering_score)},
            "metadata": {"status": self.metadata_status, "score": _f(self.metadata_score)},
            "overall": {"status": self.overall_status, "score": _f(self.overall_score)},
            "details": self.details,
            "checkedAt": self.checked_at.isoformat() if self.checked_at else None,
        }


class FaceVerification(db.Model):
    __tablename__ = "face_verification"

    verification_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.document_id"), nullable=False)
    face_match_status: Mapped[str | None] = mapped_column(Enum("MATCH", "NO_MATCH", "REVIEW", name="face_status"))
    similarity_score: Mapped[float | None] = mapped_column(DECIMAL(5, 4))
    details: Mapped[str | None] = mapped_column(Text)
    verified_at: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())

    document = relationship("Document", back_populates="face_verifications")

    def to_dict(self) -> dict:
        return {
            "verificationId": self.verification_id,
            "documentId": self.document_id,
            "status": self.face_match_status,
            "similarity": _f(self.similarity_score),
            "details": self.details,
            "verifiedAt": self.verified_at.isoformat() if self.verified_at else None,
        }

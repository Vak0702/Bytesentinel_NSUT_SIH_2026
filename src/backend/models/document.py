"""The `documents` and `document_extractions` tables."""

from sqlalchemy import JSON, DECIMAL, Enum, ForeignKey, Integer, BigInteger, String, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from extensions import db

DOCUMENT_TYPES = ("PASSPORT", "VISA", "NATIONAL_ID", "DRIVING_LICENSE", "PERMIT")
UPLOAD_STATUSES = ("UPLOADED", "PROCESSING", "PROCESSED", "FAILED")


class Document(db.Model):
    __tablename__ = "documents"

    document_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Nullable so an officer can scan a passport before a case exists —
    # the original schema required a case up front, which forces the UI to
    # create an empty case just to test a document.
    case_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cases.case_id"))
    document_type: Mapped[str] = mapped_column(Enum(*DOCUMENT_TYPES, name="document_type"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    file_hash: Mapped[str | None] = mapped_column(String(255))
    upload_status: Mapped[str] = mapped_column(Enum(*UPLOAD_STATUSES, name="upload_status"), default="UPLOADED")
    uploaded_at: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())

    case = relationship("Case", back_populates="documents")
    extractions = relationship("DocumentExtraction", back_populates="document",
                               cascade="all, delete-orphan", lazy="selectin")
    screening_results = relationship("ScreeningResult", back_populates="document", lazy="selectin")
    validation_results = relationship("ValidationResult", back_populates="document", lazy="selectin")
    tampering_results = relationship("TamperingResult", back_populates="document", lazy="selectin")
    face_verifications = relationship("FaceVerification", back_populates="document", lazy="selectin")

    def latest_extraction(self):
        return max(self.extractions, key=lambda e: e.extraction_id, default=None)

    def to_dict(self) -> dict:
        extraction = self.latest_extraction()
        return {
            "documentId": self.document_id,
            "caseId": self.case_id,
            "type": self.document_type,
            "fileName": self.file_name,
            "mimeType": self.mime_type,
            "fileHash": self.file_hash,
            "uploadStatus": self.upload_status,
            "uploadedAt": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "extracted": extraction.extracted_data if extraction else None,
            "ocrConfidence": float(extraction.ocr_confidence)
            if extraction and extraction.ocr_confidence is not None
            else None,
        }


class DocumentExtraction(db.Model):
    """OCR output. `extracted_data` is JSON so each document type can carry its
    own field set without a schema change per type."""

    __tablename__ = "document_extractions"

    # BigInteger has no AUTOINCREMENT in SQLite, so fall back to Integer there.
    # `with_variant` keeps MySQL on BIGINT — same model, two dialects.
    extraction_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False
    )
    extracted_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    ocr_confidence: Mapped[float | None] = mapped_column(DECIMAL(5, 4))
    extraction_status: Mapped[str] = mapped_column(
        Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="extraction_status"),
        default="PENDING",
    )
    extracted_at: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())

    document = relationship("Document", back_populates="extractions")

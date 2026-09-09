"""
SQLAlchemy models mapped onto the existing `legal_dms` schema.

These are deliberately written to match `database/legal_dms_database.sql`
column for column — table names, column names and enum values all line up, so
you can point the app at the database you already dumped without migrating
anything.
"""

from .officer import Officer
from .case import Case, AuditLog
from .document import Document, DocumentExtraction
from .reference import Passport, Visa, NationalId, DrivingLicense, Permit
from .results import (
    ScreeningResult,
    ValidationResult,
    TamperingResult,
    FaceVerification,
)

__all__ = [
    "Officer",
    "Case",
    "AuditLog",
    "Document",
    "DocumentExtraction",
    "Passport",
    "Visa",
    "NationalId",
    "DrivingLicense",
    "Permit",
    "ScreeningResult",
    "ValidationResult",
    "TamperingResult",
    "FaceVerification",
]

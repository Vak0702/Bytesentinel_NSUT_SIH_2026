"""
Reference / breeder-document tables.

These hold the *authoritative* records a scanned document is checked against:
`passports`, `visas`, `national_ids`, `driving_licenses`, `permits`. Nothing
here belongs to a case — they are the ground truth the validation module
compares extracted OCR fields with.
"""

from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from extensions import db

DOC_STATUSES = ("ACTIVE", "EXPIRED", "BLACKLISTED")


def _iso(d):
    return d.isoformat() if d else None


class Passport(db.Model):
    __tablename__ = "passports"

    passport_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    passport_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    nationality: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[object] = mapped_column(Date, nullable=False)
    date_of_expiry: Mapped[object] = mapped_column(Date, nullable=False)
    gender: Mapped[str | None] = mapped_column(String(20))
    document_status: Mapped[str] = mapped_column(Enum(*DOC_STATUSES, name="passport_status"), default="ACTIVE")

    def to_dict(self) -> dict:
        return {
            "passportNumber": self.passport_number,
            "name": self.name,
            "nationality": self.nationality,
            "dateOfBirth": _iso(self.date_of_birth),
            "dateOfExpiry": _iso(self.date_of_expiry),
            "gender": self.gender,
            "status": self.document_status,
        }


class Visa(db.Model):
    __tablename__ = "visas"

    visa_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    visa_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    passport_number: Mapped[str | None] = mapped_column(
        String(50), ForeignKey("passports.passport_number")
    )
    visa_type: Mapped[str | None] = mapped_column(String(100))
    entries: Mapped[str | None] = mapped_column(String(100))
    stay_duration: Mapped[int | None] = mapped_column(Integer)
    document_status: Mapped[str] = mapped_column(Enum(*DOC_STATUSES, name="visa_status"), default="ACTIVE")

    def to_dict(self) -> dict:
        return {
            "visaNumber": self.visa_number,
            "passportNumber": self.passport_number,
            "visaType": self.visa_type,
            "entries": self.entries,
            "stayDuration": self.stay_duration,
            "status": self.document_status,
        }


class NationalId(db.Model):
    __tablename__ = "national_ids"

    national_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    nationality: Mapped[str | None] = mapped_column(String(100))
    date_of_birth: Mapped[object | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))

    def to_dict(self) -> dict:
        return {
            "idNumber": self.id_number,
            "name": self.name,
            "nationality": self.nationality,
            "dateOfBirth": _iso(self.date_of_birth),
            "gender": self.gender,
        }


class DrivingLicense(db.Model):
    __tablename__ = "driving_licenses"

    license_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    license_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    date_of_birth: Mapped[object | None] = mapped_column(Date)
    date_of_issue: Mapped[object | None] = mapped_column(Date)
    date_of_expiry: Mapped[object | None] = mapped_column(Date)
    license_type: Mapped[str | None] = mapped_column(String(50))

    def to_dict(self) -> dict:
        return {
            "licenseNumber": self.license_number,
            "name": self.name,
            "dateOfBirth": _iso(self.date_of_birth),
            "dateOfIssue": _iso(self.date_of_issue),
            "dateOfExpiry": _iso(self.date_of_expiry),
            "licenseType": self.license_type,
        }


class Permit(db.Model):
    __tablename__ = "permits"

    permit_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    permit_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    permit_type: Mapped[str | None] = mapped_column(String(100))
    date_of_issue: Mapped[object | None] = mapped_column(Date)
    date_of_expiry: Mapped[object | None] = mapped_column(Date)
    issuing_authority: Mapped[str | None] = mapped_column(String(150))

    def to_dict(self) -> dict:
        return {
            "permitNumber": self.permit_number,
            "name": self.name,
            "permitType": self.permit_type,
            "dateOfIssue": _iso(self.date_of_issue),
            "dateOfExpiry": _iso(self.date_of_expiry),
            "issuingAuthority": self.issuing_authority,
        }

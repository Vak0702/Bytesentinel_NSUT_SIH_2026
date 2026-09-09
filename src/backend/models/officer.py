"""The `officers` table — the source of truth for who may sign in."""

import bcrypt
from sqlalchemy import Enum, String, Integer, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column

from extensions import db


class Officer(db.Model):
    __tablename__ = "officers"

    officer_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    badge_number: Mapped[str | None] = mapped_column(String(50), unique=True)
    department: Mapped[str | None] = mapped_column(String(100))
    role: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(
        Enum("ACTIVE", "INACTIVE", name="officer_status"), default="ACTIVE"
    )
    created_at: Mapped[object] = mapped_column(TIMESTAMP, server_default=func.now())

    # ---------------------------------------------------------------- auth --
    def check_password(self, plaintext: str) -> bool:
        """
        Verify a password against the stored bcrypt hash.

        Why bcrypt and not SHA-256: bcrypt is deliberately *slow* and salts
        every hash, so two officers with the same password get different
        hashes and an attacker with the dump cannot brute-force it quickly.
        The salt is stored inside the hash string itself (the `$2b$12$...`
        prefix is version + cost factor + salt), which is why `checkpw` only
        needs the hash and the candidate password.
        """
        if not self.password_hash:
            return False
        try:
            return bcrypt.checkpw(
                plaintext.encode("utf-8"), self.password_hash.encode("utf-8")
            )
        except ValueError:
            # Stored value is not a valid bcrypt hash (e.g. a plaintext
            # placeholder someone typed in during testing).
            return False

    def set_password(self, plaintext: str) -> None:
        self.password_hash = bcrypt.hashpw(
            plaintext.encode("utf-8"), bcrypt.gensalt(rounds=12)
        ).decode("utf-8")

    # -------------------------------------------------------------- output --
    @property
    def initials(self) -> str:
        parts = [p for p in self.name.replace(".", " ").split() if p]
        return "".join(p[0] for p in parts[:2]).upper() or "OF"

    def to_dict(self) -> dict:
        """Never include `password_hash` here. Serialisers leak by default."""
        return {
            "officerId": self.officer_id,
            "name": self.name,
            "email": self.email,
            "badgeNumber": self.badge_number,
            "department": self.department,
            "role": self.role,
            "status": self.status,
            "initials": self.initials,
        }

    def __repr__(self) -> str:
        return f"<Officer {self.badge_number} {self.name}>"

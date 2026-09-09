"""
Central configuration.

Everything that changes between your laptop, a teammate's laptop and a demo
machine lives here and is read from environment variables, so the code itself
never needs editing. `python-dotenv` loads a local `.env` file into the
environment automatically when the app starts.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Config:
    # --- Flask core -------------------------------------------------------
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-do-not-use-in-production")
    JSON_SORT_KEYS = False

    # --- Database ---------------------------------------------------------
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:@localhost:3306/legal_dms",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        # MySQL closes idle connections after 8 hours; recycling below that
        # stops the first request of the morning from failing.
        "pool_recycle": 3600,
        "pool_pre_ping": True,
    }

    # --- Session cookie ---------------------------------------------------
    # The session cookie is scoped to the *host*, not the port, so a cookie set
    # by Flask on localhost:5000 is also sent to localhost:3000 and :5173.
    # That is what lets the Next.js landing page log you in and the Vite
    # console stay logged in, without any token juggling.
    SESSION_COOKIE_NAME = "veridex_session"
    SESSION_COOKIE_HTTPONLY = True          # JavaScript cannot read it -> XSS-safe
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _bool("SESSION_COOKIE_SECURE", False)  # True behind HTTPS
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=int(os.getenv("SESSION_MINUTES", "480")))

    # --- App specific -----------------------------------------------------
    FRONTEND_ORIGINS = [
        o.strip()
        for o in os.getenv(
            "FRONTEND_ORIGINS", "http://localhost:3000,http://localhost:5173"
        ).split(",")
        if o.strip()
    ]
    CONSOLE_URL = os.getenv("CONSOLE_URL", "http://localhost:5173")
    DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "Veridex@2026")

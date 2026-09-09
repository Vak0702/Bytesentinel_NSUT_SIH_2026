"""
Blueprints = one module per feature area of the officer console.

Each is a self-contained group of routes with its own URL prefix. To add a new
module later (say document upload, or OCR), create `documents.py` here, define
`bp = Blueprint("documents", __name__)`, and register it in `app.py`. Nothing
else in the codebase has to change — that is the whole point of this layout.
"""

from .auth import bp as auth_bp
from .cases import bp as cases_bp
from .documents import bp as documents_bp
from .screening import bp as screening_bp
from .watchlist import bp as watchlist_bp
from .analytics import bp as analytics_bp
from .activity import bp as activity_bp

ALL_BLUEPRINTS = (
    auth_bp,
    cases_bp,
    documents_bp,
    screening_bp,
    watchlist_bp,
    analytics_bp,
    activity_bp,
)

"""
Extension singletons.

They are created here, unbound, and attached to the app inside `create_app()`.
This is the standard way to avoid circular imports: models import `db` from
this module, and this module imports nothing of ours.
"""

from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
cors = CORS()

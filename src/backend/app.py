"""
Application factory + entry point.

    python app.py            # dev server on http://localhost:5000
    flask --app app init-db  # create tables (SQLite / empty MySQL)
    flask --app app seed     # load demo officers and reference documents
    flask --app app routes   # list every endpoint

Why a factory (`create_app`) instead of a module-level `app = Flask(...)`:
it lets tests build a throwaway app with a different config, and it forces
every import to happen in a defined order, which is what keeps circular
imports out of a project this size.
"""

import os

from flask import Flask, jsonify, send_from_directory

from blueprints import ALL_BLUEPRINTS
from config import Config
from extensions import cors, db


def create_app(config_object=Config) -> Flask:
    # static_folder=None disables Flask's built-in static handler on purpose.
    # With static_url_path="" it would register a catch-all `/<path:filename>`
    # rule that shadows our own routes and only ever matches exact filenames —
    # so /login would 404 even with login.html sitting on disk. We serve the
    # built frontends ourselves in register_static_routes() instead.
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_object)

    db.init_app(app)

    # CORS with credentials: the browser will only send our session cookie to
    # a cross-origin API if the server explicitly allows credentials *and*
    # names the exact origin (a `*` wildcard is rejected in that mode).
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGINS"]}},
        supports_credentials=True,
    )

    for blueprint in ALL_BLUEPRINTS:
        app.register_blueprint(blueprint)

    register_error_handlers(app)
    register_cli(app)
    register_static_routes(app)

    @app.get("/api/health")
    def health():
        """Cheap liveness probe that also proves the DB connection works."""
        from sqlalchemy import text
        try:
            db.session.execute(text("SELECT 1"))
            database = "up"
        except Exception as exc:  # noqa: BLE001 - we want the message verbatim
            database = f"down: {exc.__class__.__name__}"
        from services.aadhaar_service import is_available as aadhaar_ok
        from services.face_service import is_available as face_ok
        from services.mrz_service import is_available as passport_ok
        return jsonify({"ok": True, "data": {
            "service": "veridex-api",
            "database": database,
            "passportOcr": passport_ok(),
            "aadhaarOcr": aadhaar_ok(),
            "faceMatch": face_ok(),
        }})

    return app


def register_error_handlers(app: Flask) -> None:
    """
    Return JSON for API routes no matter what breaks. A frontend that gets an
    HTML error page back from `fetch()` fails with a confusing JSON parse
    error three layers away from the real cause.
    """

    def as_json(message: str, code: str, status: int):
        return jsonify({"ok": False, "error": {"code": code, "message": message}}), status

    @app.errorhandler(404)
    def not_found(_):
        return as_json("Endpoint not found.", "not_found", 404)

    @app.errorhandler(405)
    def not_allowed(_):
        return as_json("Method not allowed on this endpoint.", "method_not_allowed", 405)

    @app.errorhandler(500)
    def server_error(exc):
        db.session.rollback()  # never leave a broken transaction open
        app.logger.exception("Unhandled error", exc_info=exc)
        return as_json("Something went wrong on the server.", "internal_error", 500)


def register_static_routes(app: Flask) -> None:
    """
    Production only. After `scripts/build.ps1` (or build.sh):

        backend/static/            <- exported Next.js landing site
        backend/static/console/    <- built Vite console

    Two different fallback rules, because these are two different kinds of app.

    The console is a single-page app: React Router owns every path under
    /console, so anything that is not a real file must return the console's
    index.html and let the router decide. That is the fix for "refreshing on
    /console/cases gives a 404".

    The landing site is a *static export*: Next writes one real HTML file per
    route, so /login is on disk as `login.html`, not as a folder. Flask's
    static handler only matches exact filenames, so without the `.html` and
    `/index.html` probing below, visiting /login would 404 even though the
    page is sitting right there.
    """
    static_dir = os.path.join(app.root_path, "static")

    @app.get("/console", defaults={"path": ""})
    @app.get("/console/<path:path>")
    def console(path: str):
        console_dir = os.path.join(static_dir, "console")
        candidate = os.path.join(console_dir, path)
        if path and os.path.isfile(candidate):
            return send_from_directory(console_dir, path)
        return send_from_directory(console_dir, "index.html")

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def landing(path: str):
        # A typo'd API route must stay an API response. Without this guard the
        # catch-all below would hand back the landing page's HTML, and the
        # frontend's fetch() would fail with a JSON parse error that points
        # nowhere near the actual mistake.
        if path.startswith("api/"):
            return jsonify({"ok": False, "error": {"code": "not_found",
                                                   "message": "Endpoint not found."}}), 404

        if not os.path.isdir(static_dir):
            return (
                "<h1>Veridex API is running</h1>"
                "<p>No built frontend found. Either run the dev servers "
                "(npm run dev in frontend/landing and frontend/console), "
                "or run scripts/build.ps1 to build them into backend/static.</p>",
                200,
            )

        # Try, in order: the exact file, the route as a .html file, the route
        # as a folder with an index.html inside. Then give up and serve the
        # home page.
        for candidate in (path, f"{path}.html", os.path.join(path, "index.html")):
            if candidate and os.path.isfile(os.path.join(static_dir, candidate)):
                return send_from_directory(static_dir, candidate)

        index = os.path.join(static_dir, "index.html")
        if os.path.isfile(index):
            return send_from_directory(static_dir, "index.html")
        return jsonify({"ok": False, "error": {"code": "not_found",
                                               "message": "Endpoint not found."}}), 404


def register_cli(app: Flask) -> None:
    import click

    @app.cli.command("init-db")
    def init_db():
        """Create any tables that do not exist yet. Never drops anything."""
        db.create_all()
        click.echo("Tables created (existing ones left untouched).")

    @app.cli.command("seed")
    @click.option("--password", default=None, help="Password for every demo officer.")
    def seed_command(password):
        """Load demo officers and reference documents."""
        from seed import seed_all
        summary = seed_all(password or app.config["DEMO_PASSWORD"])
        for line in summary:
            click.echo(line)

    @app.cli.command("seed-cases")
    def seed_cases_command():
        """Create four demo cases so the console has data to render."""
        from seed import seed_cases
        for line in seed_cases():
            click.echo(line)

    @app.cli.command("set-password")
    @click.argument("identifier")
    @click.argument("password")
    def set_password(identifier, password):
        """Set one officer's passphrase: `set-password DL001 NewPass123`."""
        from models import Officer
        officer = Officer.query.filter(
            (Officer.badge_number == identifier) | (Officer.email == identifier)
        ).first()
        if officer is None:
            raise click.ClickException(f"No officer matching '{identifier}'.")
        officer.set_password(password)
        db.session.commit()
        click.echo(f"Passphrase updated for {officer.badge_number} ({officer.name}).")


app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "").lower() in {"1", "true"},
    )

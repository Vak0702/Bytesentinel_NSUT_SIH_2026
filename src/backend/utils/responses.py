"""
One response shape for the whole API.

Every endpoint returns either

    {"ok": true,  "data": <payload>}
    {"ok": false, "error": {"code": "...", "message": "..."}}

so the frontend has exactly one branch to write, instead of guessing per
endpoint. Consistency here is worth more than cleverness.
"""

from flask import jsonify


def ok(data=None, status: int = 200):
    return jsonify({"ok": True, "data": data}), status


def fail(message: str, code: str = "error", status: int = 400):
    return jsonify({"ok": False, "error": {"code": code, "message": message}}), status

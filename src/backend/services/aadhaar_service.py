"""
Aadhaar extraction, wrapped for the API.

Same lazy-import pattern as the passport and face services: heavy optional
dependency, imported on first use, failure surfaced as data rather than a
crash at startup.

Aadhaar needs **two** images (front and back) before it can produce anything,
which makes it different from a passport. The endpoint therefore holds the
front side until the back arrives.
"""

from __future__ import annotations

import logging
import threading

log = logging.getLogger(__name__)

_pipeline = None
_import_error: str | None = None
_lock = threading.Lock()


class AadhaarUnavailable(RuntimeError):
    """Raised when the Aadhaar OCR dependencies are not installed."""


def _load():
    global _pipeline, _import_error

    if _pipeline is not None:
        return _pipeline
    if _import_error is not None:
        raise AadhaarUnavailable(_import_error)

    with _lock:
        if _pipeline is not None:
            return _pipeline
        if _import_error is not None:
            raise AadhaarUnavailable(_import_error)

        try:
            from pipelines.aadhaar import extract_aadhaar
            _pipeline = extract_aadhaar
            log.info("Aadhaar pipeline loaded.")
            return _pipeline
        except ImportError as exc:
            _import_error = (
                f"The Aadhaar OCR module is not installed ({exc}). "
                f"Install it with: pip install -r pipelines/requirements-ocr.txt"
            )
            raise AadhaarUnavailable(_import_error) from exc
        except Exception as exc:
            _import_error = f"The Aadhaar OCR module failed to load: {exc}"
            raise AadhaarUnavailable(_import_error) from exc


def is_available() -> bool:
    if _pipeline is not None:
        return True
    if _import_error is not None:
        return False
    try:
        import importlib.util
        return all(
            importlib.util.find_spec(name) is not None
            for name in ("cv2", "paddleocr")
        )
    except Exception:
        return False


def read_aadhaar(front_path: str, back_path: str) -> dict:
    """
    Run the pipeline and normalise the result into the same envelope the
    passport module uses, so the console can render both with one component.
    """
    pipeline = _load()
    result = pipeline(front_path, back_path)

    extracted = result.get("extracted_data", {}) or {}
    checks = result.get("checks", {}) or {}
    status = result.get("status", "REVIEW")

    issues: list[str] = []
    if not checks.get("all_required_fields_present"):
        issues.append("Some required fields could not be read from the card.")
    if not checks.get("all_formats_valid"):
        issues.append("One or more fields failed their format check.")
    if checks.get("front_back_aadhaar_match") is False:
        issues.append(
            "The Aadhaar number on the front does not match the back — "
            "the two sides may not belong to the same card."
        )
    elif checks.get("front_back_aadhaar_match") is None:
        issues.append("The Aadhaar number could not be compared across both sides.")

    # Confidence from the checks that actually ran. `status == PASS` means the
    # extraction and internal consistency held up — it does NOT mean the card
    # has been authenticated against UIDAI, and the module's own docstring is
    # careful about that. Keep that honesty in the number.
    countable = [v for v in checks.values() if isinstance(v, bool)]
    confidence = round(sum(countable) / len(countable), 4) if countable else 0.0

    return {
        "document_type": "AADHAAR",
        "status": status,
        "fields": {
            "aadhaar_number": extracted.get("aadhaar_number"),
            "name": extracted.get("name"),
            "date_of_birth": extracted.get("date_of_birth"),
            "gender": extracted.get("gender"),
            "address": extracted.get("address"),
            "vid": extracted.get("vid"),
        },
        "checks": checks,
        "confidence": confidence,
        "issues": issues,
        "raw": result,
    }

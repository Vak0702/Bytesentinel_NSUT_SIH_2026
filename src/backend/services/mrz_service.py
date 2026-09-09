"""
Wrapper around the passport MRZ pipeline.

The point of this file is that PaddleOCR and PaddlePaddle are large, slow to
install, and platform-fussy. If `import paddleocr` ran at startup, the whole
API would refuse to boot on any machine where that install had not succeeded —
including the machine of a teammate who is only working on the frontend.

So the import happens lazily, on the first upload, and its failure is reported
as a normal API error rather than a crash. Everything else in the app keeps
working either way.

The same pattern is worth reusing for the tampering and face-matching modules
when they arrive: heavy optional dependency, imported inside the function,
failure surfaced as data.
"""

from __future__ import annotations

import logging
import threading

log = logging.getLogger(__name__)

# Populated on first successful import. Guarded by a lock because two officers
# uploading simultaneously would otherwise both trigger the model load.
_pipeline = None
_import_error: str | None = None
_lock = threading.Lock()


class OcrUnavailable(RuntimeError):
    """Raised when the OCR dependencies are not installed."""


def _load():
    """Import the pipeline once. Returns the callable, or raises OcrUnavailable."""
    global _pipeline, _import_error

    if _pipeline is not None:
        return _pipeline
    if _import_error is not None:
        raise OcrUnavailable(_import_error)

    with _lock:
        # Re-check inside the lock: another thread may have finished while we
        # were waiting for it.
        if _pipeline is not None:
            return _pipeline
        if _import_error is not None:
            raise OcrUnavailable(_import_error)

        try:
            from pipelines.passport import extract_passport_mrz
            _pipeline = extract_passport_mrz
            log.info("Passport MRZ pipeline loaded.")
            return _pipeline
        except ImportError as exc:
            _import_error = (
                f"The passport OCR module is not installed ({exc}). "
                f"Install it with: pip install -r pipelines/requirements-ocr.txt"
            )
            raise OcrUnavailable(_import_error) from exc
        except Exception as exc:  # model download failure, missing weights, etc.
            _import_error = f"The passport OCR module failed to load: {exc}"
            raise OcrUnavailable(_import_error) from exc


def is_available() -> bool:
    """Cheap check for the health endpoint, without forcing a model load."""
    if _pipeline is not None:
        return True
    if _import_error is not None:
        return False
    try:
        import importlib.util
        return all(
            importlib.util.find_spec(name) is not None
            for name in ("cv2", "paddleocr", "mrzscanner")
        )
    except Exception:
        return False


def read_passport(image_path: str) -> dict:
    """
    Run the full pipeline on one image and return the structured result.

    Raises OcrUnavailable if the dependencies are missing, or RuntimeError if
    the image could not be read as a passport.
    """
    pipeline = _load()

    raw_fields = pipeline(image_path)

    from pipelines.passport import build_passport_result

    return build_passport_result(extracted_data=raw_fields)
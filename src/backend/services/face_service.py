"""
Face verification, wrapped for the API.

Two operations, deliberately separated, because they have different lifetimes:

  * **Liveness** proves a live person is standing at the counter, not a photo
    held up to the camera. It needs three frames (left / right / centre) and is
    captured **once per traveller**, at the start of the session. Asking an
    officer to redo the head-turn sequence for every document would be absurd
    at a real counter.

  * **Face match** compares the photo *on a document* with the traveller's
    verified live capture. This runs **once per uploaded document that carries
    a photo** — passport, Aadhaar, driving licence — because each is a separate
    claim about who this person is, and a forger who swaps the photo on only
    one of them is exactly what this catches.

So: liveness once, face match every time. The centre frame from the liveness
capture is stored on the case and reused as the live reference.

The original FastAPI service did both in a single request and threw the frames
away afterwards, which made per-document matching impossible.
"""

from __future__ import annotations

import logging
import threading

log = logging.getLogger(__name__)

_loaded = False
_import_error: str | None = None
_lock = threading.Lock()


class FaceUnavailable(RuntimeError):
    """Raised when InsightFace and its dependencies are not installed."""


def _ensure_loaded():
    global _loaded, _import_error

    if _loaded:
        return
    if _import_error is not None:
        raise FaceUnavailable(_import_error)

    with _lock:
        if _loaded:
            return
        if _import_error is not None:
            raise FaceUnavailable(_import_error)

        try:
            from pipelines.face.engine import get_app
            get_app()  # forces the model load now rather than mid-request
            _loaded = True
            log.info("Face verification engine loaded.")
        except ImportError as exc:
            _import_error = (
                f"The face verification module is not installed ({exc}). "
                f"Install it with: pip install -r pipelines/requirements-face.txt"
            )
            raise FaceUnavailable(_import_error) from exc
        except Exception as exc:
            _import_error = f"The face verification engine failed to load: {exc}"
            raise FaceUnavailable(_import_error) from exc


def is_available() -> bool:
    """Cheap capability check that does not force a model load."""
    if _loaded:
        return True
    if _import_error is not None:
        return False
    try:
        import importlib.util
        return all(
            importlib.util.find_spec(name) is not None
            for name in ("cv2", "insightface", "onnxruntime")
        )
    except Exception:
        return False


def check_liveness(left_path: str, right_path: str, centre_path: str) -> dict:
    """
    Confirm the three frames show a real person turning their head.

    Returns a dict with the direction detected in each frame, so a failure can
    tell the officer *which* frame was wrong instead of just "failed". The
    original returned a bare False, which gives a traveller no way to correct
    their pose and an officer no way to explain the rejection.
    """
    _ensure_loaded()

    import cv2
    from pipelines.face.liveness import get_head_direction

    frames = {"left": left_path, "right": right_path, "centre": centre_path}
    expected = {"left": "LEFT", "right": "RIGHT", "centre": "CENTER"}
    detected: dict[str, str | None] = {}

    for label, path in frames.items():
        image = cv2.imread(path)
        if image is None:
            return {
                "passed": False,
                "detected": detected,
                "message": f"The {label} frame could not be read as an image.",
            }
        detected[label] = get_head_direction(image)

    wrong = [
        label for label, want in expected.items() if detected.get(label) != want
    ]

    if wrong:
        details = ", ".join(
            f"{label} frame showed {detected.get(label) or 'no clear single face'}"
            for label in wrong
        )
        return {
            "passed": False,
            "detected": detected,
            "message": f"Liveness check failed: {details}.",
        }

    return {
        "passed": True,
        "detected": detected,
        "message": "Live person confirmed by head movement.",
    }


def extract_document_face(image_path: str, output_path: str) -> bool:
    """Crop the largest face out of a document scan. False if none found."""
    _ensure_loaded()
    from pipelines.face.face_verify import crop_face
    return crop_face(image_path, output_path)


def match_faces(document_face_path: str, live_frame_path: str) -> dict:
    """
    Compare a document photo with the live capture.

    Returns the shape the `face_verification` table stores: MATCH / NO_MATCH /
    REVIEW plus a similarity in 0-1.
    """
    _ensure_loaded()

    from pipelines.face.engine import MATCH_THRESHOLD
    from pipelines.face.face_verify import verify_face

    try:
        result = verify_face(document_face_path, live_frame_path)
    except ValueError as exc:
        # "No face detected" / "Multiple faces detected" — a real condition an
        # officer needs to see, not an internal error.
        return {
            "status": "REVIEW",
            "similarity": None,
            "threshold": MATCH_THRESHOLD,
            "message": str(exc),
        }

    similarity = result["similarity"]
    threshold = result["threshold"]

    # A band just under the threshold is genuinely ambiguous rather than a
    # clear rejection. Calling 0.48 a NO_MATCH with the same confidence as 0.05
    # would be dishonest about what the number means.
    if similarity >= threshold:
        status = "MATCH"
        message = f"Face matches the document photo (similarity {similarity:.2f})."
    elif similarity >= threshold - 0.08:
        status = "REVIEW"
        message = (
            f"Similarity {similarity:.2f} is just below the {threshold:.2f} "
            f"threshold — inconclusive, check manually."
        )
    else:
        status = "NO_MATCH"
        message = (
            f"Face does not match the document photo "
            f"(similarity {similarity:.2f}, threshold {threshold:.2f})."
        )

    return {
        "status": status,
        "similarity": round(float(similarity), 4),
        "threshold": threshold,
        "message": message,
    }

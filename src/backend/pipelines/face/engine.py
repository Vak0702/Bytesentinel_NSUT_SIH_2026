"""
One shared InsightFace instance for the whole process.

`face_verify.py` and `liveness.py` each constructed their own FaceAnalysis at
import time. That is two copies of the buffalo_l model in memory, two model
loads at startup, and — more importantly — an unavoidable import cost even for
a request that never touches faces.

This module builds it once, lazily, on first use. Both modules now share it.
"""

from __future__ import annotations

import threading

_app = None
_lock = threading.Lock()

# Cosine similarity threshold for "same person" with buffalo_l embeddings.
# Defined once here because it was previously declared in two places with two
# different values (see the note in face_service.py).
MATCH_THRESHOLD = 0.5


def get_app():
    """Return the shared FaceAnalysis instance, building it on first call."""
    global _app
    if _app is not None:
        return _app

    with _lock:
        if _app is not None:
            return _app

        from insightface.app import FaceAnalysis

        app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        app.prepare(ctx_id=0, det_size=(320, 320))
        _app = app
        return _app

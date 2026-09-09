import cv2
import numpy as np

from .engine import get_app, MATCH_THRESHOLD


def _app():
    """Shared detector. See engine.py for why it is not built at import time."""
    return get_app()



def crop_face(image_path, output_path):

    image = cv2.imread(image_path)

    if image is None:
        return False

    faces = _app().get(image)

    if len(faces) == 0:
        return False

    # Choose the biggest face
    face = max(
        faces,
        key=lambda x:
        (x.bbox[2] - x.bbox[0]) *
        (x.bbox[3] - x.bbox[1])
    )

    x1, y1, x2, y2 = face.bbox.astype(int)

    # Padding
    padding = 30

    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(image.shape[1], x2 + padding)
    y2 = min(image.shape[0], y2 + padding)

    cropped = image[y1:y2, x1:x2]

    cv2.imwrite(
        output_path,
        cropped
    )

    return True


def get_embedding(image_path):

    image = cv2.imread(image_path)

    if image is None:
        raise ValueError(
            "Could not read image"
        )

    faces = _app().get(image)

    if len(faces) == 0:
        raise ValueError(
            "No face detected"
        )

    if len(faces) > 1:
        raise ValueError(
            "Multiple faces detected"
        )

    face = faces[0]

    embedding = face.embedding

    embedding = (
        embedding /
        np.linalg.norm(embedding)
    )

    return embedding


def similarity(embedding1, embedding2):

    return float(
        np.dot(
            embedding1,
            embedding2
        )
    )


def verify_face(
    image1,
    image2,
    threshold=MATCH_THRESHOLD,
):
    """
    Compare two face images.

    The threshold used to default to 0.5 here while the FastAPI layer told the
    caller it was 0.45 — and, because it never passed its value in, 0.5 was
    what actually ran. A reported threshold that is not the one applied makes
    every borderline result unauditable, which for a border checkpost is a
    serious problem. Both now read MATCH_THRESHOLD from engine.py.
    """

    embedding1 = get_embedding(image1)

    embedding2 = get_embedding(image2)

    score = similarity(
        embedding1,
        embedding2
    )

    match = score >= threshold

    return {

        "match": match,

        "similarity": score,

        "threshold": threshold

    }
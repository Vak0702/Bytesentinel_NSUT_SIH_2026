import cv2
import numpy as np

from .engine import get_app, MATCH_THRESHOLD


def _app():
    """Shared detector. See engine.py for why it is not built at import time."""
    return get_app()



def get_head_position(face):

    kps = face.kps

    left_eye = kps[0]
    right_eye = kps[1]
    nose = kps[2]

    eye_center = (left_eye + right_eye) / 2

    eye_distance = np.linalg.norm(
        right_eye - left_eye
    )

    if eye_distance == 0:
        return 0

    position = (
        nose[0] - eye_center[0]
    ) / eye_distance

    return position


def get_head_direction(image):

    if image is None:
        return None

    faces = _app().get(image)

    if len(faces) != 1:
        return None

    face = faces[0]

    position = get_head_position(face)

    if position < -0.20:

        return "RIGHT"

    elif position > 0.20:

        return "LEFT"

    elif -0.10 < position < 0.10:

        return "CENTER"

    return None
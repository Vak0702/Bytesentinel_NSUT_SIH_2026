import cv2
import numpy as np
from pathlib import Path

from mrzscanner import MRZScanner, ModelType

# Loading the detection model takes seconds, so build it once per process
# rather than once per call. Four orientation attempts on a cold model would
# otherwise mean four model loads per upload.
_DETECTOR = None


def order_points(points):
    points = np.asarray(points, dtype=np.float32)

    s = points.sum(axis=1)
    d = np.diff(points, axis=1).reshape(-1)

    top_left = points[np.argmin(s)]
    bottom_right = points[np.argmax(s)]
    top_right = points[np.argmin(d)]
    bottom_left = points[np.argmax(d)]

    return np.array(
        [top_left, top_right, bottom_right, bottom_left],
        dtype=np.float32,
    )


def perspective_crop(image, polygon):
    rect = order_points(polygon)

    tl, tr, br, bl = rect

    width_top = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)

    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)

    width = max(int(width_top), int(width_bottom))
    height = max(int(height_left), int(height_right))

    dst = np.array(
        [
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1],
        ],
        dtype=np.float32,
    )

    matrix = cv2.getPerspectiveTransform(rect, dst)

    return cv2.warpPerspective(
        image,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _get_detector():
    global _DETECTOR
    if _DETECTOR is None:
        _DETECTOR = MRZScanner(
            model_type=ModelType.detection,
            detection_cfg="20250222",
        )
    return _DETECTOR


def detect_mrz(image):
    detector = _get_detector()

    result = detector(
        image,
        do_center_crop=True,
    )

    polygon = result.get("mrz_polygon")

    if polygon is None:
        raise RuntimeError("MRZ was not detected.")

    return np.asarray(polygon, dtype=np.float32)


def detect_and_crop_mrz(
    image_path,
    output_path="document/debug_mrz.png",
):
    image_path = Path(image_path)
    output_path = Path(output_path)

    image = cv2.imread(str(image_path))

    if image is None:
        raise FileNotFoundError(
            f"Could not read image: {image_path}"
        )

    print("[1] Reading passport...")
    print("Original size:", image.shape[1], "x", image.shape[0])

    # ---------------------------------------------------------
    # Normalize the full passport orientation.
    #
    # The original version rotated 90 degrees counter-clockwise
    # unconditionally, because the test image (i4.png) happened to be
    # sideways. That is correct for exactly one file and wrong for every
    # correctly-oriented scan an officer uploads.
    #
    # Instead: try each of the four rotations and keep the first one the
    # MRZ detector accepts. A passport photographed upright now works, and
    # so does i4.png -- it just takes one extra attempt.
    # ---------------------------------------------------------
    print("[2] Finding the right orientation...")

    rotations = [
        ("as-is", None),
        ("90 CCW", cv2.ROTATE_90_COUNTERCLOCKWISE),
        ("90 CW", cv2.ROTATE_90_CLOCKWISE),
        ("180", cv2.ROTATE_180),
    ]

    oriented = None
    polygon = None

    for label, rotation in rotations:
        candidate = image if rotation is None else cv2.rotate(image, rotation)

        try:
            polygon = detect_mrz(candidate)
        except Exception:
            print(f"    {label}: no MRZ found")
            continue

        print(f"    {label}: MRZ detected")
        oriented = candidate
        break

    if oriented is None:
        raise RuntimeError(
            "MRZ was not detected in any orientation. The image may be too "
            "blurred, cropped, or not a passport data page."
        )

    image = oriented

    print(
        "Working size:",
        image.shape[1],
        "x",
        image.shape[0],
    )

    # Save the upright passport for inspection.
    upright_path = output_path.parent / "debug_upright_passport.png"

    cv2.imwrite(
        str(upright_path),
        image,
    )

    print("Saved upright passport to:")
    print(upright_path)

    # ---------------------------------------------------------
    # The polygon was already found by the orientation search above.
    # ---------------------------------------------------------
    print("[3] MRZ located.")

    print("MRZ polygon:")
    print(polygon)

    if polygon.shape != (4, 2):
        raise RuntimeError(
            f"Unexpected polygon shape: {polygon.shape}"
        )

    # ---------------------------------------------------------
    # Add margin around detected MRZ
    # ---------------------------------------------------------
    center = polygon.mean(axis=0)

    # More generous margin than before.
    scale = np.array(
        [1.30, 1.20],
        dtype=np.float32,
    )

    polygon = center + (polygon - center) * scale

    # ---------------------------------------------------------
    # Perspective correction
    # ---------------------------------------------------------
    print("[4] Cropping and correcting MRZ...")

    mrz_crop = perspective_crop(
        image,
        polygon,
    )

    if mrz_crop is None or mrz_crop.size == 0:
        raise RuntimeError(
            "Failed to create MRZ crop."
        )

    # Make sure it is horizontal.
    if mrz_crop.shape[0] > mrz_crop.shape[1]:
        mrz_crop = cv2.rotate(
            mrz_crop,
            cv2.ROTATE_90_CLOCKWISE,
        )

    # Enlarge for OCR.
    mrz_crop = cv2.resize(
        mrz_crop,
        None,
        fx=4.0,
        fy=4.0,
        interpolation=cv2.INTER_CUBIC,
    )

    # Add safe white border.
    mrz_crop = cv2.copyMakeBorder(
        mrz_crop,
        40,
        40,
        100,
        100,
        cv2.BORDER_CONSTANT,
        value=(255, 255, 255),
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    cv2.imwrite(
        str(output_path),
        mrz_crop,
    )

    print("[5] MRZ crop saved to:")
    print(output_path)

    print(
        "Final crop size:",
        mrz_crop.shape[1],
        "x",
        mrz_crop.shape[0],
    )

    return mrz_crop


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print(
            "Usage: "
            "python document/mrz_pipeline.py <passport_image>"
        )
        raise SystemExit(1)

    detect_and_crop_mrz(sys.argv[1])
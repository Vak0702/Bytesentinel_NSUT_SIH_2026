from pathlib import Path

# The Aadhaar module reuses the passport module's PaddleOCR instance rather
# than creating a second one. Two PaddleOCR objects would mean two copies of
# the recognition model in memory for no benefit.
from ..passport.ocr import extract_text


def extract_aadhaar_ocr(front_image, back_image):
    """
    Run OCR on both sides of an Aadhaar document.

    Parameters
    ----------
    front_image : str or Path
        Front-side Aadhaar image.

    back_image : str or Path
        Back-side Aadhaar image.

    Returns
    -------
    dict
        OCR text from both sides.
    """

    front_image = Path(front_image)
    back_image = Path(back_image)

    if not front_image.exists():
        raise FileNotFoundError(
            f"Aadhaar front image not found: {front_image}"
        )

    if not back_image.exists():
        raise FileNotFoundError(
            f"Aadhaar back image not found: {back_image}"
        )

    print("Reading Aadhaar front side...")
    front_text = extract_text(str(front_image))

    print("Reading Aadhaar back side...")
    back_text = extract_text(str(back_image))

    return {
        "front_text": front_text,
        "back_text": back_text
    }
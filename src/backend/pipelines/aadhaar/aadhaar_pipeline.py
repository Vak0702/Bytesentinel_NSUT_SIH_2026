from pathlib import Path

from .aadhaar_ocr import extract_aadhaar_ocr
from .aadhaar_parser import parse_aadhaar
from .aadhaar_verification import (
    create_verification_result
)


def process_aadhaar(
    front_image,
    back_image
):
    """
    Complete Aadhaar processing pipeline.

    Image
       ↓
    OCR
       ↓
    Parsing
       ↓
    Validation
       ↓
    Front/back consistency
       ↓
    Final verification result
    """

    front_image = Path(front_image)
    back_image = Path(back_image)

    # ---------------------------------------------
    # Validate input files
    # ---------------------------------------------

    if not front_image.exists():

        raise FileNotFoundError(
            f"Aadhaar front image not found: "
            f"{front_image}"
        )

    if not back_image.exists():

        raise FileNotFoundError(
            f"Aadhaar back image not found: "
            f"{back_image}"
        )

    # ---------------------------------------------
    # OCR
    # ---------------------------------------------

    print("Running Aadhaar OCR...")

    ocr_result = extract_aadhaar_ocr(
        front_image,
        back_image
    )

    front_text = ocr_result["front_text"]
    back_text = ocr_result["back_text"]

    # ---------------------------------------------
    # Parsing
    # ---------------------------------------------

    print("Extracting Aadhaar fields...")

    parsed_data = parse_aadhaar(
        front_text,
        back_text
    )

    # ---------------------------------------------
    # Verification
    # ---------------------------------------------

    print("Running validation checks...")

    verification_result = (
        create_verification_result(
            parsed_data
        )
    )

    return verification_result
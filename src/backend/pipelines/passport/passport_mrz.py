import re
import sys
from itertools import combinations
from pathlib import Path
import json
from .passport_db_output import build_passport_result

import cv2
import numpy as np

from .mrz_pipeline import detect_and_crop_mrz
from .ocr import extract_text
from .mrz_parser import parse_mrz


BASE_DIR = Path(__file__).resolve().parent
VARIANT_DIR = BASE_DIR / "mrz_variants"


def make_ocr_variants(image: np.ndarray) -> list[tuple[str, np.ndarray]]:
    """
    Create a few OCR-friendly versions of the already-correct MRZ crop.

    Variant 1: original
    Variant 2: grayscale + Otsu threshold
    Variant 3: grayscale + sharpening + adaptive threshold

    The original image remains untouched.
    """

    variants = []

    # ---------------------------------------------------------
    # 1. Original
    # ---------------------------------------------------------
    variants.append(
        ("original", image.copy())
    )

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )

    # ---------------------------------------------------------
    # 2. Grayscale + Otsu threshold
    # ---------------------------------------------------------
    _, otsu = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )

    otsu_bgr = cv2.cvtColor(
        otsu,
        cv2.COLOR_GRAY2BGR,
    )

    variants.append(
        ("otsu", otsu_bgr)
    )

    # ---------------------------------------------------------
    # 3. Sharpen + adaptive threshold
    # ---------------------------------------------------------
    blurred = cv2.GaussianBlur(
        gray,
        (0, 0),
        sigmaX=1.2,
    )

    sharpened = cv2.addWeighted(
        gray,
        1.7,
        blurred,
        -0.7,
        0,
    )

    adaptive = cv2.adaptiveThreshold(
        sharpened,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        8,
    )

    adaptive_bgr = cv2.cvtColor(
        adaptive,
        cv2.COLOR_GRAY2BGR,
    )

    variants.append(
        ("adaptive", adaptive_bgr)
    )

    return variants


def normalize_mrz_line(line: str) -> str:
    """
    Keep only characters allowed in an MRZ.
    """

    line = line.upper().strip()

    return re.sub(
        r"[^A-Z0-9<]",
        "",
        line,
    )


def get_mrz_lines(raw_text: str) -> list[str]:
    """
    Convert OCR output into candidate MRZ lines.
    """

    lines = []

    for raw_line in raw_text.splitlines():
        line = normalize_mrz_line(raw_line)

        if line:
            lines.append(line)

    return lines


def score_line1(line: str) -> float:
    """
    Score a likely TD3 first line.
    """

    score = 0.0

    if line.startswith("P<"):
        score += 100

    if len(line) >= 5:
        country = line[2:5]

        if len(country) == 3 and country.isalpha():
            score += 30

    if "<<" in line:
        score += 40

    if line.count("<") >= 3:
        score += 10

    # Real TD3 line is 44 characters.
    distance = abs(len(line) - 44)

    score += max(
        0,
        20 - distance,
    )

    return score


def score_line2(line: str) -> float:
    """
    Score a likely TD3 second line.
    """

    score = 0.0

    if len(line) >= 28:
        score += 20

    if len(line) >= 10 and line[9].isdigit():
        score += 20

    if len(line) >= 13:
        nationality = line[10:13]

        if (
            len(nationality) == 3
            and nationality.isalpha()
        ):
            score += 35

    if len(line) >= 19 and line[13:19].isdigit():
        score += 25

    if len(line) >= 21 and line[20] in ("M", "F", "X"):
        score += 20

    if len(line) >= 27 and line[21:27].isdigit():
        score += 25

    distance = abs(len(line) - 44)

    score += max(
        0,
        20 - distance,
    )

    return score


def choose_best_mrz_pair(lines: list[str]):
    """
    Find the strongest pair of OCR lines and verify that the
    parser accepts the pair.
    """

    if len(lines) < 2:
        return None

    best = None

    for line1, line2 in combinations(lines, 2):

        # Try both possible orders.
        candidates = [
            (line1, line2),
            (line2, line1),
        ]

        for first, second in candidates:

            s1 = score_line1(first)
            s2 = score_line2(second)

            total_score = s1 + s2

            # Need reasonable structural evidence.
            if s1 < 30 or s2 < 30:
                continue

            try:
                parsed = parse_mrz(
                    [first, second]
                )
            except Exception:
                continue

            # Prefer a pair that actually produces useful fields.
            useful_fields = sum(
                value is not None
                for value in parsed.values()
            )

            total_score += useful_fields * 10

            candidate = (
                total_score,
                first,
                second,
                parsed,
            )

            if best is None or candidate[0] > best[0]:
                best = candidate

    return best


def extract_passport_mrz(image_path: str) -> dict:
    """
    Complete passport MRZ pipeline:

        passport image
            ↓
        MRZ detection + crop
            ↓
        multiple OCR preprocessing variants
            ↓
        choose best MRZ lines
            ↓
        deterministic MRZ parser
            ↓
        structured passport data
    """

    print("[1] Detecting and cropping MRZ...")

    crop_path = BASE_DIR / "debug_mrz.png"

    crop = detect_and_crop_mrz(
        image_path,
        output_path=str(crop_path),
    )

    print("[2] Creating OCR variants...")

    variants = make_ocr_variants(crop)

    VARIANT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    best_overall = None

    # ---------------------------------------------------------
    # Run PaddleOCR on every preprocessing variant.
    # ---------------------------------------------------------

    for variant_name, variant_image in variants:

        variant_path = (
            VARIANT_DIR
            / f"{variant_name}.png"
        )

        cv2.imwrite(
            str(variant_path),
            variant_image,
        )

        print()
        print(
            f"[3] PaddleOCR variant: "
            f"{variant_name}"
        )

        raw_text = extract_text(
            str(variant_path)
        )

        print("OCR:")
        print(raw_text)

        lines = get_mrz_lines(
            raw_text
        )

        print(
            "Candidate lines:",
            lines,
        )

        candidate = choose_best_mrz_pair(
            lines
        )

        if candidate is None:
            print(
                "No valid MRZ pair from this variant."
            )
            continue

        score, line1, line2, parsed = candidate

        print(
            f"Selected pair "
            f"(score={score:.1f}):"
        )

        print(line1)
        print(line2)

        if (
            best_overall is None
            or score > best_overall[0]
        ):
            best_overall = (
                score,
                variant_name,
                line1,
                line2,
                parsed,
            )

    # ---------------------------------------------------------
    # Final result
    # ---------------------------------------------------------

    if best_overall is None:
        raise RuntimeError(
            "None of the OCR variants produced a "
            "usable TD3 MRZ."
        )

    (
        score,
        variant_name,
        line1,
        line2,
        result,
    ) = best_overall

    print()
    print(
        "========== BEST MRZ RESULT =========="
    )

    print("Variant:", variant_name)
    print("Score:", score)
    print("Line 1:", line1)
    print("Line 2:", line2)

    print()
    print(
        "========== FINAL RESULT =========="
    )

    for key, value in result.items():
        print(f"{key}: {value}")

    return result


if __name__ == "__main__":

    if len(sys.argv) < 2:
        print(
            "Usage:\n"
            "python document/passport_mrz.py "
            "<passport_image>"
        )
        sys.exit(1)

    image_path = sys.argv[1]

    try:
        result = extract_passport_mrz(image_path)

        db_result = build_passport_result(
            extracted_data=result
    )

        print()
        print("========== DATABASE RESULT ==========")
        print(json.dumps(db_result, indent=4))

    except Exception as e:
        print("ERROR:")
        print(e)
        sys.exit(1)
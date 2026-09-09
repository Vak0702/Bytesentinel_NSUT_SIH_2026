from paddleocr import PaddleOCR


# Initialize PaddleOCR once.
ocr = PaddleOCR(
    lang="en",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)


def extract_text(image_path: str) -> str:
    """
    Run PaddleOCR and return detected text as newline-separated text.
    """

    result = ocr.predict(input=image_path)

    lines = []

    for res in result:
        try:
            texts = res["rec_texts"]
        except (TypeError, KeyError):
            # Some PaddleOCR versions expose the data through .json
            data = getattr(res, "json", None)

            if isinstance(data, dict):
                data = data.get("res", data)
            else:
                data = {}

            texts = data.get("rec_texts", [])

        for text in texts:
            if text and text.strip():
                lines.append(text.strip())

    return "\n".join(lines)
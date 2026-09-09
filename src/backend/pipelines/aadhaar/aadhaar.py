from pathlib import Path

from .aadhaar_pipeline import process_aadhaar


def extract_aadhaar(
    front_image,
    back_image
):
    """
    Public Aadhaar extraction function.

    Parameters
    ----------
    front_image : str or Path
        Front-side Aadhaar image.

    back_image : str or Path
        Back-side Aadhaar image.

    Returns
    -------
    dict
        Final Aadhaar extraction and screening result.
    """

    front_image = Path(front_image)
    back_image = Path(back_image)

    if not front_image.exists():

        raise FileNotFoundError(
            f"Front image not found: "
            f"{front_image}"
        )

    if not back_image.exists():

        raise FileNotFoundError(
            f"Back image not found: "
            f"{back_image}"
        )

    return process_aadhaar(
        front_image,
        back_image
    )
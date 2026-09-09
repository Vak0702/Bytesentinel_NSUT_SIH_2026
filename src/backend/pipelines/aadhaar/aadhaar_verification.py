def create_verification_result(parsed_data):
    """
    Create the final Aadhaar screening result.

    IMPORTANT:
    PASS means extraction, formatting and consistency
    checks passed.

    It does NOT mean the Aadhaar has been officially
    authenticated or proven genuine.
    """

    validation = parsed_data.get(
        "validation",
        {}
    )

    # ---------------------------------------------
    # Required fields
    # ---------------------------------------------

    required_fields = validation.get(
        "required_fields_present",
        {}
    )

    all_fields_present = (
        bool(required_fields)
        and all(required_fields.values())
    )

    # ---------------------------------------------
    # Format checks
    # ---------------------------------------------

    format_checks = [

        validation.get(
            "aadhaar_number_format",
            False
        ),

        validation.get(
            "dob_format",
            False
        ),

        validation.get(
            "gender_valid",
            False
        ),

        validation.get(
            "vid_format",
            False
        )
    ]

    all_formats_valid = all(
        format_checks
    )

    # ---------------------------------------------
    # Front / Back check
    # ---------------------------------------------

    front_back_match = validation.get(
        "front_back_aadhaar_match"
    )

    # ---------------------------------------------
    # Overall status
    # ---------------------------------------------

    if not all_fields_present:

        status = "INCOMPLETE"

    elif not all_formats_valid:

        status = "REVIEW"

    elif front_back_match is False:

        status = "REVIEW"

    elif front_back_match is None:

        status = "REVIEW"

    else:

        status = "PASS"

    # ---------------------------------------------
    # Final response
    # ---------------------------------------------

    return {

        "document_type": "AADHAAR",

        "status": status,

        "checks": {

            "all_required_fields_present":
                all_fields_present,

            "all_formats_valid":
                all_formats_valid,

            "front_back_aadhaar_match":
                front_back_match
        },

        "extracted_data": {

            "name":
                parsed_data.get("name"),

            "date_of_birth":
                parsed_data.get(
                    "date_of_birth"
                ),

            "gender":
                parsed_data.get("gender"),

            "aadhaar_number":
                parsed_data.get(
                    "aadhaar_number"
                ),

            "address":
                parsed_data.get("address"),

            "vid":
                parsed_data.get("vid")
        }
    }
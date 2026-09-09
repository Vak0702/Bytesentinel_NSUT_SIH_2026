"""
/api/documents/* — upload a document, read it, check it against the database.

The flow for a passport:

    officer picks a file in the console
        -> POST /api/documents/upload  (multipart)
        -> saved under uploads/<case>/ with a content hash
        -> MRZ detected, cropped, OCR'd, parsed        (document/ package)
        -> parsed fields mapped to database columns    (passport_db_output)
        -> compared field-by-field with `passports`    (services/passport_matcher)
        -> Document + DocumentExtraction + ValidationResult rows written
        -> comparison returned for the console to render

Everything after the OCR step is ordinary database work, which is why it is
testable without a single passport image.
"""

from __future__ import annotations

import hashlib
import os
import uuid

from flask import Blueprint, current_app, request
from werkzeug.utils import secure_filename

from extensions import db
from models import Case, Document, DocumentExtraction, FaceVerification, ValidationResult
from services.aadhaar_service import AadhaarUnavailable, read_aadhaar
from services.aadhaar_service import is_available as aadhaar_available
from services.face_service import (
    FaceUnavailable,
    check_liveness,
    extract_document_face,
    match_faces,
)
from services.face_service import is_available as face_available
from services.mrz_service import OcrUnavailable, is_available, read_passport
from services.passport_matcher import verify_against_database
from utils.audit import record
from utils.auth_guard import current_officer, login_required
from utils.responses import fail, ok

bp = Blueprint("documents", __name__, url_prefix="/api/documents")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
MAX_BYTES = 20 * 1024 * 1024  # 20 MB

DOCUMENT_TYPES = {"PASSPORT", "VISA", "NATIONAL_ID", "DRIVING_LICENSE", "PERMIT", "FACE"}

# Document types that normally carry a photograph of the holder. Every upload
# of one of these gets face-matched against the traveller's live capture,
# because each is a separate claim about identity — a forger who swaps the
# photo on one document but not another is precisely what per-document
# matching catches.
PHOTO_BEARING_TYPES = {"PASSPORT", "NATIONAL_ID", "DRIVING_LICENSE"}

# Where the verified live capture for each case is kept, so later uploads can
# be matched without asking the traveller to repeat the head-turn sequence.
LIVE_FRAME_NAME = "live_reference.jpg"


def _upload_root() -> str:
    path = os.path.join(current_app.root_path, "uploads")
    os.makedirs(path, exist_ok=True)
    return path


@bp.get("/capabilities")
@login_required
def capabilities():
    """
    Tells the console which pipelines are actually usable right now, so it can
    disable a button instead of letting an officer upload into a 503.
    """
    return ok({
        "passportOcr": is_available(),
        "aadhaarOcr": aadhaar_available(),
        "faceMatch": face_available(),
        "liveness": face_available(),
        "tampering": False,
        "acceptedTypes": sorted(ALLOWED_EXTENSIONS),
        "maxBytes": MAX_BYTES,
        # Which document types carry a photo worth matching against the live
        # capture. Driving licences and permits vary by issuer, so they are
        # attempted and allowed to come back "no face found" without that
        # being treated as a failure.
        "photoBearingTypes": sorted(PHOTO_BEARING_TYPES),
    })


def _case_folder(case_number: str) -> str:
    folder = os.path.join(_upload_root(), case_number)
    os.makedirs(folder, exist_ok=True)
    return folder


def _live_reference_path(case_number: str) -> str | None:
    """The stored centre frame for a case, if liveness has been passed."""
    path = os.path.join(_case_folder(case_number), LIVE_FRAME_NAME)
    return path if os.path.isfile(path) else None


def _save_upload(file_storage, folder: str, name: str) -> str:
    path = os.path.join(folder, name)
    file_storage.save(path)
    return path


@bp.post("/liveness")
@login_required
def liveness():
    """
    multipart/form-data: frameLeft, frameRight, frameCentre, caseId

    Run once per traveller. On success the centre frame is kept as the live
    reference for that case, and every document uploaded afterwards is matched
    against it automatically.
    """
    required = ("frameLeft", "frameRight", "frameCentre")
    missing = [name for name in required if name not in request.files]
    if missing:
        return fail(
            f"Missing capture frames: {', '.join(missing)}.",
            code="missing_frames", status=400,
        )

    case_number = request.form.get("caseId")
    case = Case.query.filter_by(case_number=case_number).first() if case_number else None
    if case_number and case is None:
        return fail(f"No case {case_number}.", code="not_found", status=404)

    folder = _case_folder(case.case_number if case else "unassigned")

    left = _save_upload(request.files["frameLeft"], folder, "frame_left.jpg")
    right = _save_upload(request.files["frameRight"], folder, "frame_right.jpg")
    centre = _save_upload(request.files["frameCentre"], folder, "frame_centre.jpg")

    try:
        result = check_liveness(left, right, centre)
    except FaceUnavailable as exc:
        return fail(str(exc), code="face_unavailable", status=503)
    except Exception as exc:
        current_app.logger.exception("Liveness check failed")
        return fail(f"Liveness check failed: {exc}", code="liveness_failed", status=422)

    officer = current_officer()

    if result["passed"]:
        # Promote the centre frame to the case's live reference.
        import shutil
        shutil.copyfile(centre, os.path.join(folder, LIVE_FRAME_NAME))

    if case:
        record(
            "LIVENESS_PASSED" if result["passed"] else "LIVENESS_FAILED",
            f"{result['message']} Checked by {officer.name}.",
            officer_id=officer.officer_id, case_id=case.case_id,
        )

    return ok(result)


@bp.post("/upload")
@login_required
def upload():
    """
    multipart/form-data:
        file          the image                       (required)
        caseId        case number, e.g. BS-2026-0001  (optional)
        documentType  PASSPORT by default             (optional)
    """
    if "file" not in request.files:
        return fail("No file was attached to the request.", code="no_file", status=400)

    uploaded = request.files["file"]
    if not uploaded.filename:
        return fail("No file was selected.", code="no_file", status=400)

    extension = os.path.splitext(uploaded.filename)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        return fail(
            f"'{extension}' is not a supported image type. "
            f"Use {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
            code="bad_file_type", status=400,
        )

    document_type = (request.form.get("documentType") or "PASSPORT").upper()
    if document_type not in DOCUMENT_TYPES:
        return fail(f"Unknown document type '{document_type}'.", code="bad_type", status=400)

    # --- read and size-check ---------------------------------------------
    # Read into memory once: we need the bytes for the hash anyway, and 20 MB
    # is a safe ceiling for a passport scan.
    payload = uploaded.read()
    if len(payload) > MAX_BYTES:
        return fail("That file is larger than 20 MB.", code="file_too_large", status=413)
    if not payload:
        return fail("That file is empty.", code="empty_file", status=400)

    # --- resolve the case -------------------------------------------------
    case_number = request.form.get("caseId")
    case = Case.query.filter_by(case_number=case_number).first() if case_number else None
    if case_number and case is None:
        return fail(f"No case {case_number}.", code="not_found", status=404)

    # --- store on disk ----------------------------------------------------
    # SHA-256 of the contents, not the filename. Two officers uploading the
    # same scan get the same hash, which makes duplicate detection free later,
    # and a renamed file cannot masquerade as a new one.
    file_hash = hashlib.sha256(payload).hexdigest()

    folder = _case_folder(case.case_number if case else "unassigned")

    # A UUID prefix rather than the original name: two travellers both
    # uploading "passport.jpg" must not overwrite each other. secure_filename
    # also strips path separators, so "../../etc/passwd" cannot escape.
    stored_name = f"{uuid.uuid4().hex}_{secure_filename(uploaded.filename)}"
    stored_path = os.path.join(folder, stored_name)

    with open(stored_path, "wb") as handle:
        handle.write(payload)

    officer = current_officer()

    document = Document(
        case_id=case.case_id if case else None,
        document_type=document_type if document_type != "FACE" else "PASSPORT",
        file_name=uploaded.filename,
        file_path=os.path.relpath(stored_path, current_app.root_path),
        mime_type=uploaded.mimetype,
        file_hash=file_hash,
        upload_status="UPLOADED",
    )
    if case:
        db.session.add(document)
        db.session.flush()

    response = {
        "documentId": document.document_id if case else None,
        "fileName": uploaded.filename,
        "fileHash": file_hash,
        "documentType": document_type,
        "caseId": case.case_number if case else None,
        "ocr": None,
        "verification": None,
        "faceMatch": None,
    }

    # --- face match, for every photo-bearing document ---------------------
    # Runs regardless of which OCR pipeline handles the document below, and
    # regardless of whether that pipeline succeeds: a passport whose MRZ is
    # unreadable can still have its photo compared with the live capture.
    if document_type in PHOTO_BEARING_TYPES and case:
        response["faceMatch"] = _run_face_match(
            stored_path, case, document, officer
        )

    # --- Aadhaar needs both sides before it can be read -------------------
    if document_type == "NATIONAL_ID":
        return _handle_aadhaar(request, folder, stored_path, case, document,
                               officer, response)

    if document_type != "PASSPORT":
        matched = document_type in PHOTO_BEARING_TYPES
        response["note"] = (
            f"{document_type.replace('_', ' ').title()} uploads are stored"
            + (" and face-matched" if matched else "")
            + ", but there is no text-extraction module for them yet."
        )
        if case:
            document.upload_status = "PROCESSED"
            record("DOCUMENT_UPLOADED",
                   f"{document_type} uploaded by {officer.name}.",
                   officer_id=officer.officer_id, case_id=case.case_id,
                   document_id=document.document_id, commit=False)
            db.session.commit()
        return ok(response)

    try:
        if case:
            document.upload_status = "PROCESSING"
            db.session.commit()

        result = read_passport(stored_path)

    except OcrUnavailable as exc:
        if case:
            document.upload_status = "FAILED"
            db.session.commit()
        # 503, not 500: the request was fine, the capability is missing.
        return fail(str(exc), code="ocr_unavailable", status=503)

    except Exception as exc:
        if case:
            document.upload_status = "FAILED"
            db.session.commit()
        current_app.logger.exception("MRZ extraction failed")
        return fail(
            f"Could not read the machine-readable zone: {exc}",
            code="ocr_failed", status=422,
        )

    response["ocr"] = result

    # --- compare with the reference database ------------------------------
    verification = verify_against_database(result["fields"])
    response["verification"] = verification

    # --- persist ----------------------------------------------------------
    if case:
        document.upload_status = "PROCESSED"

        db.session.add(DocumentExtraction(
            document_id=document.document_id,
            extracted_data=result["fields"],
            ocr_confidence=result["confidence"],
            extraction_status="COMPLETED",
        ))

        db.session.add(ValidationResult(
            document_id=document.document_id,
            format_status="PASS" if not result["issues"] else "REVIEW",
            database_status=verification["databaseStatus"],
            validation_status=verification["validationStatus"],
            validation_message=verification["message"][:1000],
        ))

        # Keep the case's subject and nationality in step with what was
        # actually read, but never overwrite something an officer typed.
        if not case.subject_name and result["fields"].get("name"):
            case.subject_name = result["fields"]["name"]
        if not case.nationality and result["fields"].get("nationality"):
            case.nationality = result["fields"]["nationality"]

        record(
            "DOCUMENT_SCANNED",
            f"Passport {result['fields'].get('passport_number') or '?'} read by "
            f"{officer.name}: {verification['validationStatus']}.",
            officer_id=officer.officer_id,
            case_id=case.case_id,
            document_id=document.document_id,
            commit=False,
        )
        db.session.commit()

        response["documentId"] = document.document_id

    return ok(response)


def _run_face_match(image_path, case, document, officer) -> dict | None:
    """
    Compare the photo on this document with the case's live reference.

    Returns None when there is nothing to compare against yet, rather than a
    failure: uploading a passport before doing the liveness capture is a normal
    order of operations, not an error.
    """
    live_reference = _live_reference_path(case.case_number)

    if live_reference is None:
        return {
            "status": "NOT_CHECKED",
            "similarity": None,
            "message": (
                "No live capture on file for this traveller yet. "
                "Run the liveness check, then re-upload to compare faces."
            ),
        }

    try:
        cropped = os.path.join(
            os.path.dirname(image_path),
            f"face_{os.path.basename(image_path)}",
        )

        if not extract_document_face(image_path, cropped):
            return {
                "status": "NOT_CHECKED",
                "similarity": None,
                "message": "No face could be found on this document.",
            }

        result = match_faces(cropped, live_reference)

    except FaceUnavailable as exc:
        return {"status": "NOT_CHECKED", "similarity": None, "message": str(exc)}
    except Exception as exc:
        current_app.logger.exception("Face match failed")
        return {
            "status": "NOT_CHECKED",
            "similarity": None,
            "message": f"Face comparison could not be completed: {exc}",
        }

    if document.document_id:
        db.session.add(FaceVerification(
            document_id=document.document_id,
            face_match_status=result["status"],
            similarity_score=result["similarity"],
            details=result["message"][:1000],
        ))
        record(
            f"FACE_{result['status']}",
            f"{result['message']} Checked by {officer.name}.",
            officer_id=officer.officer_id, case_id=case.case_id,
            document_id=document.document_id, commit=False,
        )

    return result


def _handle_aadhaar(req, folder, stored_path, case, document, officer, response):
    """
    Aadhaar carries different information on each side, so both are needed.

    The front is stored and acknowledged; the extraction only runs once the
    back arrives. Send `side=front` or `side=back` with the upload.
    """
    side = (req.form.get("side") or "front").lower()
    side_path = os.path.join(folder, f"aadhaar_{side}.jpg")

    import shutil
    shutil.copyfile(stored_path, side_path)

    other = "back" if side == "front" else "front"
    other_path = os.path.join(folder, f"aadhaar_{other}.jpg")

    if not os.path.isfile(other_path):
        response["note"] = (
            f"Aadhaar {side} side saved. Upload the {other} side to run the "
            f"extraction — the number is cross-checked between the two."
        )
        if case:
            document.upload_status = "UPLOADED"
            db.session.commit()
        return ok(response)

    front_path = side_path if side == "front" else other_path
    back_path = other_path if side == "front" else side_path

    try:
        if case:
            document.upload_status = "PROCESSING"
            db.session.commit()

        result = read_aadhaar(front_path, back_path)

    except AadhaarUnavailable as exc:
        if case:
            document.upload_status = "FAILED"
            db.session.commit()
        return fail(str(exc), code="aadhaar_unavailable", status=503)
    except Exception as exc:
        if case:
            document.upload_status = "FAILED"
            db.session.commit()
        current_app.logger.exception("Aadhaar extraction failed")
        return fail(f"Could not read the Aadhaar card: {exc}",
                    code="aadhaar_failed", status=422)

    response["ocr"] = result
    response["verification"] = {
        "validationStatus": {"PASS": "VALID", "INCOMPLETE": "REVIEW"}.get(
            result["status"], "REVIEW"
        ),
        "databaseStatus": "NOT_AVAILABLE",
        # Being precise matters here. A PASS means the card was read cleanly and
        # its two sides agree with each other. It is NOT an authentication
        # against UIDAI, and the console must not imply that it is.
        "message": (
            "Card read and internally consistent. Not authenticated against "
            "UIDAI — no such check is wired up."
            if result["status"] == "PASS"
            else " ".join(result["issues"]) or "Needs manual review."
        ),
        "comparisons": [],
        "matchScore": round(result["confidence"] * 100, 1),
    }

    if case:
        document.upload_status = "PROCESSED"
        db.session.add(DocumentExtraction(
            document_id=document.document_id,
            extracted_data=result["fields"],
            ocr_confidence=result["confidence"],
            extraction_status="COMPLETED",
        ))
        db.session.add(ValidationResult(
            document_id=document.document_id,
            format_status="PASS" if result["status"] == "PASS" else "REVIEW",
            database_status="NOT_AVAILABLE",
            validation_status=response["verification"]["validationStatus"],
            validation_message=response["verification"]["message"][:1000],
        ))
        record("DOCUMENT_SCANNED",
               f"Aadhaar read by {officer.name}: {result['status']}.",
               officer_id=officer.officer_id, case_id=case.case_id,
               document_id=document.document_id, commit=False)
        db.session.commit()

    return ok(response)


@bp.get("/<int:document_id>")
@login_required
def get_document(document_id: int):
    document = db.session.get(Document, document_id)
    if document is None:
        return fail("No such document.", code="not_found", status=404)

    payload = document.to_dict()
    payload["validation"] = [r.to_dict() for r in document.validation_results]
    return ok(payload)

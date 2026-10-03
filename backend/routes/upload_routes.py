import os
import uuid
import shutil
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.repositories.conversation_repository import conversation_repository
from backend.utils.logging import logger

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR") or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_MIME_PREFIXES = [
    "application/pdf",
    "image/",
    "text/",
    "audio/",
    "video/",
    "application/json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword"
]

@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    feature: Optional[str] = Form("document"),
    language: Optional[str] = Form("en")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename provided")

    # If no conversation exists yet, create one for this upload
    if not conversation_id or conversation_id.strip() == "":
        conv = conversation_repository.create_conversation(
            feature=feature or "document",
            mode="general",
            language=language or "en"
        )
        conversation_id = conv["id"]
        # Set initial title from file name
        conversation_repository.generate_smart_title(conversation_id, filename=file.filename)
    else:
        # Check if conversation exists
        existing = conversation_repository.get_conversation(conversation_id)
        if not existing:
            conv = conversation_repository.create_conversation(
                feature=feature or "document",
                mode="general",
                language=language or "en"
            )
            conversation_id = conv["id"]
        # Update title if still default
        if existing and existing.get("title") in ["New Conversation", "Conversation"]:
            conversation_repository.generate_smart_title(conversation_id, filename=file.filename)

    # Save file to uploads directory
    ext = os.path.splitext(file.filename)[1]
    safe_name = f"{uuid.uuid4().hex[:10]}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(file_path)
    except Exception as e:
        logger.error(f"Error saving uploaded file {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    mime_type = file.content_type or "application/octet-stream"

    # Add file reference to DB with explicit feature scope
    file_record = conversation_repository.add_file(
        conv_id=conversation_id,
        filename=file.filename,
        file_path=file_path,
        mime_type=mime_type,
        size_bytes=file_size,
        feature=feature
    )

    logger.info(f"File uploaded successfully: {file.filename} ({file_size} bytes) -> {file_path}")
    return file_record

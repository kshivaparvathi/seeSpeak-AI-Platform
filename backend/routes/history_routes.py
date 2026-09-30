from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.repositories.conversation_repository import conversation_repository

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

class CreateConversationRequest(BaseModel):
    feature: str = "chat"
    mode: str = "general"
    language: str = "en"
    title: Optional[str] = None

class UpdateTitleRequest(BaseModel):
    title: str

@router.get("")
def list_conversations(
    q: Optional[str] = Query(None, description="Search term for title or content"),
    feature: Optional[str] = Query(None, description="Filter by feature ID"),
    feature_id: Optional[str] = Query(None, description="Filter by feature ID alias")
):
    selected_feature = feature or feature_id
    return conversation_repository.list_conversations(feature=selected_feature, query=q)

@router.post("")
def create_conversation(req: CreateConversationRequest):
    return conversation_repository.create_conversation(
        feature=req.feature,
        mode=req.mode,
        language=req.language,
        title=req.title
    )

@router.get("/{conv_id}")
def get_conversation(conv_id: str):
    conv = conversation_repository.get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@router.patch("/{conv_id}")
def rename_conversation(conv_id: str, req: UpdateTitleRequest):
    success = conversation_repository.update_title(conv_id, req.title)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found or rename failed")
    return {"status": "success", "title": req.title}

class FavoriteRequest(BaseModel):
    is_favorite: Optional[bool] = None

@router.post("/{conv_id}/favorite")
@router.patch("/{conv_id}/favorite")
def toggle_favorite(conv_id: str, req: Optional[FavoriteRequest] = None):
    requested_state = req.is_favorite if req else None
    result = conversation_repository.toggle_favorite(conv_id, requested_state)
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result

@router.delete("/{conv_id}")
def delete_conversation(conv_id: str):
    success = conversation_repository.delete_conversation(conv_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success", "id": conv_id}

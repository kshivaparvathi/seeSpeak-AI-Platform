import os
import re
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types

from backend.repositories.conversation_repository import conversation_repository, normalize_feature_id
from backend.utils.logging import logger

router = APIRouter(prefix="/api/chat", tags=["chat"])

GEMINI_CANDIDATE_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-lite-latest",
    "gemini-flash-latest"
]

LANGUAGE_PROMPT_INSTRUCTIONS = {
    "te": "Respond naturally in fluent Telugu (తెలుగు). Use authentic Telugu script. Keep programming code, syntax, and technical terms in English while explaining thoroughly in Telugu.",
    "hi": "Respond naturally in fluent Hindi (हिन्दी). Use authentic Devanagari script. Keep programming syntax, variables, and technical terms in English, explaining concepts conversationally in Hindi.",
    "kn": "Respond naturally in Kannada (ಕನ್ನಡ). Use authentic Kannada script. Preserve technical terms and keep programming code unchanged while explaining in Kannada.",
    "mr": "Respond naturally in Marathi (मराठी). Use authentic Devanagari script with proper Marathi grammar and vocabulary. Preserve code and technical terms.",
    "ta": "Respond naturally in fluent Tamil (தமிழ்). Use authentic Tamil script. Keep code and technical terminology intact while explaining concepts clearly in Tamil.",
    "ml": "Respond naturally in fluent Malayalam (മലയാളം). Use authentic Malayalam script. Retain programming code and technical terms in English while explaining in Malayalam.",
    "bn": "Respond naturally in fluent Bengali (বাংলা). Use authentic Bengali script. Retain technical terms and code while explaining in clear Bengali.",
    "gu": "Respond naturally in fluent Gujarati (ગુજરાતી). Use authentic Gujarati script. Keep technical terms and code in English while explaining in Gujarati.",
    "pa": "Respond naturally in fluent Punjabi (ਪੰਜਾਬੀ). Use authentic Gurmukhi script. Retain technical terms in English while explaining in Punjabi.",
    "ur": "Respond naturally in fluent Urdu (اردو). Use authentic Urdu script. Keep code and technical terminology in English while explaining in Urdu.",
    "en": "Respond in clear, natural, professional English."
}

def detect_message_language(text: str, fallback_ui_lang: Optional[str] = "en") -> str:
    """
    Detects language following the user priority rule:
    1. Explicit language requested in query
    2. Character script detection (Telugu, Devanagari, Tamil, Kannada, etc.)
    3. Standard English if Latin text without explicit language request
    4. Fallback UI language only when ambiguous
    """
    if not text:
        return fallback_ui_lang or "en"

    t_lower = text.lower()

    # 1. Explicit request keywords
    if any(k in t_lower for k in ["in telugu", "telugu lo", "telugulo", "తెలుగులో", "తెలుగు"]):
        return "te"
    if any(k in t_lower for k in ["in hindi", "hindi me", "hindime", "हिंदी में", "हिन्दी में", "हिंदी", "हिन्दी"]):
        return "hi"
    if any(k in t_lower for k in ["in kannada", "kannada dalli", "ಕನ್ನಡದಲ್ಲಿ", "ಕನ್ನಡ"]):
        return "kn"
    if any(k in t_lower for k in ["in marathi", "marathi madhye", "मराठीत", "मराठी"]):
        return "mr"
    if any(k in t_lower for k in ["in tamil", "tamilil", "தமிழில்", "தமிழ்"]):
        return "ta"
    if any(k in t_lower for k in ["in malayalam", "malayalamil", "മലയാളത്തിൽ", "മലയാളം"]):
        return "ml"
    if any(k in t_lower for k in ["in bengali", "in bangla", "বাংলায়", "বাংলা"]):
        return "bn"
    if any(k in t_lower for k in ["in gujarati", "ગુજરાતીમાં", "ગુજરાતી"]):
        return "gu"
    if any(k in t_lower for k in ["in punjabi", "ਪੰਜਾਬੀ ਵਿੱਚ", "ਪੰਜਾਬੀ"]):
        return "pa"
    if any(k in t_lower for k in ["in urdu", "اردو میں", "اردو"]):
        return "ur"
    if any(k in t_lower for k in ["in english", "english lo", "english me"]):
        return "en"

    # 2. Character Script Detection
    if re.search(r'[\u0C00-\u0C7F]', text):
        return "te"
    if re.search(r'[\u0C80-\u0CFF]', text):
        return "kn"
    if re.search(r'[\u0B80-\u0BFF]', text):
        return "ta"
    if re.search(r'[\u0D00-\u0D7F]', text):
        return "ml"
    if re.search(r'[\u0980-\u09FF]', text):
        return "bn"
    if re.search(r'[\u0A80-\u0AFF]', text):
        return "gu"
    if re.search(r'[\u0A00-\u0A7F]', text):
        return "pa"
    if re.search(r'[\u0600-\u06FF]', text):
        return "ur"
    if re.search(r'[\u0900-\u097F]', text):
        if any(w in text for w in ["आहे", "नाही", "कसे", "काय", "करावे", "माहिती", "द्या", "सांगा", "स्पष्टीकरण"]) or "ळ" in text:
            return "mr"
        return "hi"

    # 3. Standard Latin text without explicit override -> English!
    if re.search(r'[a-zA-Z]', text):
        return "en"

    return fallback_ui_lang or "en"

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "core", "prompts")

FEATURE_PROMPT_FILES = {
    "main": "main_assistant.md",
    "document-analysis": "document_analysis.md",
    "visual-intelligence": "visual_intelligence.md",
    "ai-interview": "ai_interview.md",
    "customer-support": "customer_support.md",
    "video-audio-review": "video_audio_review.md",
    "data-study": "data_study.md",
}

def get_feature_system_prompt(feature_id: str) -> str:
    canonical = normalize_feature_id(feature_id)
    filename = FEATURE_PROMPT_FILES.get(canonical, "main_assistant.md")
    path = os.path.join(PROMPTS_DIR, filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    return "You are seeSpeak AI, an advanced, specialized multimodal AI assistant."

class ChatMessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    language: Optional[str] = "en"
    feature: Optional[str] = "document-analysis"
    feature_id: Optional[str] = None

def get_gemini_client() -> Optional[genai.Client]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

def build_file_part(file_record: Dict[str, Any]) -> Optional[Any]:
    file_path = file_record.get("file_path")
    mime_type = file_record.get("mime_type", "")
    filename = file_record.get("filename", "")

    if not file_path or not os.path.exists(file_path):
        logger.warning(f"File not found on disk: {file_path}")
        return None

    try:
        # Check size (inline limits up to 20MB)
        size = os.path.getsize(file_path)
        if size > 25 * 1024 * 1024:
            logger.warning(f"File {filename} exceeds inline size limit ({size} bytes)")
            return None

        # Handle text/csv/json/code files directly as text
        if mime_type.startswith("text/") or filename.endswith((".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".html", ".css")):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            return types.Part.from_text(text=f"Attached File [{filename}]:\n{content}")

        # Handle binary files (PDF, Images, Audio) via bytes
        with open(file_path, "rb") as f:
            data = f.read()

        if mime_type == "application/pdf" or filename.lower().endswith(".pdf"):
            return types.Part.from_bytes(data=data, mime_type="application/pdf")
        elif mime_type.startswith("image/"):
            return types.Part.from_bytes(data=data, mime_type=mime_type)
        elif mime_type.startswith("audio/"):
            return types.Part.from_bytes(data=data, mime_type=mime_type)
        else:
            return types.Part.from_bytes(data=data, mime_type=mime_type or "application/octet-stream")

    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")
        return None

@router.post("")
async def send_chat_message(req: ChatMessageRequest):
    req_feature = normalize_feature_id(req.feature_id or req.feature)
    conv = conversation_repository.get_conversation(req.conversation_id) if req.conversation_id else None
    if not conv:
        # Auto-create if not found strictly with the requested feature
        conv = conversation_repository.create_conversation(
            feature=req_feature,
            language=req.language or "en"
        )
        req.conversation_id = conv["id"]

    # Verify conversation feature matches or update to requested feature
    conv_feature = normalize_feature_id(conv.get("feature"))

    # Save user message to database
    conversation_repository.add_message(
        conv_id=req.conversation_id,
        role="user",
        content=req.message
    )

    # Check if we should generate a title
    if conv.get("title") in ["New Conversation", "Conversation", None]:
        attached_files = conv.get("files", [])
        fn = attached_files[0]["filename"] if attached_files else None
        conversation_repository.generate_smart_title(
            conv_id=req.conversation_id,
            first_message=req.message,
            filename=fn
        )

    client = get_gemini_client()
    if not client:
        offline_reply = (
            "I received your message, but the Gemini API key is currently not configured in the backend environment. "
            "Please add `GEMINI_API_KEY` to `.env` to enable real-time multimodal analysis."
        )
        conversation_repository.add_message(req.conversation_id, "assistant", offline_reply)
        return {"response": offline_reply, "conversation_id": req.conversation_id}

    # Build feature-isolated system instruction with intelligent language detection
    feature_prompt = get_feature_system_prompt(conv_feature)
    detected_lang = detect_message_language(req.message, fallback_ui_lang=req.language or conv.get("language", "en"))
    lang_instruction = LANGUAGE_PROMPT_INSTRUCTIONS.get(
        detected_lang,
        f"Respond in clear, natural {detected_lang}."
    )

    system_instruction = (
        f"{feature_prompt}\n\n"
        f"WORKSPACE DOMAIN: {conv_feature.upper()}\n"
        f"TARGET RESPONSE LANGUAGE: {detected_lang.upper()} ({lang_instruction})\n\n"
        "STRICT INSTRUCTIONS:\n"
        "1. MATCH USER QUERY LANGUAGE: Respond primarily in the target language identified above. If the user asked in English (e.g., 'Explain Java'), respond in English. If the user asked in Telugu, respond in Telugu. If the user asked in Hindi, respond in Hindi. Never force an unrequested language.\n"
        "2. COMPLETE CONTEXT ISOLATION: Answer strictly based ONLY on the attached files and conversation history belonging to this specific workspace. Do NOT reference outside materials, past sessions, or other feature domains.\n"
        "3. GROUNDING: If files are attached, analyze and answer strictly based on the actual contents of the uploaded files. Do NOT provide generic 3-step placeholder answers. Give concrete, detailed, accurate explanations.\n"
        "4. SCRIPT FIDELITY: When responding in Indian languages (Telugu, Hindi, Kannada, Marathi, Tamil, Bengali, Malayalam, Gujarati, Punjabi, Urdu), write exclusively in authentic native script.\n"
        "5. CODE PRESERVATION: Preserve programming code, syntax, identifiers, and markdown formatting in original English without translating code snippets.\n"
        "6. QUICK ACTIONS & STUDY ADAPTATION: When requested for Exam Prep, Short Notes, Important Points, Summarize, Step-by-Step, Viva Questions, or Depth Level (Light, Moderate, Detailed), format your response with the exact requested academic structure, bold headings, and grounded bullet points."
    )

    # Build contents strictly with files from THIS conversation only
    contents: List[Any] = []

    # 1. Attach ONLY files for this specific conversation
    attached_files = conv.get("files", [])
    for f_rec in attached_files:
        part = build_file_part(f_rec)
        if part:
            contents.append(part)

    # 2. Add previous conversation history strictly for this conversation
    past_messages = conv.get("messages", [])
    recent_history = past_messages[-10:-1] if len(past_messages) > 1 else []
    for msg in recent_history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))

    # 3. Add current user prompt
    contents.append(types.Part.from_text(text=req.message))

    # Call Gemini with candidate models fallback
    full_response_text = ""
    error_details = []

    for model in GEMINI_CANDIDATE_MODELS:
        try:
            logger.info(f"Generating content for conversation {req.conversation_id} ({conv_feature}) with model: {model}")
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3
            )
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=contents,
                config=config
            )
            full_response_text = response.text or ""
            break
        except Exception as e:
            logger.warning(f"Model {model} failed: {e}")
            error_details.append(f"{model}: {str(e)}")
            await asyncio.sleep(0.5)

    if not full_response_text:
        err_msg = "Error contacting AI service. " + "; ".join(error_details)
        full_response_text = f"I encountered an issue processing your request: {err_msg}"

    # Save assistant response to DB
    conversation_repository.add_message(
        conv_id=req.conversation_id,
        role="assistant",
        content=full_response_text
    )

    return {
        "response": full_response_text,
        "conversation_id": req.conversation_id,
        "feature_id": conv_feature,
        "detected_language": detected_lang
    }

@router.post("/stream")
async def stream_chat_message(req: ChatMessageRequest):
    """Streaming SSE endpoint with feature isolation."""
    req_feature = normalize_feature_id(req.feature_id or req.feature)
    conv = conversation_repository.get_conversation(req.conversation_id) if req.conversation_id else None
    if not conv:
        conv = conversation_repository.create_conversation(
            feature=req_feature,
            language=req.language or "en"
        )
        req.conversation_id = conv["id"]

    conv_feature = normalize_feature_id(conv.get("feature"))

    conversation_repository.add_message(
        conv_id=req.conversation_id,
        role="user",
        content=req.message
    )

    if conv.get("title") in ["New Conversation", "Conversation", None]:
        attached_files = conv.get("files", [])
        fn = attached_files[0]["filename"] if attached_files else None
        conversation_repository.generate_smart_title(
            conv_id=req.conversation_id,
            first_message=req.message,
            filename=fn
        )

    client = get_gemini_client()
    if not client:
        async def fallback_stream():
            msg = "Gemini API key is not configured in backend environment."
            yield f"data: {json.dumps({'text': msg, 'done': True})}\n\n"
        return StreamingResponse(fallback_stream(), media_type="text/event-stream")

    feature_prompt = get_feature_system_prompt(conv_feature)
    detected_lang = detect_message_language(req.message, fallback_ui_lang=req.language or conv.get("language", "en"))
    lang_instruction = LANGUAGE_PROMPT_INSTRUCTIONS.get(
        detected_lang,
        f"Respond in clear, natural {detected_lang}."
    )

    system_instruction = (
        f"{feature_prompt}\n\n"
        f"WORKSPACE DOMAIN: {conv_feature.upper()}\n"
        f"TARGET RESPONSE LANGUAGE: {detected_lang.upper()} ({lang_instruction})\n\n"
        "STRICT INSTRUCTIONS:\n"
        "1. MATCH USER QUERY LANGUAGE: Respond primarily in the target language identified above. If the user asked in English (e.g., 'Explain Java'), respond in English. If the user asked in Telugu, respond in Telugu. If the user asked in Hindi, respond in Hindi. Never force an unrequested language.\n"
        "2. COMPLETE CONTEXT ISOLATION: Answer strictly based ONLY on the attached files and conversation history belonging to this specific workspace. Do NOT reference outside materials or other feature domains.\n"
        "3. GROUNDING: If files are attached, analyze and answer strictly based on the actual contents of the uploaded files. Do NOT provide generic 3-step placeholder answers. Give concrete, detailed, accurate explanations.\n"
        "4. SCRIPT FIDELITY: When responding in Indian languages (Telugu, Hindi, Kannada, Marathi, Tamil, Bengali, Malayalam, Gujarati, Punjabi, Urdu), write exclusively in authentic native script.\n"
        "5. CODE PRESERVATION: Preserve programming code, syntax, identifiers, and markdown formatting in original English without translating code snippets.\n"
        "6. QUICK ACTIONS & STUDY ADAPTATION: When requested for Exam Prep, Short Notes, Important Points, Summarize, Step-by-Step, Viva Questions, or Depth Level (Light, Moderate, Detailed), format your response with the exact requested academic structure, bold headings, and grounded bullet points."
    )

    contents: List[Any] = []
    attached_files = conv.get("files", [])
    for f_rec in attached_files:
        part = build_file_part(f_rec)
        if part:
            contents.append(part)

    past_messages = conv.get("messages", [])
    recent_history = past_messages[-10:-1] if len(past_messages) > 1 else []
    for msg in recent_history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))

    contents.append(types.Part.from_text(text=req.message))

    async def event_generator():
        accumulated_text = []
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3
        )

        success = False
        for model in GEMINI_CANDIDATE_MODELS:
            try:
                logger.info(f"Streaming with model {model} for feature {conv_feature}")
                for chunk in client.models.generate_content_stream(
                    model=model,
                    contents=contents,
                    config=config
                ):
                    if chunk.text:
                        accumulated_text.append(chunk.text)
                        yield f"data: {json.dumps({'text': chunk.text, 'done': False})}\n\n"
                        await asyncio.sleep(0.01)
                success = True
                break
            except Exception as e:
                logger.warning(f"Streaming error with model {model}: {e}")
                await asyncio.sleep(0.5)

        full_text = "".join(accumulated_text)
        if not success:
            err_msg = "Failed to stream response from AI service."
            yield f"data: {json.dumps({'text': err_msg, 'done': True})}\n\n"
            full_text = err_msg

        conversation_repository.add_message(
            conv_id=req.conversation_id,
            role="assistant",
            content=full_text
        )
        yield f"data: {json.dumps({'done': True, 'full_text': full_text, 'feature_id': conv_feature, 'detected_language': detected_lang})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

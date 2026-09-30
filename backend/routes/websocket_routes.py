import os
import json
import asyncio
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.core.event_types import (
    EventType,
    SessionStartEvent,
    SessionReadyEvent,
    AgentSpeakingEvent,
    TurnCompleteEvent,
    InterruptEvent,
    TranscriptEvent,
    ErrorEvent
)
from backend.core.session_manager import session_manager, VoiceSession
from backend.providers.factory import get_realtime_provider
from backend.utils.logging import logger

router = APIRouter(tags=["voice"])

from backend.repositories.conversation_repository import conversation_repository

PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "core", "prompts")

LANGUAGE_NAMES = {
    "en": "English",
    "te": "Telugu",
    "hi": "Hindi",
    "kn": "Kannada",
    "mr": "Marathi",
    "ta": "Tamil",
    "bn": "Bengali",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ja": "Japanese",
}

def load_prompt_for_mode(mode: str, conv_id: Optional[str] = None, language: str = "en") -> str:
    """Loads feature-specific system prompt and injects grounded file context if available."""
    m = (mode or "").lower().strip()
    
    if "doc" in m:
        filename = "document_analysis.md"
    elif "vis" in m or "image" in m:
        filename = "visual_intelligence.md"
    elif "supp" in m or "cust" in m:
        filename = "customer_support.md"
    elif "meet" in m or "video" in m or "audio" in m:
        filename = "video_audio_review.md"
    elif "study" in m or "data" in m:
        filename = "data_study.md"
    else:
        filename = "ai_interview.md"

    filepath = os.path.join(PROMPT_DIR, filename)
    if not os.path.exists(filepath):
        # Fallback to alternate names
        if filename == "ai_interview.md":
            filepath = os.path.join(PROMPT_DIR, "interviewer.md")
        elif filename == "customer_support.md":
            filepath = os.path.join(PROMPT_DIR, "customer_service.md")

    base_prompt = "You are an intelligent, concise, and helpful voice AI assistant."
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            base_prompt = f.read()

    # Append grounded file context if conversation has files attached
    file_context = ""
    if conv_id:
        conv = conversation_repository.get_conversation(conv_id)
        if conv and conv.get("files"):
            file_summaries = []
            for f in conv["files"]:
                fname = f.get("filename", "File")
                fpath = f.get("file_path", "")
                content_snippet = ""
                if os.path.exists(fpath):
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as file_handle:
                            content_snippet = file_handle.read(2000)
                    except Exception:
                        pass
                file_summaries.append(f"--- Document '{fname}' ---\n{content_snippet}")
            if file_summaries:
                file_context = "\n\n### ATTACHED WORKSPACE FILES FOR THIS CONVERSATION:\n" + "\n\n".join(file_summaries)

    quick_actions_guidance = (
        "\n\n### QUICK ACTIONS & SPOKEN INTENT RECOGNITION:\n"
        "When the user asks (either directly or via spoken voice) for actions such as:\n"
        "- 'Explain for Exam': Structure the explanation with definitions, core principles, 2/5/10-mark exam questions, diagrams, and pitfalls.\n"
        "- 'Make Short Notes': Give crisp, bulleted revision notes highlighting formulas and key terms.\n"
        "- 'Extract Important Points': Prioritize core takeaways in ranked order.\n"
        "- 'Detailed' vs 'Light' vs 'Moderate' explanation: Adjust the depth and brevity accordingly.\n"
        "- 'Simple Explanation': Explain using plain language and intuitive analogies (ELI5 format).\n"
        "- 'Summarize Document': Provide an executive summary covering objectives, findings, and conclusions grounded in the attached files.\n"
        "- 'Generate Questions': Provide viva voce and exam questions with model answers.\n"
        "- 'Explain Step-by-Step': Give chronological steps explaining what happens, why, and the resulting output.\n"
        "- 'Create Revision Notes': Provide last-minute cheat sheet with formulas and checklist."
    )

    lang_name = LANGUAGE_NAMES.get(language, "English")
    lang_instruction = (
        f"\n\nVOICE RESPONSE LANGUAGE REQUIREMENT: You MUST speak exclusively and naturally in {lang_name} ({language}). "
        f"Keep your spoken answers concise, engaging, and clear for speech synthesis."
    )

    return f"{base_prompt}{file_context}{quick_actions_guidance}{lang_instruction}"

@router.websocket("/ws/session")
async def websocket_session_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected to /ws/session")

    session: Optional[VoiceSession] = None
    provider = None
    task_a = None
    task_b = None

    try:
        # 1. Handshake: wait for session_start
        init_data = await websocket.receive_text()
        try:
            init_json = json.loads(init_data)
        except Exception:
            await websocket.send_text(ErrorEvent(message="Invalid JSON in initial handshake").model_dump_json())
            await websocket.close()
            return

        if init_json.get("type") != EventType.SESSION_START:
            await websocket.send_text(ErrorEvent(message="Expected session_start event").model_dump_json())
            await websocket.close()
            return

        mode = init_json.get("mode") or init_json.get("feature_id") or "interviewer"
        conv_id = init_json.get("conversation_id")
        language = init_json.get("language", "en")
        voice_mode_override = init_json.get("voice_mode")  # e.g., 'gemini' or 'mock'

        # Create session
        session = session_manager.create_session(mode=mode, conversation_id=conv_id)

        # Load feature & conversation-grounded system prompt
        system_prompt = load_prompt_for_mode(mode, conv_id=conv_id, language=language)

        # Select & initialize provider
        provider, resolved_voice_mode = get_realtime_provider(voice_mode_override)
        try:
            await provider.connect(system_prompt=system_prompt)
        except Exception as e:
            logger.error(f"Failed to connect provider: {e}")
            await websocket.send_text(ErrorEvent(message=f"Voice provider error: {str(e)}").model_dump_json())
            await websocket.close()
            return

        # Send session_ready event
        ready_evt = SessionReadyEvent(
            session_id=session.session_id,
            mode=mode,
            sample_rate=provider.output_sample_rate,
            voice_mode=resolved_voice_mode
        )
        await websocket.send_text(ready_evt.model_dump_json())
        logger.info(f"Sent session_ready for session {session.session_id} (mode={mode}, sample_rate={provider.output_sample_rate})")

        # Task A: Client -> Provider
        async def client_to_provider():
            first_chunk_of_turn = True
            while True:
                try:
                    msg = await websocket.receive()
                except (WebSocketDisconnect, RuntimeError):
                    break
                except Exception as e:
                    logger.warning(f"Error receiving from client websocket: {e}")
                    break

                if "bytes" in msg and msg["bytes"]:
                    audio_chunk = msg["bytes"]
                    if first_chunk_of_turn:
                        session.on_user_speaking()
                        first_chunk_of_turn = False
                    else:
                        session.user_speech_end_time = asyncio.get_event_loop().time()
                    await provider.send_audio(audio_chunk)

                elif "text" in msg and msg["text"]:
                    try:
                        data = json.loads(msg["text"])
                        evt_type = data.get("type")
                        if evt_type == "user_speaking":
                            session.on_user_speaking()
                            first_chunk_of_turn = False
                        elif evt_type == "user_silent":
                            session.on_user_silent()
                            first_chunk_of_turn = True
                        elif evt_type == "interrupt":
                            session.on_interrupt()
                            first_chunk_of_turn = True
                    except Exception as e:
                        logger.warning(f"Error parsing client text event: {e}")

        # Task B: Provider -> Client
        async def provider_to_client():
            is_first_audio_chunk = True
            async for item in provider.receive():
                if isinstance(item, bytes):
                    # Raw PCM16 24kHz audio chunk from agent
                    if is_first_audio_chunk:
                        is_first_audio_chunk = False
                        latency_ms = session.on_agent_speaking()
                        # Send agent_speaking with calculated latency
                        speak_evt = AgentSpeakingEvent(latency=latency_ms)
                        await websocket.send_text(speak_evt.model_dump_json())
                        if latency_ms:
                            logger.info(f"Agent speaking latency: {latency_ms} ms")

                    # Send binary audio frame
                    await websocket.send_bytes(item)

                elif isinstance(item, dict):
                    t = item.get("type")
                    if t == "interrupted":
                        is_first_audio_chunk = True
                        session.on_interrupt()
                        interrupt_evt = InterruptEvent()
                        await websocket.send_text(interrupt_evt.model_dump_json())
                        logger.info("Sent interrupt event to client")

                    elif t == "turn_complete":
                        is_first_audio_chunk = True
                        session.on_turn_complete()
                        complete_evt = TurnCompleteEvent()
                        await websocket.send_text(complete_evt.model_dump_json())
                        logger.info("Sent turn_complete event to client")

                    elif t == "input_transcript":
                        text = item.get("text", "")
                        is_final = item.get("is_final", False)
                        session.add_transcript("user", text, is_final)
                        evt = TranscriptEvent(role="user", text=text, is_final=is_final)
                        await websocket.send_text(evt.model_dump_json())
                        if is_final and text and conv_id:
                            try:
                                conversation_repository.add_message(conv_id, "user", f"🎤 Spoken: {text}")
                            except Exception as e:
                                logger.warning(f"Failed to record spoken user message: {e}")

                    elif t == "output_transcript":
                        text = item.get("text", "")
                        is_final = item.get("is_final", False)
                        session.add_transcript("agent", text, is_final)
                        evt = TranscriptEvent(role="agent", text=text, is_final=is_final)
                        await websocket.send_text(evt.model_dump_json())
                        if is_final and text and conv_id:
                            try:
                                conversation_repository.add_message(conv_id, "assistant", text)
                            except Exception as e:
                                logger.warning(f"Failed to record spoken agent message: {e}")

                    elif t == "error":
                        err_evt = ErrorEvent(message=item.get("message", "Provider error"))
                        await websocket.send_text(err_evt.model_dump_json())

        # Run concurrent tasks
        task_a = asyncio.create_task(client_to_provider())
        task_b = asyncio.create_task(provider_to_client())

        done, pending = await asyncio.wait(
            [task_a, task_b],
            return_when=asyncio.FIRST_COMPLETED
        )

        for p in pending:
            p.cancel()

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client")
    except asyncio.CancelledError:
        logger.info("WebSocket tasks cancelled")
    except Exception as e:
        logger.error(f"WebSocket session exception: {e}")
        try:
            await websocket.send_text(ErrorEvent(message=str(e)).model_dump_json())
        except Exception:
            pass
    finally:
        if task_a and not task_a.done():
            task_a.cancel()
        if task_b and not task_b.done():
            task_b.cancel()
        if provider:
            await provider.close()
        if session:
            session_manager.remove_session(session.session_id)
        logger.info("Cleaned up WebSocket session")

import os
import asyncio
from typing import AsyncIterator, Union, Dict, Any, Optional
from google import genai
from google.genai import types

from backend.providers.base import BaseRealtimeProvider
from backend.utils.logging import logger

GEMINI_LIVE_CANDIDATE_MODELS = [
    "gemini-2.5-flash-native-audio-latest",
    "gemini-3.8-live",
    "gemini-3.1-flash-live-preview"
]

class GeminiLiveProvider(BaseRealtimeProvider):
    """
    Realtime bidirectional provider utilizing the official Google GenAI Live API.
    Handles PCM16 16kHz audio input and 24kHz audio output with live transcription.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is required for GeminiLiveProvider")
        self.client = genai.Client(api_key=self.api_key)
        self._session_ctx = None
        self._session = None
        self._connected = False
        self.output_sample_rate = 24000

    async def connect(self, system_prompt: str, voice_name: str = "Puck") -> None:
        """Connects to the best available Gemini Live model."""
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(parts=[types.Part.from_text(text=system_prompt)]),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
                )
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig()
        )

        last_error = None
        for model in GEMINI_LIVE_CANDIDATE_MODELS:
            try:
                logger.info(f"Connecting to Gemini Live with model: {model}")
                self._session_ctx = self.client.aio.live.connect(model=model, config=config)
                self._session = await self._session_ctx.__aenter__()
                self._connected = True
                logger.info(f"Successfully connected to Gemini Live model: {model}")
                return
            except Exception as e:
                logger.warning(f"Failed to connect to model {model}: {e}")
                last_error = e

        raise RuntimeError(f"Unable to connect to any Gemini Live models: {last_error}")

    async def send_audio(self, audio_data: bytes) -> None:
        """Sends a 16kHz PCM16 chunk to Gemini."""
        if not self._connected or not self._session:
            return
        try:
            await self._session.send_realtime_input(
                audio=types.Blob(data=audio_data, mime_type="audio/pcm;rate=16000")
            )
        except Exception as e:
            logger.error(f"Error sending audio to Gemini Live: {e}")

    async def receive(self) -> AsyncIterator[Union[bytes, Dict[str, Any]]]:
        """Yields audio chunks, transcripts, interruptions, and turn completion signals."""
        if not self._connected or not self._session:
            return

        try:
            async for message in self._session.receive():
                sc = message.server_content
                if not sc:
                    continue

                if getattr(sc, "interrupted", False):
                    logger.info("Gemini Live reported user interruption")
                    yield {"type": "interrupted"}

                # User speech transcription
                if getattr(sc, "input_transcription", None) and sc.input_transcription.text:
                    yield {
                        "type": "input_transcript",
                        "text": sc.input_transcription.text,
                        "is_final": True
                    }
                elif getattr(sc, "interim_input_transcription", None) and sc.interim_input_transcription.text:
                    yield {
                        "type": "input_transcript",
                        "text": sc.interim_input_transcription.text,
                        "is_final": False
                    }

                # Agent speech transcription
                if getattr(sc, "output_transcription", None) and sc.output_transcription.text:
                    yield {
                        "type": "output_transcript",
                        "text": sc.output_transcription.text,
                        "is_final": True
                    }

                # Audio parts and text
                if getattr(sc, "model_turn", None) and sc.model_turn.parts:
                    for part in sc.model_turn.parts:
                        if getattr(part, "inline_data", None) and part.inline_data.data:
                            yield part.inline_data.data
                        elif getattr(part, "text", None):
                            # In case model sends textual thoughts or subtitles
                            yield {
                                "type": "output_transcript",
                                "text": part.text,
                                "is_final": False
                            }

                if getattr(sc, "turn_complete", False):
                    yield {"type": "turn_complete"}

        except asyncio.CancelledError:
            logger.info("Gemini Live receive loop cancelled")
        except Exception as e:
            logger.error(f"Error in Gemini Live receive loop: {e}")
            yield {"type": "error", "message": str(e)}

    async def close(self) -> None:
        """Closes session cleanly."""
        self._connected = False
        if self._session_ctx:
            try:
                await self._session_ctx.__aexit__(None, None, None)
            except Exception as e:
                logger.warning(f"Error exiting Gemini Live context: {e}")
            self._session_ctx = None
            self._session = None
        logger.info("Gemini Live session closed")

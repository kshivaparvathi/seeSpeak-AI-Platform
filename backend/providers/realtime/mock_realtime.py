import math
import struct
import asyncio
from typing import AsyncIterator, Union, Dict, Any
from backend.providers.base import BaseRealtimeProvider
from backend.utils.logging import logger

class MockRealtimeProvider(BaseRealtimeProvider):
    """
    Mock realtime voice provider for offline testing or when no API key is provided.
    Generates synthetic PCM16 audio and mock transcripts.
    """

    def __init__(self):
        self._connected = False
        self.output_sample_rate = 24000
        self._queue = asyncio.Queue()
        self._system_prompt = ""
        self._closed = False

    async def connect(self, system_prompt: str, voice_name: str = "Puck") -> None:
        self._system_prompt = system_prompt
        self._connected = True
        self._closed = False
        logger.info("Connected to MockRealtimeProvider")

    async def send_audio(self, audio_data: bytes) -> None:
        """Receives audio from client and queues a mock reply after brief accumulation."""
        if not self._connected or self._closed:
            return
        # If queue is empty, trigger a mock response turn
        if self._queue.empty():
            await self._queue.put({"trigger": True})

    def _generate_tone(self, duration_sec: float = 0.5, freq: float = 440.0) -> bytes:
        """Generates a pleasant 24kHz 16-bit mono sine wave with envelope."""
        sample_rate = self.output_sample_rate
        num_samples = int(sample_rate * duration_sec)
        audio_bytes = bytearray()
        for i in range(num_samples):
            # Smooth fade in and out envelope
            env = min(1.0, i / (sample_rate * 0.05)) * min(1.0, (num_samples - i) / (sample_rate * 0.05))
            sample = int(32767 * 0.2 * env * math.sin(2 * math.pi * freq * (i / sample_rate)))
            audio_bytes.extend(struct.pack('<h', sample))
        return bytes(audio_bytes)

    async def receive(self) -> AsyncIterator[Union[bytes, Dict[str, Any]]]:
        while self._connected and not self._closed:
            try:
                # Wait for trigger or audio activity
                msg = await asyncio.wait_for(self._queue.get(), timeout=2.0)
                if not msg:
                    continue

                # Mock User Transcript
                yield {
                    "type": "input_transcript",
                    "text": "Hello, I am testing the seeSpeak voice agent.",
                    "is_final": True
                }
                await asyncio.sleep(0.3)

                # Mock Agent Transcript
                yield {
                    "type": "output_transcript",
                    "text": "Hello! I am seeSpeak AI in mock voice mode. Please configure your Gemini API key for live real-time conversations.",
                    "is_final": True
                }

                # Yield audio tones (two gentle chimes)
                yield self._generate_tone(duration_sec=0.3, freq=440.0)
                await asyncio.sleep(0.15)
                yield self._generate_tone(duration_sec=0.4, freq=554.37) # C#5
                await asyncio.sleep(0.3)

                # Signal turn complete
                yield {"type": "turn_complete"}

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in MockRealtimeProvider: {e}")
                yield {"type": "error", "message": str(e)}
                break

    async def close(self) -> None:
        self._connected = False
        self._closed = True
        logger.info("Closed MockRealtimeProvider")

import os
from typing import Tuple
from backend.providers.base import BaseRealtimeProvider
from backend.providers.realtime.gemini_live import GeminiLiveProvider
from backend.providers.realtime.mock_realtime import MockRealtimeProvider
from backend.utils.logging import logger

def get_realtime_provider(voice_mode_override: str = None) -> Tuple[BaseRealtimeProvider, str]:
    """
    Factory function to select and instantiate the appropriate real-time provider.
    Returns (provider_instance, mode_name: 'gemini' | 'mock').
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    voice_mode = (voice_mode_override or os.getenv("VOICE_MODE", "gemini")).lower().strip()

    if voice_mode == "mock" or not api_key:
        logger.info("Using MockRealtimeProvider (VOICE_MODE=mock or GEMINI_API_KEY missing)")
        return MockRealtimeProvider(), "mock"

    try:
        provider = GeminiLiveProvider(api_key=api_key)
        logger.info("Using GeminiLiveProvider with official Google GenAI Live API")
        return provider, "gemini"
    except Exception as e:
        logger.warning(f"Failed to initialize GeminiLiveProvider ({e}), falling back to MockRealtimeProvider")
        return MockRealtimeProvider(), "mock"

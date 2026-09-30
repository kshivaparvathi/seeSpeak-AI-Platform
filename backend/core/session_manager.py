import time
import uuid
from typing import Optional, Dict, Any, List
from backend.utils.logging import logger

class VoiceSession:
    def __init__(self, mode: str = "interviewer", conversation_id: Optional[str] = None):
        self.session_id: str = f"sess_{uuid.uuid4().hex[:12]}"
        self.mode: str = mode
        self.conversation_id: str = conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
        self.state: str = "idle"  # idle, listening, agent_speaking
        self.user_speech_start_time: Optional[float] = None
        self.user_speech_end_time: Optional[float] = None
        self.agent_speech_start_time: Optional[float] = None
        self.last_latency_ms: Optional[int] = None
        self.transcript_history: List[Dict[str, Any]] = []

    def on_user_speaking(self):
        """Called when user starts speaking or sends an audio packet after silence."""
        now = time.time()
        self.state = "listening"
        if self.user_speech_start_time is None:
            self.user_speech_start_time = now
        self.user_speech_end_time = now

    def on_user_silent(self):
        """Marks the end of user speech."""
        self.user_speech_end_time = time.time()

    def on_agent_speaking(self) -> Optional[int]:
        """
        Called when the first audio chunk from the agent arrives for a turn.
        Calculates and returns latency in milliseconds from the end of user speech.
        """
        self.state = "agent_speaking"
        now = time.time()
        self.agent_speech_start_time = now
        
        latency_ms = None
        if self.user_speech_end_time:
            latency_ms = int((now - self.user_speech_end_time) * 1000)
            # Bound latency to reasonable non-negative values
            latency_ms = max(50, min(latency_ms, 5000))
            self.last_latency_ms = latency_ms
        
        # Reset user speech timers for the next turn
        self.user_speech_start_time = None
        self.user_speech_end_time = None
        return latency_ms

    def on_turn_complete(self):
        """Called when the current agent turn is finished."""
        self.state = "idle"
        self.agent_speech_start_time = None

    def on_interrupt(self):
        """Called when user interrupts agent playback."""
        self.state = "listening"
        self.user_speech_start_time = time.time()
        self.user_speech_end_time = time.time()
        self.agent_speech_start_time = None

    def add_transcript(self, role: str, text: str, is_final: bool = False):
        self.transcript_history.append({
            "role": role,
            "text": text,
            "is_final": is_final,
            "timestamp": time.time()
        })

class SessionManager:
    def __init__(self):
        self._sessions: Dict[str, VoiceSession] = {}

    def create_session(self, mode: str = "interviewer", conversation_id: Optional[str] = None) -> VoiceSession:
        session = VoiceSession(mode=mode, conversation_id=conversation_id)
        self._sessions[session.session_id] = session
        logger.info(f"Created voice session: {session.session_id} (mode={mode})")
        return session

    def get_session(self, session_id: str) -> Optional[VoiceSession]:
        return self._sessions.get(session_id)

    def remove_session(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Removed voice session: {session_id}")

session_manager = SessionManager()

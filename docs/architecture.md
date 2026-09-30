# seeSpeak AI — Technical Architecture & Specification

## 1. Overview
**seeSpeak AI** is a production-quality, low-latency Real-Time Voice + Multimodal Grounded AI application. It provides two major experiences:
1. **Real-time Voice Agent**: Bidirectional WebSocket audio streaming (`/ws/session`), conversational barge-in interruptions, live synchronized transcripts, real-time latency measurement, and specialized personas (`/interview` and `/support`).
2. **Universal Multimodal Workspace**: Six dedicated feature workspaces (`/feature/document`, `/feature/vision`, `/interview`, `/support`, `/feature/meeting`, `/feature/study`), true grounded document & image understanding using Google Gemini with rate-limit fallbacks, SQLite persistence, and 11+ authentic native script languages.

---

## 2. Audio Contract & Streaming Architecture

```
[ Browser Microphone ]
         │ (getUserMedia 16kHz mono)
         ▼
[ AudioWorklet / ScriptProcessor ]
         │ (PCM16 LE 20-40ms chunks)
         ▼ Binary WS Frame
[ Backend /ws/session ]
         │ (Task A: client_to_provider)
         ▼ Blob: audio/pcm;rate=16000
[ Google GenAI Live API Session ]
  Model: gemini-2.5-flash-native-audio-latest
         ▲▼ (Bidirectional streaming)
[ Gemini Live Server Content ]
         │ (Model turn parts: audio/pcm;rate=24000)
         ▼ (Task B: provider_to_client)
[ Backend /ws/session ]
         │ Binary WS Frame (PCM16 24kHz)
         ▼
[ Frontend useAudioPlayback ]
         │ (Web Audio API gapless buffer queue)
         ▼
[ Browser Speakers ]
```

### Specifications:
* **Browser $\rightarrow$ Backend:**
  * Encoding: PCM16 (16-bit signed integer, Little-Endian)
  * Channels: 1 (mono)
  * Sampling Rate: 16,000 Hz
  * Chunk Duration: 20–64 ms
  * Transport: Binary WebSocket frames
* **Backend $\rightarrow$ Browser:**
  * Encoding: PCM16 (16-bit signed integer, Little-Endian)
  * Channels: 1 (mono)
  * Sampling Rate: 24,000 Hz (advertised dynamically via `session_ready.sample_rate`)
  * Transport: Binary WebSocket frames
* **Control & Transcript Plane:**
  * Transport: Text WebSocket frames formatted as JSON

---

## 3. WebSocket Event Protocol (`/ws/session`)

| Event Type | Direction | Payload Example / Description |
| :--- | :--- | :--- |
| `session_start` | Client $\rightarrow$ Server | `{"type": "session_start", "mode": "interviewer", "voice_mode": "gemini"}` |
| `session_ready` | Server $\rightarrow$ Client | `{"type": "session_ready", "session_id": "sess_123", "mode": "interviewer", "sample_rate": 24000, "voice_mode": "gemini"}` |
| `user_speaking` | Client $\rightarrow$ Server / Bidirectional | Indicates user microphone voice activity |
| `agent_speaking`| Server $\rightarrow$ Client | `{"type": "agent_speaking", "latency": 742}` (milliseconds from speech end to first audio) |
| `turn_complete` | Server $\rightarrow$ Client | `{"type": "turn_complete"}` |
| `interrupt`     | Server $\rightarrow$ Client | `{"type": "interrupt"}` (instant barge-in signal to halt audio playback) |
| `transcript`    | Server $\rightarrow$ Client | `{"type": "transcript", "role": "user" \| "agent", "text": "...", "is_final": bool}` |
| `error`         | Server $\rightarrow$ Client | `{"type": "error", "message": "..."}` |

---

## 4. Barge-In / Interruption Flow

When the user speaks while the AI audio is playing:
1. Gemini Live VAD detects user input and emits an interruption signal (`server_content.interrupted = true`).
2. The backend immediately forwards `{"type": "interrupt"}` to the client WebSocket.
3. The frontend immediately executes `audioPlayback.stop()`:
   * Current playing `AudioBufferSourceNode` is stopped and disconnected.
   * Queued audio buffers are purged.
   * Playback schedule is reset.
4. The user seamlessly continues speaking without hearing overlapping audio.

---

## 5. Latency Measurement Flow

* Latency is defined as: `Time when user finished speaking` $\rightarrow$ `Time when first AI audio chunk arrives`.
* When user speech finishes, timestamp $T_{end}$ is recorded.
* When the first audio chunk from Gemini arrives, timestamp $T_{first}$ is recorded.
* Measured latency: $L = (T_{first} - T_{end}) \times 1000 \text{ ms}$.
* Backend dispatches `{"type": "agent_speaking", "latency": L}`.
* Frontend `LatencyBadge.tsx` displays the exact measured latency (e.g., `742 ms`).

---

## 6. Multimodal Analysis & File Grounding

```
[ Uploaded File (PDF, Image, Video, Audio, Data) ]
                       │
                       ▼
[ Backend Storage: backend/uploads/<uuid>_<filename> ]
                       │
                       ▼
[ SQLite: conversation_files ]
                       │
                       ▼
[ Multimodal Query to Gemini ]
   Inline Binary Parts (PDF bytes, image bytes)
   + Text/Data Content
   + Multi-turn Chat History (Context Memory)
   + Script Fidelity Rules (Kannada, Marathi, Telugu, Hindi, etc.)
                       │
                       ▼
[ Grounded Response Streamed via SSE (/api/chat/stream) ]
                       │
                       ▼
[ Persisted in SQLite & Rendered in Chat UI ]
```

### Rate-Limit Fallback Strategy:
To guarantee continuous uptime on Google AI Studio quotas, the backend dynamically tries candidate models with exponential backoff on 429/503:
1. `gemini-flash-lite-latest`
2. `gemini-flash-latest`
3. `gemini-3.5-flash`
4. `gemini-3.5-flash-lite`
5. `gemini-3.8-flash`

---

## 7. Storage & Persistence Schema (`backend/see_speak.db`)

* **`conversations`**:
  * `id` (TEXT PRIMARY KEY)
  * `title` (TEXT)
  * `feature` (TEXT)
  * `mode` (TEXT)
  * `language` (TEXT)
  * `created_at` (TEXT ISO 8601)
  * `updated_at` (TEXT ISO 8601)
* **`messages`**:
  * `id` (TEXT PRIMARY KEY)
  * `conversation_id` (TEXT REFERENCES conversations(id) ON DELETE CASCADE)
  * `role` (TEXT: `'user'` | `'assistant'`)
  * `content` (TEXT)
  * `created_at` (TEXT ISO 8601)
* **`conversation_files`**:
  * `id` (TEXT PRIMARY KEY)
  * `conversation_id` (TEXT REFERENCES conversations(id) ON DELETE CASCADE)
  * `filename` (TEXT)
  * `file_path` (TEXT)
  * `mime_type` (TEXT)
  * `size_bytes` (INTEGER)
  * `created_at` (TEXT ISO 8601)

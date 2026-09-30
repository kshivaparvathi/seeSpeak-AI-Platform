# 🎙️ seeSpeak AI — Real-Time Multimodal Voice & Multilingual Workspaces

seeSpeak AI is a modern full-stack application featuring **Real-Time Gemini Live Voice (24kHz)**, **6 Specialized Isolated Workspaces**, **Context-Grounded Document & Visual Intelligence**, and **11 Academic & Study Quick Actions** with full multi-language native script support.

---

## 🚀 Key Features

### 1. 🎙️ Real-Time Gemini Live Voice Pipeline
* **Official Google GenAI Live API**: Powered by `gemini-2.5-flash-native-audio-latest` with sub-second voice latency.
* **AudioWorklet Hardware Resampling**: Real-time browser audio downsampling to 16kHz PCM16 (`audio-recorder-worklet.js`) with ScriptProcessor fallback.
* **True Barge-In (Interruption)**: Speaking into your microphone immediately ceases AI voice playback and resets state.
* **Audio-Reactive Physics Orb**: 3D animated `VoiceOrb` that pulses with real RMS audio amplitude.
* **Persistent Voice Transcripts**: Every spoken query and spoken AI response is saved directly into conversation history.
* **Inline Speech Dictation**: Voice-to-text directly in the message composer.

### 2. 🏛️ Six Specialized Isolated Workspaces
Each workspace has isolated context, dedicated file storage, and specialized system prompts:
1. 📄 **Document Analysis** (`/document-analysis`) — PDF extraction, research synthesis, and grounded textual question answering.
2. 🖼️ **Visual Intelligence** (`/visual-intelligence`) — UI debugging, diagram comprehension, and image analysis.
3. 🎙️ **AI Interview Coach** (`/ai-interview`) — Real-time conversational mock interviews with live voice scoring.
4. 🎧 **Customer Support AI** (`/customer-support`) — Technical troubleshooting, policy queries, and customer service.
5. 🎥 **Video & Audio Review** (`/video-audio-review`) — Meeting summarization, lecture notes, and transcription analysis.
6. 📊 **Data & Study Master** (`/data-study`) — Dataset analysis, statistical summaries, and structured academic study.

### 3. ⚡ 11 Academic & Study Quick Actions
Context-aware prompts grounded directly on uploaded files:
* 📘 **Explain for Exam**: Definitions, principles, 2/5/10-mark breakdowns, diagram references, and pitfalls.
* 📝 **Make Short Notes**: High-yield revision notes with bold key terms, formulas, and memory recap.
* ⭐ **Extract Important Points**: Prioritized core takeaways and critical findings in ranked order.
* 📖 **Detailed Explanation**: Exhaustive architectural/theoretical deep-dive.
* ⚡ **Quick / Light Explanation**: Fast 2-minute overview of core concepts.
* 🎯 **Moderate Explanation**: Balanced overview with practical examples.
* 💡 **Simple Explanation**: ELI5 plain language with intuitive analogies.
* 🔍 **Summarize Document**: Executive summary covering objectives, methodologies, and findings.
* ❓ **Generate Questions (Exam / Viva)**: Short conceptual questions, analytical problems, and rapid-fire viva voce questions with model answers.
* 🧠 **Explain Step-by-Step**: Chronological step breakdown (What, Why, Output).
* 📋 **Create Revision Notes**: Last-minute cheat sheet with formulas, tables, and checklist.

### 4. 🌐 Native Script Multilingual Support
Full prompt instruction and voice response support for:
* **English**
* **Telugu (తెలుగు)**
* **Hindi (हिन्दी)**
* **Kannada (ಕನ್ನಡ)**
* **Marathi (मराठी)**
* **Tamil (தமிழ்)**
* **Malayalam (മലയാളം)**
* **Bengali (বাংলা)**
* **Gujarati (ગુજરાતી)**
* **Punjabi (ਪੰਜਾਬੀ)**
* **Urdu (اردو)**

---

## 🛠️ Architecture

```
Frontend (React + Vite + TypeScript + Tailwind CSS)
  ├── AudioWorklet Processor (16kHz PCM16 Downsampling)
  ├── Web Audio Playback (24kHz native buffer streaming)
  ├── QuickActionsMenu (Grounded exam & study prompting)
  └── Single-Page Application (direct Main Dashboard root)
       │
       ▼
Backend (FastAPI + Python 3.10+)
  ├── /ws/session: Bidirectional WebSocket real-time audio pipeline
  ├── /api/chat: SSE streaming chat & Gemini multimodal grounding
  ├── /api/upload: Multipart document & media ingestion
  ├── /api/conversations: SQLite persistence with Favorites & Isolation
  └── Static SPA serving on Port 8000
       │
       ▼
Google GenAI Services
  ├── Gemini Live API (gemini-2.5-flash-native-audio-latest)
  └── Gemini Multimodal (gemini-flash-latest / gemini-3.5-flash)
```

---

## 📦 Setup & Run

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key

### 2. Configure Environment Variables
Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```
Add your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
VOICE_MODE=gemini
```

### 3. Install Dependencies
```bash
# Backend
pip install -r backend/requirements.txt

# Frontend
cd frontend
npm install
npm run build
cd ..
```

### 4. Start the Application
Run the backend server (serves both API, WebSockets, and frontend):
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Open **http://localhost:8000** in your browser.

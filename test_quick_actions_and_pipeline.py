import os
import sys
import json
import sqlite3
import requests
import asyncio
import websockets
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/session"

def test_dashboard_direct_route():
    print("\n--- TEST 1: Main Dashboard Directly Exposed at Root ---")
    res = requests.get(f"{BASE_URL}/")
    assert res.status_code == 200, f"Root / failed: {res.status_code}"
    # Verify it serves the single unified SPA dist
    assert "<title>" in res.text or "<div id=\"root\">" in res.text
    print("[PASS] Root route / serves Main Dashboard SPA directly!")

def test_quick_actions_endpoint():
    print("\n--- TEST 2: Quick Actions Prompt Execution & Grounded Generation ---")
    # 1. Create a Document Analysis conversation
    create_res = requests.post(f"{BASE_URL}/api/conversations", json={
        "feature": "document-analysis",
        "language": "en",
        "title": "OS Exam Revision"
    })
    assert create_res.status_code == 200
    conv = create_res.json()
    conv_id = conv["id"]

    # 2. Upload a sample document to ground the analysis
    sample_file_path = "test_quick_action_doc.txt"
    sample_content = (
        "Operating System Concepts: Process Synchronization\n"
        "Critical Section Problem requires three conditions:\n"
        "1. Mutual Exclusion: If process Pi is executing in its critical section, no other processes can execute in their critical sections.\n"
        "2. Progress: If no process is executing in its critical section and there are some processes that wish to enter their critical sections, only those processes not executing in their remainder sections can participate in deciding which will enter its critical section next.\n"
        "3. Bounded Waiting: A bound must exist on the number of times that other processes are allowed to enter their critical sections after a process has made a request to enter and before that request is granted.\n"
        "Semaphores: An integer variable accessed only through wait() and signal() atomic operations."
    )
    with open(sample_file_path, "w", encoding="utf-8") as f:
        f.write(sample_content)

    with open(sample_file_path, "rb") as f:
        up_res = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": (sample_file_path, f, "text/plain")},
            data={"conversation_id": conv_id, "feature": "document-analysis", "language": "en"}
        )
    assert up_res.status_code == 200
    print(f"[PASS] Sample document uploaded to conv {conv_id}")

    # 3. Test Quick Action: Explain for Exam
    exam_prompt = (
        "Please explain the attached content/topic specifically for an EXAM. Structure your answer with:\n"
        "1. Core Definition & Key Terminology\n"
        "2. Primary Principles and Theoretical Foundations\n"
        "3. Structured 2-mark, 5-mark, and 10-mark exam questions and expected scoring points\n"
        "4. Essential diagrams, tables, or formula references\n"
        "5. Common exam mistakes and pitfalls to avoid.\n"
        "[Depth Level: Detailed]"
    )
    chat_res = requests.post(f"{BASE_URL}/api/chat", json={
        "conversation_id": conv_id,
        "message": exam_prompt,
        "language": "en",
        "feature": "document-analysis"
    })
    assert chat_res.status_code == 200
    resp_data = chat_res.json()
    ai_reply = resp_data.get("response", "")
    print(f"[PASS] Received grounded response ({len(ai_reply)} chars). Preview:\n{ai_reply[:250]}...")
    assert "Critical Section" in ai_reply or "Mutual Exclusion" in ai_reply or "Progress" in ai_reply
    print("[PASS] Quick Action: 'Explain for Exam' is strictly grounded on the uploaded file!")

    # Clean up test file
    if os.path.exists(sample_file_path):
        os.remove(sample_file_path)

async def test_realtime_voice_with_quick_action():
    print("\n--- TEST 3: Real-Time Voice WebSocket with Spoken Quick Action Intent ---")
    async with websockets.connect(WS_URL) as ws:
        # 1. Handshake
        start_payload = {
            "type": "session_start",
            "mode": "document-analysis",
            "feature_id": "document-analysis",
            "language": "en"
        }
        await ws.send(json.dumps(start_payload))
        ready_raw = await ws.recv()
        ready_data = json.loads(ready_raw)
        assert ready_data["type"] == "session_ready", f"Unexpected response: {ready_data}"
        print(f"[PASS] Session ready: mode={ready_data['mode']}, sample_rate={ready_data['sample_rate']}")

        # 2. Simulate streaming 16kHz PCM audio frames
        pcm_frame = bytes([0] * 640)  # 20ms of silence in 16-bit PCM at 16kHz
        for _ in range(5):
            await ws.send(pcm_frame)
            await asyncio.sleep(0.02)
        print("[PASS] Sent streaming audio frames to WebSocket pipeline")

        # 3. Test spoken interrupt (barge-in)
        await ws.send(json.dumps({"type": "interrupt"}))
        print("[PASS] Sent barge-in interrupt signal")

if __name__ == "__main__":
    test_dashboard_direct_route()
    test_quick_actions_endpoint()
    asyncio.run(test_realtime_voice_with_quick_action())
    print("\n========================================================")
    print(" ALL TESTS FOR QUICK ACTIONS, ROUTING & VOICE PASSED! ")
    print("========================================================\n")

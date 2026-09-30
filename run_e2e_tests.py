import urllib.request
import json
import websockets
import asyncio

async def run_e2e_tests():
    print("==============================================")
    print("  SEESPEAK AI - COMPREHENSIVE E2E VALIDATION  ")
    print("==============================================")

    # Test 1: Health
    req = urllib.request.Request("http://127.0.0.1:8000/api/health")
    with urllib.request.urlopen(req) as resp:
        health = json.loads(resp.read().decode())
        print("[PASS] Health check:", health)
        assert health["status"] == "online"
        assert health["has_gemini_key"] is True

    # Test 2: Voice WebSocket (Interviewer Mode with Gemini Live)
    print("\nTesting WebSocket /ws/session (Interviewer Mode)...")
    async with websockets.connect("ws://127.0.0.1:8000/ws/session") as ws:
        await ws.send(json.dumps({"type": "session_start", "mode": "interviewer", "voice_mode": "gemini"}))
        ready_msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
        ready_json = json.loads(ready_msg)
        print("[PASS] Received session_ready:", ready_json)
        assert ready_json["type"] == "session_ready"
        assert ready_json["mode"] == "interviewer"
        assert ready_json["sample_rate"] == 24000

    # Test 3: Voice WebSocket (Customer Support Mode with Mock fallback)
    print("\nTesting WebSocket /ws/session (Customer Support Mode - Mock fallback)...")
    async with websockets.connect("ws://127.0.0.1:8000/ws/session") as ws:
        await ws.send(json.dumps({"type": "session_start", "mode": "customer_service", "voice_mode": "mock"}))
        ready_msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
        ready_json = json.loads(ready_msg)
        print("[PASS] Received customer support mock ready:", ready_json)
        assert ready_json["mode"] == "customer_service"
        assert ready_json["voice_mode"] == "mock"

        # Send speech and receive audio/transcripts
        await ws.send(json.dumps({"type": "user_speaking"}))
        await ws.send(b"\x00" * 640)
        t1 = await asyncio.wait_for(ws.recv(), timeout=5.0)
        t1_json = json.loads(t1)
        print("[PASS] Received transcript event:", t1_json["type"], t1_json.get("text"))
        assert t1_json["type"] == "transcript"

    # Test 4: Multimodal File Upload & Grounded Question
    print("\nTesting Multimodal File Grounding with Document 1 (Operating Systems)...")
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"OS_Paging.txt\"\r\n"
        f"Content-Type: text/plain\r\n\r\n"
        f"Page replacement algorithms: FIFO, LRU, Optimal. Optimal algorithm has lowest page-fault rate and requires future knowledge.\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"feature\"\r\n\r\n"
        f"document\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"language\"\r\n\r\n"
        f"en\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    upload_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(upload_req) as resp:
        upload_res = json.loads(resp.read().decode())
        print("[PASS] File uploaded:", upload_res)
        conv_id_1 = upload_res["conversation_id"]

    # Ask specific question about OS file
    chat_payload = json.dumps({
        "conversation_id": conv_id_1,
        "message": "Which page replacement algorithm requires future knowledge according to the file?",
        "language": "en",
        "feature": "document"
    }).encode("utf-8")
    chat_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/chat",
        data=chat_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(chat_req) as resp:
        ans1 = json.loads(resp.read().decode())
        print("[PASS] Grounded answer 1:\n", ans1["response"][:200])
        assert "optimal" in ans1["response"].lower()

    # Test 5: Section 69 - Different File MUST Produce Different Answers
    print("\nTesting Section 69: Uploading Document 2 (Database Systems)...")
    body2 = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"DBMS_ACID.txt\"\r\n"
        f"Content-Type: text/plain\r\n\r\n"
        f"ACID Properties: Atomicity, Consistency, Isolation, Durability. Two-phase locking protocol guarantees serializability.\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"feature\"\r\n\r\n"
        f"document\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"language\"\r\n\r\n"
        f"en\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    upload_req2 = urllib.request.Request(
        "http://127.0.0.1:8000/api/upload",
        data=body2,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(upload_req2) as resp:
        upload_res2 = json.loads(resp.read().decode())
        conv_id_2 = upload_res2["conversation_id"]

    chat_payload2 = json.dumps({
        "conversation_id": conv_id_2,
        "message": "What protocol guarantees serializability in this file?",
        "language": "en",
        "feature": "document"
    }).encode("utf-8")
    chat_req2 = urllib.request.Request(
        "http://127.0.0.1:8000/api/chat",
        data=chat_payload2,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(chat_req2) as resp:
        ans2 = json.loads(resp.read().decode())
        print("[PASS] Grounded answer 2:\n", ans2["response"][:200])
        assert "two-phase locking" in ans2["response"].lower() or "2pl" in ans2["response"].lower()
        # Verify ans1 and ans2 are completely different
        assert ans1["response"] != ans2["response"]
        print("[PASS] Section 69 Verified: Different files produce completely different, accurate answers.")

    # Test 6: Kannada and Marathi Script Verification
    print("\nTesting Kannada (kn) Script Output...")
    kn_payload = json.dumps({
        "conversation_id": conv_id_1,
        "message": "Briefly summarize the algorithm in Kannada.",
        "language": "kn",
        "feature": "document"
    }).encode("utf-8")
    kn_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/chat",
        data=kn_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(kn_req) as resp:
        kn_ans = json.loads(resp.read().decode())
        kn_text = kn_ans["response"]
        has_kn_script = any(0x0C80 <= ord(c) <= 0x0CFF for c in kn_text)
        print(f"[PASS] Kannada Response has authentic Kannada script: {has_kn_script}")
        assert has_kn_script

    print("\nTesting Marathi (mr) Script Output...")
    mr_payload = json.dumps({
        "conversation_id": conv_id_2,
        "message": "Briefly summarize ACID in Marathi.",
        "language": "mr",
        "feature": "document"
    }).encode("utf-8")
    mr_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/chat",
        data=mr_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(mr_req) as resp:
        mr_ans = json.loads(resp.read().decode())
        mr_text = mr_ans["response"]
        has_devanagari = any(0x0900 <= ord(c) <= 0x097F for c in mr_text)
        print(f"[PASS] Marathi Response has authentic Marathi Devanagari script: {has_devanagari}")
        assert has_devanagari

    # Test 7: Conversation History Persistence, Search, Rename, Delete
    print("\nTesting History Operations (Persistence, Search, Rename, Delete)...")
    # Search
    search_req = urllib.request.Request("http://127.0.0.1:8000/api/conversations?q=ACID")
    with urllib.request.urlopen(search_req) as resp:
        search_res = json.loads(resp.read().decode())
        print(f"[PASS] Search for 'ACID' found {len(search_res)} conversation(s)")
        assert len(search_res) >= 1

    # Rename
    rename_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/conversations/{conv_id_2}",
        data=json.dumps({"title": "Database ACID Preparation"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PATCH"
    )
    with urllib.request.urlopen(rename_req) as resp:
        rename_res = json.loads(resp.read().decode())
        print("[PASS] Rename result:", rename_res)
        assert rename_res["title"] == "Database ACID Preparation"

    # Reopen
    get_req = urllib.request.Request(f"http://127.0.0.1:8000/api/conversations/{conv_id_2}")
    with urllib.request.urlopen(get_req) as resp:
        get_res = json.loads(resp.read().decode())
        print(f"[PASS] Reopened conversation has {len(get_res['messages'])} messages and {len(get_res['files'])} file(s)")
        assert len(get_res["messages"]) >= 2
        assert len(get_res["files"]) >= 1

    # Delete
    del_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/conversations/{conv_id_2}",
        method="DELETE"
    )
    with urllib.request.urlopen(del_req) as resp:
        del_res = json.loads(resp.read().decode())
        print("[PASS] Deleted conversation:", del_res)
        assert del_res["status"] == "success"

    print("\n==============================================")
    print("  ALL ACCEPTANCE CRITERIA SUCCESSFULLY PASSED ")
    print("==============================================")

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())

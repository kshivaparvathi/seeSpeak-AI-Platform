import urllib.request
import json
import asyncio
import websockets

async def run_feature_isolation_tests():
    print("========================================================")
    print("  SEESPEAK AI: STRICT FEATURE & CONTEXT ISOLATION TESTS ")
    print("========================================================")

    # 1. Health Check
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as r:
        health = json.loads(r.read().decode())
        print("[PASS] Backend Health:", health)
        assert health["status"] == "online"
        assert health["has_gemini_key"] is True

    # 2. TEST 1 & 2: Create conversation A in Document Analysis & upload Doc A
    print("\n--- TEST 1 & 2: Creating Conversation A in Document Analysis ---")
    conv_a_payload = json.dumps({
        "feature": "document-analysis",
        "language": "en",
        "title": "OS Paging Theory"
    }).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/conversations", data=conv_a_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        conv_a = json.loads(resp.read().decode())
        print(f"[PASS] Created Conv A: id={conv_a['id']}, feature={conv_a['feature_id']}")
        assert conv_a["feature_id"] == "document-analysis"

    # Upload Doc A to Conv A
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    doc_a_content = "OS Virtual Memory: Belady anomaly demonstrates that page fault rate may increase as more frames are allocated in FIFO algorithm."
    body_a = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"Belady_Anomaly.txt\"\r\n"
        f"Content-Type: text/plain\r\n\r\n"
        f"{doc_a_content}\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"conversation_id\"\r\n\r\n"
        f"{conv_a['id']}\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"feature\"\r\n\r\n"
        f"document-analysis\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    upload_req_a = urllib.request.Request("http://127.0.0.1:8000/api/upload", data=body_a, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(upload_req_a) as resp:
        upload_a = json.loads(resp.read().decode())
        print(f"[PASS] Uploaded Doc A: {upload_a['filename']} to Conv A (feature={upload_a['feature_id']})")
        assert upload_a["feature_id"] == "document-analysis"

    # Ask Conv A about Belady anomaly
    chat_a_payload = json.dumps({
        "conversation_id": conv_a["id"],
        "message": "What anomaly is mentioned in the document and which algorithm is affected?",
        "language": "en",
        "feature": "document-analysis"
    }).encode("utf-8")
    chat_req_a = urllib.request.Request("http://127.0.0.1:8000/api/chat", data=chat_a_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(chat_req_a) as resp:
        ans_a = json.loads(resp.read().decode())
        print("[PASS] Conv A Answer:\n", ans_a["response"][:200])
        assert "belady" in ans_a["response"].lower()

    # 3. Create Conversation B in Visual Intelligence & upload Doc B
    print("\n--- TEST 2 & 3: Creating Conversation B in Visual Intelligence ---")
    conv_b_payload = json.dumps({
        "feature": "visual-intelligence",
        "language": "en",
        "title": "Microservices Topology"
    }).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/conversations", data=conv_b_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        conv_b = json.loads(resp.read().decode())
        print(f"[PASS] Created Conv B: id={conv_b['id']}, feature={conv_b['feature_id']}")
        assert conv_b["feature_id"] == "visual-intelligence"

    # Verify Conv B has 0 messages and 0 files (Strict isolation from Conv A!)
    with urllib.request.urlopen(f"http://127.0.0.1:8000/api/conversations/{conv_b['id']}") as resp:
        b_data = json.loads(resp.read().decode())
        print(f"[PASS] Conv B initial isolation check: messages={len(b_data['messages'])}, files={len(b_data['files'])}")
        assert len(b_data["messages"]) == 0
        assert len(b_data["files"]) == 0

    # Upload Doc B to Conv B
    doc_b_content = "Diagram Architecture: Gateway router directs client requests to OrderService on port 8080 and AuthService on port 9090 via gRPC."
    body_b = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"Architecture_Specs.txt\"\r\n"
        f"Content-Type: text/plain\r\n\r\n"
        f"{doc_b_content}\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"conversation_id\"\r\n\r\n"
        f"{conv_b['id']}\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"feature\"\r\n\r\n"
        f"visual-intelligence\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    upload_req_b = urllib.request.Request("http://127.0.0.1:8000/api/upload", data=body_b, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(upload_req_b) as resp:
        upload_b = json.loads(resp.read().decode())
        print(f"[PASS] Uploaded Doc B: {upload_b['filename']} to Conv B (feature={upload_b['feature_id']})")
        assert upload_b["feature_id"] == "visual-intelligence"

    # Ask Conv B if it knows anything about Belady or Paging
    print("\n--- Verifying Visual Intelligence has NO knowledge of Conv A / Belady ---")
    chat_b_payload = json.dumps({
        "conversation_id": conv_b["id"],
        "message": "What services and ports are in this diagram? Does it mention anything about Belady anomaly or OS paging?",
        "language": "en",
        "feature": "visual-intelligence"
    }).encode("utf-8")
    chat_req_b = urllib.request.Request("http://127.0.0.1:8000/api/chat", data=chat_b_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(chat_req_b) as resp:
        ans_b = json.loads(resp.read().decode())
        print("[PASS] Conv B Answer:\n", ans_b["response"][:250])
        # It MUST know about OrderService / AuthService
        assert "orderservice" in ans_b["response"].lower() or "8080" in ans_b["response"]
        # It must state that Belady anomaly or OS paging is NOT in this file
        resp_lower = ans_b["response"].lower()
        assert "not mention" in resp_lower or "no mention" in resp_lower or "does not" in resp_lower or "neither" in resp_lower
        print("[PASS] Verified: Visual Intelligence context is 100% isolated from Document Analysis!")

    # 4. TEST 7: History Feature-Scoped Filtering
    print("\n--- TEST 7: Verifying Feature-Scoped Sidebar History Filtering ---")
    # Request history for document-analysis only
    with urllib.request.urlopen("http://127.0.0.1:8000/api/conversations?feature=document-analysis") as resp:
        doc_history = json.loads(resp.read().decode())
        print(f"[PASS] Document Analysis history count: {len(doc_history)}")
        assert all(c["feature_id"] == "document-analysis" for c in doc_history)
        assert any(c["id"] == conv_a["id"] for c in doc_history)
        assert not any(c["id"] == conv_b["id"] for c in doc_history)
        print("[PASS] Verified: Document Analysis sidebar never contains Visual Intelligence conversations!")

    # Request history for visual-intelligence only
    with urllib.request.urlopen("http://127.0.0.1:8000/api/conversations?feature=visual-intelligence") as resp:
        vis_history = json.loads(resp.read().decode())
        print(f"[PASS] Visual Intelligence history count: {len(vis_history)}")
        assert all(c["feature_id"] == "visual-intelligence" for c in vis_history)
        assert any(c["id"] == conv_b["id"] for c in vis_history)
        assert not any(c["id"] == conv_a["id"] for c in vis_history)
        print("[PASS] Verified: Visual Intelligence sidebar never contains Document Analysis conversations!")

    # 5. TEST 4: Reopen Conversation A and verify cross-turn follow up
    print("\n--- TEST 4: Reopening Conversation A and Asking Follow-up ---")
    with urllib.request.urlopen(f"http://127.0.0.1:8000/api/conversations/{conv_a['id']}") as resp:
        reopened_a = json.loads(resp.read().decode())
        print(f"[PASS] Reopened Conv A has {len(reopened_a['messages'])} messages and {len(reopened_a['files'])} file(s)")
        assert len(reopened_a["messages"]) >= 2
        assert len(reopened_a["files"]) == 1
        assert reopened_a["files"][0]["filename"] == "Belady_Anomaly.txt"

    # Ask follow-up in Conv A
    followup_payload = json.dumps({
        "conversation_id": conv_a["id"],
        "message": "Which algorithm was affected according to your previous answer?",
        "language": "en",
        "feature": "document-analysis"
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8000/api/chat", data=followup_payload, headers={"Content-Type": "application/json"})) as resp:
        followup_ans = json.loads(resp.read().decode())
        print("[PASS] Conv A Follow-up Answer:\n", followup_ans["response"][:150])
        assert "fifo" in followup_ans["response"].lower()
        print("[PASS] Verified: Multi-turn context memory intact upon reopening!")

    # 6. TEST 5: New Conversation Isolation inside Document Analysis
    print("\n--- TEST 5: New Conversation in Document Analysis ---")
    conv_c_payload = json.dumps({
        "feature": "document-analysis",
        "language": "en",
        "title": "Fresh OS Chat"
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8000/api/conversations", data=conv_c_payload, headers={"Content-Type": "application/json"})) as resp:
        conv_c = json.loads(resp.read().decode())
        print(f"[PASS] Created Conv C: id={conv_c['id']}")
        assert len(conv_c["messages"]) == 0
        assert len(conv_c["files"]) == 0
        print("[PASS] Verified: New Conversation starts with 0 messages and 0 files!")

    # 7. TEST 8: Multilingual Script Verification
    print("\n--- TEST 8: Multilingual Script Fidelity (Telugu, Kannada, Marathi) ---")
    # Telugu
    te_payload = json.dumps({
        "conversation_id": conv_a["id"],
        "message": "Briefly state what Belady anomaly is in Telugu.",
        "language": "te",
        "feature": "document-analysis"
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8000/api/chat", data=te_payload, headers={"Content-Type": "application/json"})) as resp:
        te_ans = json.loads(resp.read().decode())
        has_te = any(0x0C00 <= ord(c) <= 0x0C7F for c in te_ans["response"])
        print(f"[PASS] Telugu script present: {has_te}")
        assert has_te

    # Kannada
    kn_payload = json.dumps({
        "conversation_id": conv_a["id"],
        "message": "Briefly explain in Kannada.",
        "language": "kn",
        "feature": "document-analysis"
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8000/api/chat", data=kn_payload, headers={"Content-Type": "application/json"})) as resp:
        kn_ans = json.loads(resp.read().decode())
        has_kn = any(0x0C80 <= ord(c) <= 0x0CFF for c in kn_ans["response"])
        print(f"[PASS] Kannada script present: {has_kn}")
        assert has_kn

    # Marathi
    mr_payload = json.dumps({
        "conversation_id": conv_b["id"],
        "message": "Briefly describe the microservices in Marathi.",
        "language": "mr",
        "feature": "visual-intelligence"
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8000/api/chat", data=mr_payload, headers={"Content-Type": "application/json"})) as resp:
        mr_ans = json.loads(resp.read().decode())
        has_mr = any(0x0900 <= ord(c) <= 0x097F for c in mr_ans["response"])
        print(f"[PASS] Marathi script present: {has_mr}")
        assert has_mr

    # 8. TEST 9: Voice WebSocket Mode Isolation
    print("\n--- TEST 9: Voice WebSocket Scoping (Interviewer vs Customer Care) ---")
    async with websockets.connect("ws://127.0.0.1:8000/ws/session") as ws:
        await ws.send(json.dumps({"type": "session_start", "mode": "ai-interview", "voice_mode": "mock"}))
        msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
        ready = json.loads(msg)
        print(f"[PASS] Interview voice session ready: mode={ready['mode']}")
        assert "interview" in ready["mode"]

    async with websockets.connect("ws://127.0.0.1:8000/ws/session") as ws:
        await ws.send(json.dumps({"type": "session_start", "mode": "customer-support", "voice_mode": "mock"}))
        msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
        ready = json.loads(msg)
        print(f"[PASS] Customer support voice session ready: mode={ready['mode']}")
        assert "support" in ready["mode"] or "customer" in ready["mode"]

    print("\n========================================================")
    print("  ALL FEATURE & CONTEXT ISOLATION TESTS PASSED 100%!   ")
    print("========================================================")

if __name__ == "__main__":
    asyncio.run(run_feature_isolation_tests())

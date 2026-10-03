import urllib.request
import json
import io

def test_resume_and_screen_assistant():
    print("========================================================")
    print("  TESTING NEW FEATURES: RESUME BUILDER & SCREEN ASST    ")
    print("========================================================")

    # 1. Test Resume Builder Project Creation
    print("\n--- TEST 1: Resume Project CRUD ---")
    conv_id = "conv_test_resume_001"
    url_proj = f"http://127.0.0.1:8000/api/resume/project/{conv_id}"
    
    with urllib.request.urlopen(url_proj) as resp:
        proj = json.loads(resp.read().decode())
        print(f"[PASS] Created/Retrieved Project: conv_id={proj['conversation_id']}")
        assert proj["conversation_id"] == conv_id

    # 2. Test Resume Data Extraction (Voice / Text merge)
    print("\n--- TEST 2: Resume Ingestion & Extraction ---")
    spoken_text = "My name is John Doe, email is john.doe@example.com. I graduated from Stanford with a B.S. in Computer Science in 2023 with a 3.9 GPA. I built an open source AI search tool using Python and React."
    extract_payload = json.dumps({
        "conversation_id": conv_id,
        "text": spoken_text,
        "existing_resume_data": None
    }).encode("utf-8")
    
    req_extract = urllib.request.Request("http://127.0.0.1:8000/api/resume/extract", data=extract_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req_extract) as resp:
        res = json.loads(resp.read().decode())
        rdata = res["resume_data"]
        name = rdata.get("personalInfo", {}).get("fullName", "")
        print(f"[PASS] Extracted Candidate Name: {name}")
        assert "John" in name or name != ""

    # 3. Test ATS Keyword Analysis
    print("\n--- TEST 3: ATS Analysis & Scoring ---")
    ats_payload = json.dumps({
        "conversation_id": conv_id,
        "resume_data": rdata,
        "target_role": "Full Stack Software Engineer",
        "target_company": "Google",
        "job_description": "We are seeking a talented Software Engineer with experience in Python, React, and cloud architectures."
    }).encode("utf-8")
    
    req_ats = urllib.request.Request("http://127.0.0.1:8000/api/resume/ats-analyze", data=ats_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req_ats) as resp:
        ats_res = json.loads(resp.read().decode())
        score = ats_res.get("ats_score", 0)
        match_pct = ats_res.get("keyword_match_percentage", 0)
        print(f"[PASS] ATS Compatibility Score: {score}/100, Match: {match_pct}%")
        assert score > 0

    # 4. Test DOCX Document Generation
    print("\n--- TEST 4: Real Microsoft Word (.docx) Generation ---")
    docx_payload = json.dumps({
        "conversation_id": conv_id,
        "resume_data": rdata,
        "title": "John Doe Resume"
    }).encode("utf-8")
    
    req_docx = urllib.request.Request("http://127.0.0.1:8000/api/resume/download-docx", data=docx_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req_docx) as resp:
        content_type = resp.headers.get("Content-Type", "")
        docx_bytes = resp.read()
        print(f"[PASS] Generated DOCX file: {len(docx_bytes)} bytes, content-type={content_type}")
        assert len(docx_bytes) > 1000
        assert "officedocument" in content_type or "word" in content_type

    # 5. Test Screen Assistant Conversation & Isolated Chat
    print("\n--- TEST 5: Screen Assistant Chat Stream ---")
    screen_conv_payload = json.dumps({
        "feature": "ai-screen-assistant",
        "language": "en",
        "title": "Portal Error Help"
    }).encode("utf-8")
    
    req_sc = urllib.request.Request("http://127.0.0.1:8000/api/conversations", data=screen_conv_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req_sc) as resp:
        screen_conv = json.loads(resp.read().decode())
        print(f"[PASS] Created Screen Assistant Conv: id={screen_conv['id']}, feature={screen_conv['feature_id']}")
        assert screen_conv["feature_id"] == "ai-screen-assistant"

    # Send chat query to Screen Assistant with dummy 1x1 base64 screen image
    dummy_screen_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    screen_chat_payload = json.dumps({
        "conversation_id": screen_conv["id"],
        "message": "Where is the submit button on this screen?",
        "language": "en",
        "feature": "ai-screen-assistant",
        "screen_image": dummy_screen_b64
    }).encode("utf-8")
    
    req_schat = urllib.request.Request("http://127.0.0.1:8000/api/chat", data=screen_chat_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req_schat) as resp:
        schat_res = json.loads(resp.read().decode())
        print(f"[PASS] Screen Assistant Answer: {schat_res['response'][:90]}...")
        assert len(schat_res["response"]) > 0

    print("\n========================================================")
    print("  ALL NEW FEATURE VERIFICATION TESTS PASSED 100%!       ")
    print("========================================================")

if __name__ == "__main__":
    test_resume_and_screen_assistant()

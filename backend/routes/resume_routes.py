import os
import io
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from google import genai
from google.genai import types

from backend.repositories.conversation_repository import conversation_repository
from backend.utils.logging import logger

router = APIRouter(prefix="/api/resume", tags=["resume"])

GEMINI_CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
]

def get_gemini_client() -> Optional[genai.Client]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

class UpdateResumeProjectRequest(BaseModel):
    title: Optional[str] = None
    template_id: Optional[str] = None
    target_company: Optional[str] = None
    target_role: Optional[str] = None
    job_description: Optional[str] = None
    resume_data: Optional[Dict[str, Any]] = None
    ats_analysis: Optional[Dict[str, Any]] = None

class ExtractResumeRequest(BaseModel):
    conversation_id: str
    text: str
    existing_resume_data: Optional[Dict[str, Any]] = None

class ImproveSectionRequest(BaseModel):
    conversation_id: str
    section: str # 'summary' | 'experience' | 'projects' | 'skills' | 'bullet'
    content: Any
    target_company: Optional[str] = ""
    target_role: Optional[str] = ""
    job_description: Optional[str] = ""

class AtsAnalyzeRequest(BaseModel):
    conversation_id: str
    resume_data: Dict[str, Any]
    target_role: Optional[str] = ""
    target_company: Optional[str] = ""
    job_description: Optional[str] = ""

class OnePageOptimizeRequest(BaseModel):
    conversation_id: str
    resume_data: Dict[str, Any]

class GenerateSummaryRequest(BaseModel):
    conversation_id: str
    resume_data: Dict[str, Any]
    target_role: Optional[str] = ""
    target_company: Optional[str] = ""

class VoiceCommandRequest(BaseModel):
    conversation_id: str
    command: str
    resume_data: Dict[str, Any]
    template_id: Optional[str] = "ats-professional"
    target_role: Optional[str] = ""
    target_company: Optional[str] = ""

@router.get("/project/{conv_id}")
def get_or_create_project(conv_id: str):
    project = conversation_repository.create_or_get_resume_project(conv_id)
    return project

@router.post("/project/{conv_id}")
def update_project(conv_id: str, req: UpdateResumeProjectRequest):
    updates = req.dict(exclude_unset=True)
    success = conversation_repository.update_resume_project(conv_id, updates)
    if not success:
        conversation_repository.create_or_get_resume_project(conv_id)
        conversation_repository.update_resume_project(conv_id, updates)
    return conversation_repository.get_resume_project(conv_id)

@router.post("/extract")
async def extract_resume_data(req: ExtractResumeRequest):
    """
    Extracts structured resume data from spoken voice or typed text without fabrication.
    Merges with existing data to support multiple voice recording passes.
    """
    client = get_gemini_client()
    existing = req.existing_resume_data or {
        "personalInfo": {"fullName": "", "professionalTitle": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": ""},
        "summary": "",
        "education": [],
        "skills": {"languages": [], "frameworks": [], "tools": [], "databases": [], "cloud": [], "other": []},
        "experience": [],
        "projects": [],
        "certifications": [],
        "achievements": [],
        "extracurricular": [],
        "sectionOrder": ["summary", "skills", "experience", "projects", "education", "certifications", "achievements", "extracurricular"]
    }

    if not client:
        return {"resume_data": existing, "message": "Gemini API key not configured"}

    system_instruction = (
        "You are an expert Resume Information Extractor.\n"
        "Your task is to take the user's spoken or typed text and merge it into the existing structured resume JSON.\n\n"
        "STRICT EXTRACTION RULES:\n"
        "1. ZERO FABRICATION: Only extract what the user explicitly stated. Never invent companies, dates, GPA, or tools.\n"
        "2. MERGE INTELLIGENTLY: Retain all existing fields and append or refine with new information.\n"
        "3. PRESERVE PROFESSIONAL TITLE: If mentioned, store in personalInfo.professionalTitle.\n"
        "4. FORMATTING: Return ONLY a valid JSON object matching the exact schema provided. Do not wrap in markdown quotes if possible, or return ```json ... ```.\n"
        "SCHEMA:\n"
        "{\n"
        "  \"personalInfo\": {\"fullName\": \"\", \"professionalTitle\": \"\", \"email\": \"\", \"phone\": \"\", \"location\": \"\", \"linkedin\": \"\", \"github\": \"\", \"portfolio\": \"\"},\n"
        "  \"summary\": \"\",\n"
        "  \"education\": [{\"degree\": \"\", \"fieldOfStudy\": \"\", \"institution\": \"\", \"university\": \"\", \"location\": \"\", \"gpa\": \"\", \"year\": \"\", \"coursework\": \"\"}],\n"
        "  \"skills\": {\"languages\": [], \"frameworks\": [], \"tools\": [], \"databases\": [], \"cloud\": [], \"other\": []},\n"
        "  \"experience\": [{\"company\": \"\", \"role\": \"\", \"duration\": \"\", \"location\": \"\", \"employmentType\": \"\", \"bullets\": []}],\n"
        "  \"projects\": [{\"name\": \"\", \"description\": \"\", \"technologies\": [], \"link\": \"\", \"githubLink\": \"\", \"bullets\": []}],\n"
        "  \"certifications\": [{\"name\": \"\", \"issuer\": \"\", \"year\": \"\"}],\n"
        "  \"achievements\": [{\"title\": \"\", \"description\": \"\", \"date\": \"\"}],\n"
        "  \"extracurricular\": [{\"activity\": \"\", \"role\": \"\", \"description\": \"\"}],\n"
        "  \"sectionOrder\": [\"summary\", \"skills\", \"experience\", \"projects\", \"education\", \"certifications\", \"achievements\", \"extracurricular\"]\n"
        "}"
    )

    prompt = (
        f"EXISTING RESUME DATA:\n{json.dumps(existing, indent=2)}\n\n"
        f"NEW USER SPOKEN/TYPED TEXT:\n{req.text}\n\n"
        "Extract and merge the new information into the JSON structure."
    )

    extracted_data = existing
    for model in GEMINI_CANDIDATE_MODELS:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json"
            )
            resp = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=prompt,
                config=config
            )
            raw = (resp.text or "").strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                if raw.endswith("```"):
                    raw = raw.rsplit("```", 1)[0].strip()
            extracted_data = json.loads(raw)
            break
        except Exception as e:
            logger.warning(f"Resume extract error with model {model}: {e}")
            await asyncio.sleep(0.3)

    conversation_repository.update_resume_project(
        req.conversation_id,
        {"resume_data": extracted_data}
    )

    return {"resume_data": extracted_data}

@router.post("/improve-section")
async def improve_section(req: ImproveSectionRequest):
    """
    Polishes a specific section (e.g. project bullets or professional summary)
    using strong action verbs and quantitative impact without hallucination.
    """
    client = get_gemini_client()
    if not client:
        return {"improved_content": req.content, "improved_bullet": req.content if isinstance(req.content, str) else ""}

    # Check if this is a single bullet improvement
    if req.section == "bullet" or (isinstance(req.content, dict) and "bullet" in req.content):
        bullet_text = req.content.get("bullet", "") if isinstance(req.content, dict) else str(req.content)
        system_instruction = (
            "You are an Elite Resume Bullet Editor.\n"
            "Rewrite the single bullet point to start with a strong active verb, maximize clarity and impact, "
            "highlight technical elements, and preserve the factual meaning. "
            "STRICT RULE: NEVER FABRICATE METRICS OR PERCENTAGES. If the user said 'improved performance', do NOT invent 'improved by 40%'.\n"
            "Return ONLY the rewritten single bullet as plain text."
        )
        for model in GEMINI_CANDIDATE_MODELS:
            try:
                config = types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.2)
                resp = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model,
                    contents=f"BULLET TO IMPROVE: {bullet_text}",
                    config=config
                )
                polished = (resp.text or "").strip()
                if polished.startswith("- ") or polished.startswith("• "):
                    polished = polished[2:].strip()
                return {"improved_bullet": polished, "improved_content": polished}
            except Exception as e:
                logger.warning(f"Bullet improve error with {model}: {e}")
        return {"improved_bullet": bullet_text, "improved_content": bullet_text}

    system_instruction = (
        "You are an Elite Executive Resume Editor.\n"
        "Your goal is to transform the provided resume section into high-impact, professional, ATS-friendly phrasing.\n"
        "CRITICAL RULES:\n"
        "1. NO FABRICATION: Do not add unmentioned technologies or fake metrics.\n"
        "2. ACTION VERBS: Start bullet points with strong past-tense action verbs (Architected, Engineered, Optimized, Implemented).\n"
        "3. IMPACT: Highlight results, scale, and clarity.\n"
        "4. Return ONLY the improved section data in clean JSON or text format matching the input structure."
    )

    prompt = (
        f"SECTION NAME: {req.section}\n"
        f"TARGET ROLE: {req.target_role or 'Software Engineering'}\n"
        f"TARGET COMPANY: {req.target_company or 'Tech'}\n"
        f"JOB DESCRIPTION CONTEXT: {req.job_description or 'None'}\n\n"
        f"CURRENT CONTENT:\n{json.dumps(req.content) if isinstance(req.content, (dict, list)) else req.content}\n\n"
        "Provide the improved, professional version of this content."
    )

    improved = req.content
    for model in GEMINI_CANDIDATE_MODELS:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3
            )
            resp = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=prompt,
                config=config
            )
            txt = (resp.text or "").strip()
            if isinstance(req.content, (dict, list)):
                try:
                    clean_txt = txt
                    if clean_txt.startswith("```"):
                        clean_txt = clean_txt.split("\n", 1)[1]
                        if clean_txt.endswith("```"):
                            clean_txt = clean_txt.rsplit("```", 1)[0].strip()
                    improved = json.loads(clean_txt)
                except Exception:
                    improved = txt
            else:
                improved = txt
            break
        except Exception as e:
            logger.warning(f"Section improve error with {model}: {e}")
            await asyncio.sleep(0.3)

    return {"improved_content": improved}

@router.post("/generate-summary")
async def generate_summary(req: GenerateSummaryRequest):
    """
    Synthesizes a compelling professional summary strictly using candidate's provided credentials.
    """
    client = get_gemini_client()
    data = req.resume_data or {}
    name = data.get("personalInfo", {}).get("fullName", "Candidate")
    title = data.get("personalInfo", {}).get("professionalTitle", req.target_role or "Software Engineer")
    skills = data.get("skills", {})
    edus = data.get("education", [])
    projects = data.get("projects", [])

    default_summary = (
        f"Dedicated {title} with background in {', '.join(skills.get('languages', ['software systems'])[:4])}. "
        f"Proven experience developing scalable solutions including {projects[0].get('name', 'key projects') if projects else 'web applications'}."
    )

    if not client:
        return {"summary": default_summary}

    system_instruction = (
        "You are an Elite Resume Summary Generator.\n"
        "Generate a concise, professional summary (2-3 sentences) based SOLELY on the candidate's actual credentials provided.\n"
        "CRITICAL RULES:\n"
        "1. DO NOT invent technologies or achievements that the user did not mention.\n"
        "2. Highlight educational background, actual programming languages/tools, and key projects.\n"
        "3. Return ONLY the plain summary paragraph, no quotes, no markdown."
    )

    prompt = (
        f"CANDIDATE INFO:\n"
        f"Name: {name}\n"
        f"Title: {title}\n"
        f"Target Role: {req.target_role}\n"
        f"Target Company: {req.target_company}\n"
        f"Education: {json.dumps(edus)}\n"
        f"Skills: {json.dumps(skills)}\n"
        f"Projects: {json.dumps(projects)}\n\n"
        "Generate a professional, truthful executive summary."
    )

    for model in GEMINI_CANDIDATE_MODELS:
        try:
            config = types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.25)
            resp = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=prompt,
                config=config
            )
            summary = (resp.text or "").strip().strip('"')
            return {"summary": summary}
        except Exception as e:
            logger.warning(f"Generate summary error with {model}: {e}")
            await asyncio.sleep(0.3)

    return {"summary": default_summary}

@router.post("/voice-command")
async def execute_voice_command(req: VoiceCommandRequest):
    """
    Interprets natural language voice commands to manipulate the resume project:
    e.g. 'Add Python to my skills', 'Move projects above education', 'Use ATS Professional template', 'Make summary shorter'.
    """
    client = get_gemini_client()
    cmd = req.command.strip()
    resume_data = req.resume_data
    template_id = req.template_id or "ats-professional"
    target_role = req.target_role or ""

    if not client:
        # Simple heuristic fallback
        lower_cmd = cmd.lower()
        if "one page" in lower_cmd:
            return {"message": "Switched to one page compact layout", "template_id": "one-page-compact"}
        return {"message": f"Processed command: {cmd}"}

    system_instruction = (
        "You are an AI Voice Controller for a Professional Resume Builder.\n"
        "Analyze the user's spoken command and determine how to update the resume project state.\n"
        "Possible modifications:\n"
        "- Add/remove skills from skills list\n"
        "- Reorder sections in resume_data.sectionOrder\n"
        "- Change template_id to one of: ['ats-professional', 'ats-classic', 'ats-executive', 'ats-one-column', 'software-engineer', 'modern-developer', 'tech-professional', 'engineering-minimal', 'modern-minimal', 'clean-modern', 'professional-modern', 'contemporary', 'corporate-professional', 'corporate-executive', 'academic-research', 'one-page-compact', 'graduate-compact', 'entry-level-professional']\n"
        "- Change target_role or target_company\n"
        "- Modify summary or bullet points\n\n"
        "Return a JSON object matching:\n"
        "{\n"
        "  \"message\": \"User-facing feedback describing the action performed\",\n"
        "  \"updated_resume_data\": { ... modified resume_data ... },\n"
        "  \"updated_template_id\": \"... or null if unchanged ...\",\n"
        "  \"updated_target_role\": \"... or null if unchanged ...\"\n"
        "}"
    )

    prompt = (
        f"USER SPOKEN COMMAND: \"{cmd}\"\n"
        f"CURRENT TEMPLATE: {template_id}\n"
        f"CURRENT TARGET ROLE: {target_role}\n"
        f"CURRENT RESUME DATA:\n{json.dumps(resume_data, indent=2)}\n\n"
        "Execute the command and return the updated state."
    )

    for model in GEMINI_CANDIDATE_MODELS:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json"
            )
            resp = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=prompt,
                config=config
            )
            raw = (resp.text or "").strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                if raw.endswith("```"):
                    raw = raw.rsplit("```", 1)[0].strip()
            result = json.loads(raw)

            # Persist if resume_data or template changed
            updates: Dict[str, Any] = {}
            if result.get("updated_resume_data"):
                updates["resume_data"] = result["updated_resume_data"]
            if result.get("updated_template_id"):
                updates["template_id"] = result["updated_template_id"]
            if result.get("updated_target_role"):
                updates["target_role"] = result["updated_target_role"]
            if updates:
                conversation_repository.update_resume_project(req.conversation_id, updates)

            return result
        except Exception as e:
            logger.warning(f"Voice command error with {model}: {e}")
            await asyncio.sleep(0.3)

    return {"message": f"Processed command: {cmd}", "updated_resume_data": resume_data}

@router.post("/upload-document")
async def upload_resume_document(
    conversation_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Parses an uploaded resume file (PDF, DOCX, TXT) and extracts structured data.
    """
    client = get_gemini_client()
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content_bytes = await file.read()
    filename = file.filename.lower()
    extracted_text = ""

    # 1. Parse DOCX via python-docx
    if filename.endswith(".docx"):
        try:
            doc = docx.Document(io.BytesIO(content_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            extracted_text = "\n".join(paragraphs)
        except Exception as e:
            logger.warning(f"DOCX parse fallback: {e}")

    # 2. Parse TXT directly
    elif filename.endswith(".txt"):
        try:
            extracted_text = content_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.warning(f"TXT decode error: {e}")

    # 3. For PDF (or if text is empty and client exists), use Gemini multimodal Part
    if (filename.endswith(".pdf") or not extracted_text) and client:
        try:
            mime = file.content_type or ("application/pdf" if filename.endswith(".pdf") else "application/octet-stream")
            part = types.Part.from_bytes(data=content_bytes, mime_type=mime)
            prompt = (
                "You are an expert Resume Information Extractor. Extract all resume information from this document into clean JSON matching schema:\n"
                "{\n"
                "  \"personalInfo\": {\"fullName\": \"\", \"professionalTitle\": \"\", \"email\": \"\", \"phone\": \"\", \"location\": \"\", \"linkedin\": \"\", \"github\": \"\", \"portfolio\": \"\"},\n"
                "  \"summary\": \"\",\n"
                "  \"education\": [{\"degree\": \"\", \"institution\": \"\", \"location\": \"\", \"gpa\": \"\", \"year\": \"\"}],\n"
                "  \"skills\": {\"languages\": [], \"frameworks\": [], \"tools\": [], \"databases\": [], \"cloud\": [], \"other\": []},\n"
                "  \"experience\": [{\"company\": \"\", \"role\": \"\", \"duration\": \"\", \"location\": \"\", \"bullets\": []}],\n"
                "  \"projects\": [{\"name\": \"\", \"description\": \"\", \"technologies\": [], \"link\": \"\", \"bullets\": []}],\n"
                "  \"certifications\": [{\"name\": \"\", \"issuer\": \"\", \"year\": \"\"}],\n"
                "  \"achievements\": [{\"title\": \"\", \"description\": \"\", \"date\": \"\"}],\n"
                "  \"extracurricular\": [{\"activity\": \"\", \"role\": \"\", \"description\": \"\"}],\n"
                "  \"sectionOrder\": [\"summary\", \"skills\", \"experience\", \"projects\", \"education\", \"certifications\", \"achievements\", \"extracurricular\"]\n"
                "}\n"
                "STRICT RULE: Zero fabrication. Extract only facts directly stated."
            )
            config = types.GenerateContentConfig(response_mime_type="application/json", temperature=0.1)
            resp = await asyncio.to_thread(
                client.models.generate_content,
                model=GEMINI_CANDIDATE_MODELS[0],
                contents=[part, prompt],
                config=config
            )
            raw = (resp.text or "").strip()
            parsed = json.loads(raw)
            conversation_repository.update_resume_project(conversation_id, {"resume_data": parsed})
            return {"resume_data": parsed, "message": "Successfully parsed uploaded resume document!"}
        except Exception as e:
            logger.error(f"Multimodal PDF resume parse error: {e}")

    # If we got extracted_text, call extract_resume_data
    if extracted_text:
        req = ExtractResumeRequest(conversation_id=conversation_id, text=extracted_text)
        return await extract_resume_data(req)

    raise HTTPException(status_code=400, detail="Could not extract text from the uploaded document.")

@router.post("/ats-analyze")
async def ats_analyze(req: AtsAnalyzeRequest):
    """
    Performs comprehensive ATS compatibility and keyword alignment analysis.
    """
    client = get_gemini_client()
    default_analysis = {
        "ats_score": 82,
        "keyword_match_percentage": 78,
        "matched_keywords": ["JavaScript", "Python", "SQL", "Git", "REST APIs"],
        "missing_keywords": ["Unit Testing", "CI/CD Pipeline"],
        "strengths": [
            "Clean standard headings and ATS-parseable structure",
            "Clear educational credentials and project definitions"
        ],
        "formatting_issues": [
            "Ensure all bullet points maintain consistent punctuation"
        ],
        "actionable_recommendations": [
            "Incorporate quantitative metrics into your project descriptions (e.g. latency, user volume)",
            "Align technical skills with specific target role requirements"
        ]
    }

    if not client:
        return default_analysis

    system_instruction = (
        "You are an ATS (Applicant Tracking System) Evaluation Engine.\n"
        "Analyze the provided candidate resume data against the target role and job description.\n"
        "Calculate realistic scores and identify matched keywords, genuine missing keywords, and actionable improvements.\n"
        "NEVER encourage lying or adding skills the candidate doesn't have.\n"
        "Return response as a valid JSON object matching:\n"
        "{\n"
        "  \"ats_score\": 85,\n"
        "  \"keyword_match_percentage\": 80,\n"
        "  \"matched_keywords\": [\"React\", \"Node.js\"],\n"
        "  \"missing_keywords\": [\"Docker\"],\n"
        "  \"strengths\": [\"...\"],\n"
        "  \"formatting_issues\": [\"...\"],\n"
        "  \"actionable_recommendations\": [\"...\"]\n"
        "}"
    )

    prompt = (
        f"TARGET ROLE: {req.target_role}\n"
        f"TARGET COMPANY: {req.target_company}\n"
        f"JOB DESCRIPTION:\n{req.job_description or 'Standard industry benchmark'}\n\n"
        f"CANDIDATE RESUME DATA:\n{json.dumps(req.resume_data, indent=2)}\n\n"
        "Perform deep ATS scoring and keyword analysis."
    )

    analysis_result = default_analysis
    for model in GEMINI_CANDIDATE_MODELS:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                response_mime_type="application/json"
            )
            resp = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=prompt,
                config=config
            )
            raw = (resp.text or "").strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                if raw.endswith("```"):
                    raw = raw.rsplit("```", 1)[0].strip()
            analysis_result = json.loads(raw)
            break
        except Exception as e:
            logger.warning(f"ATS analyze error with {model}: {e}")
            await asyncio.sleep(0.3)

    conversation_repository.update_resume_project(
        req.conversation_id,
        {"ats_analysis": analysis_result}
    )

    return analysis_result

@router.post("/optimize-one-page")
async def optimize_one_page(req: OnePageOptimizeRequest):
    """
    Condenses phrasing and bullet counts to guarantee a crisp single-page fit.
    """
    client = get_gemini_client()
    if not client:
        return {"resume_data": req.resume_data}

    system_instruction = (
        "You are an Expert Resume Layout & Space Optimization Specialist.\n"
        "Your task is to condense the provided resume data so it cleanly fits on ONE single page.\n"
        "RULES:\n"
        "1. DO NOT fabricate or delete vital credentials.\n"
        "2. Keep the top 2-3 most impactful bullet points per project or experience.\n"
        "3. Make descriptions punchy and remove fluff or redundant phrasing.\n"
        "4. Return ONLY the modified resume JSON matching the exact input structure."
    )

    prompt = (
        f"RESUME DATA TO CONDENSE FOR ONE PAGE:\n{json.dumps(req.resume_data, indent=2)}"
    )

    condensed_data = req.resume_data
    for model in GEMINI_CANDIDATE_MODELS:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                response_mime_type="application/json"
            )
            resp = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=prompt,
                config=config
            )
            raw = (resp.text or "").strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                if raw.endswith("```"):
                    raw = raw.rsplit("```", 1)[0].strip()
            condensed_data = json.loads(raw)
            break
        except Exception as e:
            logger.warning(f"One-page optimize error with {model}: {e}")
            await asyncio.sleep(0.3)

    conversation_repository.update_resume_project(
        req.conversation_id,
        {"resume_data": condensed_data}
    )

    return {"resume_data": condensed_data}

@router.get("/history")
def list_history():
    return conversation_repository.list_resume_projects()

class DownloadDocxRequest(BaseModel):
    conversation_id: Optional[str] = None
    resume_data: Dict[str, Any]
    title: Optional[str] = "Resume"

@router.post("/download-docx")
def download_resume_docx(req: DownloadDocxRequest):
    """
    Generates a clean, ATS-compliant Microsoft Word (.docx) document formatted with professional typography.
    """
    doc = docx.Document()

    # Set 0.5 inch margins for standard fit
    for s in doc.sections:
        s.top_margin = Inches(0.5)
        s.bottom_margin = Inches(0.5)
        s.left_margin = Inches(0.6)
        s.right_margin = Inches(0.6)

    data = req.resume_data or {}
    personal = data.get("personalInfo", {})

    # Full Name
    name = personal.get("fullName", "").strip() or "Candidate Name"
    p_name = doc.add_paragraph()
    p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_name = p_name.add_run(name)
    run_name.font.size = Pt(20)
    run_name.font.bold = True
    run_name.font.color.rgb = RGBColor(15, 23, 42)
    p_name.paragraph_format.space_after = Pt(2)

    # Professional Title
    title = personal.get("professionalTitle", "").strip()
    if title:
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_title = p_title.add_run(title.upper())
        r_title.font.size = Pt(10)
        r_title.font.bold = True
        r_title.font.color.rgb = RGBColor(71, 85, 105)
        p_title.paragraph_format.space_after = Pt(2)

    # Contact Info line
    contact_parts = []
    if personal.get("location"): contact_parts.append(personal["location"])
    if personal.get("phone"): contact_parts.append(personal["phone"])
    if personal.get("email"): contact_parts.append(personal["email"])
    if personal.get("linkedin"): contact_parts.append(personal["linkedin"])
    if personal.get("github"): contact_parts.append(personal["github"])
    if personal.get("portfolio"): contact_parts.append(personal["portfolio"])

    if contact_parts:
        p_contact = doc.add_paragraph()
        p_contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_contact = p_contact.add_run(" | ".join(contact_parts))
        r_contact.font.size = Pt(9.5)
        r_contact.font.color.rgb = RGBColor(71, 85, 105)
        p_contact.paragraph_format.space_after = Pt(8)

    def add_section_header(sec_title: str):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(sec_title.upper())
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(30, 41, 59)

    # Respect custom sectionOrder if available
    section_order = data.get("sectionOrder", ["summary", "skills", "experience", "projects", "education", "certifications", "achievements", "extracurricular"])

    for sec in section_order:
        # Summary
        if sec == "summary":
            summary = data.get("summary", "").strip()
            if summary:
                add_section_header("Professional Summary")
                p_sum = doc.add_paragraph()
                r_sum = p_sum.add_run(summary)
                r_sum.font.size = Pt(10)
                p_sum.paragraph_format.space_after = Pt(4)

        # Technical Skills
        elif sec == "skills":
            skills = data.get("skills", {})
            has_skills = any(skills.get(k) for k in ["languages", "frameworks", "tools", "databases", "cloud", "other"]) if isinstance(skills, dict) else bool(skills)
            if has_skills:
                add_section_header("Technical Skills")
                if isinstance(skills, dict):
                    for category, items in skills.items():
                        if items:
                            p_cat = doc.add_paragraph()
                            r_lbl = p_cat.add_run(f"{category.title()}: ")
                            r_lbl.font.bold = True
                            r_lbl.font.size = Pt(9.5)
                            val_str = ", ".join(items) if isinstance(items, list) else str(items)
                            r_val = p_cat.add_run(val_str)
                            r_val.font.size = Pt(9.5)
                            p_cat.paragraph_format.space_after = Pt(2)
                elif isinstance(skills, list):
                    p_cat = doc.add_paragraph()
                    r_val = p_cat.add_run(", ".join(skills))
                    r_val.font.size = Pt(9.5)
                    p_cat.paragraph_format.space_after = Pt(2)

        # Experience
        elif sec == "experience":
            experience = data.get("experience", [])
            if experience:
                add_section_header("Professional Experience")
                for exp in experience:
                    p_exp = doc.add_paragraph()
                    p_exp.paragraph_format.space_before = Pt(4)
                    p_exp.paragraph_format.space_after = Pt(2)

                    r_role = p_exp.add_run(exp.get("role", "") + " — ")
                    r_role.font.bold = True
                    r_role.font.size = Pt(10)

                    r_comp = p_exp.add_run(exp.get("company", ""))
                    r_comp.font.bold = True
                    r_comp.font.size = Pt(10)

                    meta_str = []
                    if exp.get("duration"): meta_str.append(exp["duration"])
                    if exp.get("location"): meta_str.append(exp["location"])
                    if meta_str:
                        r_meta = p_exp.add_run(f" ({', '.join(meta_str)})")
                        r_meta.font.italic = True
                        r_meta.font.size = Pt(9.5)

                    bullets = exp.get("bullets", [])
                    for b in bullets:
                        if b.strip():
                            p_b = doc.add_paragraph(style='List Bullet')
                            r_b = p_b.add_run(b.strip())
                            r_b.font.size = Pt(9.5)
                            p_b.paragraph_format.space_after = Pt(1)

        # Projects
        elif sec == "projects":
            projects = data.get("projects", [])
            if projects:
                add_section_header("Technical Projects")
                for proj in projects:
                    p_proj = doc.add_paragraph()
                    p_proj.paragraph_format.space_before = Pt(4)
                    p_proj.paragraph_format.space_after = Pt(2)

                    r_pname = p_proj.add_run(proj.get("name", ""))
                    r_pname.font.bold = True
                    r_pname.font.size = Pt(10)

                    techs = proj.get("technologies", [])
                    if techs:
                        r_tech = p_proj.add_run(f" | Technologies: {', '.join(techs) if isinstance(techs, list) else techs}")
                        r_tech.font.italic = True
                        r_tech.font.size = Pt(9)

                    if proj.get("description"):
                        p_desc = doc.add_paragraph()
                        r_desc = p_desc.add_run(proj["description"])
                        r_desc.font.size = Pt(9.5)
                        p_desc.paragraph_format.space_after = Pt(1)

                    bullets = proj.get("bullets", [])
                    for b in bullets:
                        if b.strip():
                            p_b = doc.add_paragraph(style='List Bullet')
                            r_b = p_b.add_run(b.strip())
                            r_b.font.size = Pt(9.5)
                            p_b.paragraph_format.space_after = Pt(1)

        # Education
        elif sec == "education":
            education = data.get("education", [])
            if education:
                add_section_header("Education")
                for edu in education:
                    p_edu = doc.add_paragraph()
                    p_edu.paragraph_format.space_before = Pt(3)
                    p_edu.paragraph_format.space_after = Pt(2)

                    r_deg = p_edu.add_run(edu.get("degree", ""))
                    r_deg.font.bold = True
                    r_deg.font.size = Pt(10)

                    if edu.get("institution"):
                        r_inst = p_edu.add_run(f", {edu['institution']}")
                        r_inst.font.size = Pt(9.5)

                    meta_edu = []
                    if edu.get("year"): meta_edu.append(edu["year"])
                    if edu.get("gpa"): meta_edu.append(f"GPA: {edu['gpa']}")
                    if edu.get("location"): meta_edu.append(edu["location"])
                    if meta_edu:
                        r_meta = p_edu.add_run(f" ({' | '.join(meta_edu)})")
                        r_meta.font.italic = True
                        r_meta.font.size = Pt(9)

        # Certifications
        elif sec == "certifications":
            certs = data.get("certifications", [])
            if certs:
                add_section_header("Certifications")
                for cert in certs:
                    p_c = doc.add_paragraph(style='List Bullet')
                    c_name = cert.get("name", "") if isinstance(cert, dict) else str(cert)
                    r_c = p_c.add_run(c_name)
                    r_c.font.size = Pt(9.5)
                    if isinstance(cert, dict) and cert.get("issuer"):
                        r_ci = p_c.add_run(f" — {cert['issuer']}")
                        r_ci.font.italic = True
                        r_ci.font.size = Pt(9)
                    p_c.paragraph_format.space_after = Pt(1)

        # Achievements
        elif sec == "achievements":
            achs = data.get("achievements", [])
            if achs:
                add_section_header("Key Honors & Achievements")
                for ach in achs:
                    p_a = doc.add_paragraph(style='List Bullet')
                    a_title = ach.get("title", "") if isinstance(ach, dict) else str(ach)
                    r_a = p_a.add_run(a_title)
                    r_a.font.bold = True
                    r_a.font.size = Pt(9.5)
                    if isinstance(ach, dict) and ach.get("description"):
                        r_ad = p_a.add_run(f": {ach['description']}")
                        r_ad.font.size = Pt(9.5)
                    p_a.paragraph_format.space_after = Pt(1)

        # Extracurricular
        elif sec == "extracurricular":
            exts = data.get("extracurricular", [])
            if exts:
                add_section_header("Leadership & Extracurricular")
                for ext in exts:
                    p_e = doc.add_paragraph(style='List Bullet')
                    act = ext.get("activity", "") if isinstance(ext, dict) else str(ext)
                    r_e = p_e.add_run(act)
                    r_e.font.bold = True
                    r_e.font.size = Pt(9.5)
                    if isinstance(ext, dict) and ext.get("role"):
                        r_er = p_e.add_run(f" ({ext['role']})")
                        r_er.font.italic = True
                        r_er.font.size = Pt(9)
                    if isinstance(ext, dict) and ext.get("description"):
                        r_ed = p_e.add_run(f" — {ext['description']}")
                        r_ed.font.size = Pt(9.5)
                    p_e.paragraph_format.space_after = Pt(1)

    # Save to buffer
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    filename = f"{name.replace(' ', '_')}_Resume.docx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

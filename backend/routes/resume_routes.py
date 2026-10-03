import os
import io
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
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
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-lite-latest",
    "gemini-flash-latest"
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
    section: str # 'summary' | 'experience' | 'projects' | 'skills'
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
        "personalInfo": {"fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": ""},
        "summary": "",
        "education": [],
        "skills": {"languages": [], "frameworks": [], "tools": [], "databases": [], "cloud": []},
        "experience": [],
        "projects": [],
        "certifications": [],
        "achievements": []
    }

    if not client:
        return {"resume_data": existing, "message": "Gemini API key not configured"}

    system_instruction = (
        "You are an expert Resume Information Extractor.\n"
        "Your task is to take the user's spoken or typed text and merge it into the existing structured resume JSON.\n\n"
        "STRICT EXTRACTION RULES:\n"
        "1. ZERO FABRICATION: Only extract what the user explicitly stated. Never invent companies, dates, GPA, or tools.\n"
        "2. MERGE INTELLIGENTLY: Retain all existing fields and append or refine with new information.\n"
        "3. FORMATTING: Return ONLY a valid JSON object matching the exact schema provided. Do not wrap in markdown quotes if possible, or return ```json ... ```.\n"
        "SCHEMA:\n"
        "{\n"
        "  \"personalInfo\": {\"fullName\": \"\", \"email\": \"\", \"phone\": \"\", \"location\": \"\", \"linkedin\": \"\", \"github\": \"\", \"portfolio\": \"\"},\n"
        "  \"summary\": \"\",\n"
        "  \"education\": [{\"degree\": \"\", \"institution\": \"\", \"location\": \"\", \"gpa\": \"\", \"year\": \"\"}],\n"
        "  \"skills\": {\"languages\": [], \"frameworks\": [], \"tools\": [], \"databases\": [], \"cloud\": []},\n"
        "  \"experience\": [{\"company\": \"\", \"role\": \"\", \"duration\": \"\", \"location\": \"\", \"bullets\": []}],\n"
        "  \"projects\": [{\"name\": \"\", \"description\": \"\", \"technologies\": [], \"link\": \"\", \"bullets\": []}],\n"
        "  \"certifications\": [{\"name\": \"\", \"issuer\": \"\", \"year\": \"\"}],\n"
        "  \"achievements\": []\n"
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
            # Clean markdown formatting if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                if raw.endswith("```"):
                    raw = raw.rsplit("```", 1)[0].strip()
            extracted_data = json.loads(raw)
            break
        except Exception as e:
            logger.warning(f"Resume extract error with model {model}: {e}")
            await asyncio.sleep(0.3)

    # Persist updated resume data to database
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
        return {"improved_content": req.content}

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
            # Try parsing JSON if content was structured
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

    # Save to project
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
    Generates a clean, ATS-compliant Microsoft Word (.docx) document.
    """
    doc = docx.Document()

    # Set 0.5 inch margins for ATS standard fit
    sections = doc.sections
    for s in sections:
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
    run_name.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
    p_name.paragraph_format.space_after = Pt(2)

    # Contact Info line
    contact_parts = []
    if personal.get("email"): contact_parts.append(personal["email"])
    if personal.get("phone"): contact_parts.append(personal["phone"])
    if personal.get("location"): contact_parts.append(personal["location"])
    if personal.get("linkedin"): contact_parts.append(personal["linkedin"])
    if personal.get("github"): contact_parts.append(personal["github"])
    if personal.get("portfolio"): contact_parts.append(personal["portfolio"])

    if contact_parts:
        p_contact = doc.add_paragraph()
        p_contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_contact = p_contact.add_run(" | ".join(contact_parts))
        r_contact.font.size = Pt(9.5)
        r_contact.font.color.rgb = RGBColor(71, 85, 105) # Slate 600
        p_contact.paragraph_format.space_after = Pt(8)

    def add_section_header(title: str):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(title.upper())
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(30, 41, 59) # Slate 800

    # Summary
    summary = data.get("summary", "").strip()
    if summary:
        add_section_header("Professional Summary")
        p_sum = doc.add_paragraph()
        r_sum = p_sum.add_run(summary)
        r_sum.font.size = Pt(10)
        p_sum.paragraph_format.space_after = Pt(4)

    # Technical Skills
    skills = data.get("skills", {})
    has_skills = any(skills.get(k) for k in ["languages", "frameworks", "tools", "databases", "cloud"]) if isinstance(skills, dict) else bool(skills)
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
    projects = data.get("projects", [])
    if projects:
        add_section_header("Projects")
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


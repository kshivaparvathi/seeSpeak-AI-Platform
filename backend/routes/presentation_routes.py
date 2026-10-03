import os
import io
import re
import json
import uuid
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

import pypdf
import docx

from google import genai
from google.genai import types

from backend.repositories.conversation_repository import conversation_repository
from backend.utils.logging import logger

router = APIRouter(prefix="/api/presentation", tags=["presentation"])

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

LANGUAGE_NAMES = {
    "en": "English",
    "te": "Telugu",
    "hi": "Hindi",
    "ta": "Tamil",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "ur": "Urdu",
}

# ========================================================
# PYDANTIC SCHEMAS
# ========================================================

class GeneratePresentationRequest(BaseModel):
    conversation_id: str
    topic: str
    slide_count: Optional[int] = 10
    audience: Optional[str] = "College"
    level: Optional[str] = "Moderate"
    tone: Optional[str] = "Professional"
    language: Optional[str] = "en"
    theme_id: Optional[str] = "modern-professional"
    file_ids: Optional[List[str]] = []

class UpdatePresentationProjectRequest(BaseModel):
    title: Optional[str] = None
    theme_id: Optional[str] = None
    topic: Optional[str] = None
    slide_count: Optional[int] = None
    audience: Optional[str] = None
    level: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    slides: Optional[List[Dict[str, Any]]] = None
    outline: Optional[List[Dict[str, Any]]] = None

class ImproveSlideRequest(BaseModel):
    conversation_id: str
    slide_index: int
    action: str  # 'simplify' | 'add_technical_details' | 'make_beginner_friendly' | 'convert_to_bullets' | 'convert_to_table' | 'regenerate' | 'custom'
    custom_instruction: Optional[str] = ""

class GenerateNotesRequest(BaseModel):
    conversation_id: str
    slide_index: Optional[int] = None  # None means all slides

class ExportPptxRequest(BaseModel):
    conversation_id: str
    slides: Optional[List[Dict[str, Any]]] = None
    title: Optional[str] = "Presentation"
    theme_id: Optional[str] = "modern-professional"

# ========================================================
# DOCUMENT TEXT EXTRACTION HELPER
# ========================================================

def extract_text_from_file_path(file_path: str, mime_type: str) -> str:
    """Extracts plain text content from PDF, DOCX, PPTX, or text files."""
    if not os.path.exists(file_path):
        return ""

    text = ""
    try:
        lower_mime = (mime_type or "").lower()
        lower_path = file_path.lower()

        # PDF extraction via pypdf
        if "pdf" in lower_mime or lower_path.endswith(".pdf"):
            reader = pypdf.PdfReader(file_path)
            pages_text = []
            for i, page in enumerate(reader.pages[:60]):  # up to 60 pages
                extracted = page.extract_text()
                if extracted:
                    pages_text.append(f"--- Page {i+1} ---\n{extracted.strip()}")
            text = "\n\n".join(pages_text)

        # DOCX extraction via python-docx
        elif "word" in lower_mime or lower_path.endswith(".docx") or lower_path.endswith(".doc"):
            doc = docx.Document(file_path)
            paras = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    row_txt = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_txt:
                        paras.append(row_txt)
            text = "\n".join(paras)

        # PPTX extraction
        elif "presentation" in lower_mime or lower_path.endswith(".pptx") or lower_path.endswith(".ppt"):
            prs = pptx.Presentation(file_path)
            slide_texts = []
            for s_idx, slide in enumerate(prs.slides):
                st = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        st.append(shape.text_frame.text)
                if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                    st.append(f"[Notes: {slide.notes_slide.notes_text_frame.text}]")
                slide_texts.append(f"Slide {s_idx+1}:\n" + "\n".join(st))
            text = "\n\n".join(slide_texts)

        # Plain text / markdown / csv / json
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read(150000)  # up to 150KB
    except Exception as e:
        logger.warning(f"Error extracting text from {file_path}: {e}")

    return text.strip()

def detect_slide_count_from_prompt(prompt: str, default_count: int = 10) -> int:
    """Extracts explicit slide count from prompt like '15-slide PPT' or 'make 8 slides'."""
    match = re.search(r'(\d+)\s*[-_]?\s*slides?', prompt, re.IGNORECASE)
    if match:
        val = int(match.group(1))
        if 3 <= val <= 50:
            return val

    match2 = re.search(r'(?:create|make|generate|build)\s+(\d+)\s+(?:slides?|presentation|ppt)', prompt, re.IGNORECASE)
    if match2:
        val = int(match2.group(1))
        if 3 <= val <= 50:
            return val

    return default_count

# ========================================================
# SMART FALLBACK PRESENTATION BUILDER
# ========================================================

def build_fallback_presentation(
    topic: str,
    slide_count: int,
    audience: str,
    tone: str,
    language: str,
    doc_text: str = ""
) -> Dict[str, Any]:
    """Generates structured presentation when AI API is unavailable or offline."""
    clean_topic = topic.strip()
    if not clean_topic:
        clean_topic = "Professional Presentation"

    # Derive keywords
    words = [w for w in re.split(r'\W+', clean_topic) if len(w) > 3 and w.lower() not in ['create', 'make', 'slide', 'slides', 'presentation', 'about', 'with', 'keep']]
    main_subject = " ".join(words[:4]).title() if words else clean_topic[:40]

    title = f"{main_subject} Overview"
    subtitle = f"A {tone} Guide for {audience} Audiences"

    layouts_cycle = ['bullets', 'two-column', 'process', 'stats', 'table', 'timeline', 'diagram', 'bullets']

    slides = []

    # Slide 1: Title
    slides.append({
        "id": f"s_1_{uuid.uuid4().hex[:6]}",
        "slide_number": 1,
        "title": title,
        "subtitle": subtitle,
        "layout": "title",
        "content": f"Structured briefing on {main_subject} designed for {audience.lower()} audiences.",
        "bullet_points": [],
        "speaker_notes": f"Welcome everyone. Today we are presenting a focused overview of {main_subject}.",
        "visual_hint": "Presentation title banner with theme gradient."
    })

    # Middle slides
    remaining = max(1, slide_count - 2)
    step_titles = [
        f"Introduction to {main_subject}",
        f"Core Principles & Architecture",
        f"Key Components & Workflows",
        f"Comparative Analysis & Trade-offs",
        f"Performance Metrics & Benchmarks",
        f"Implementation Steps & Strategy",
        f"Real-World Industry Applications",
        f"Challenges, Risks & Solutions",
        f"Future Trends & Innovations",
        f"Strategic Recommendations"
    ]

    for i in range(remaining):
        slide_num = i + 2
        stitle = step_titles[i % len(step_titles)]
        layout = layouts_cycle[i % len(layouts_cycle)]

        slide_data: Dict[str, Any] = {
            "id": f"s_{slide_num}_{uuid.uuid4().hex[:6]}",
            "slide_number": slide_num,
            "title": stitle,
            "subtitle": f"Phase {i+1} • {main_subject}",
            "layout": layout,
            "content": f"Detailed examination of {stitle.lower()} and its strategic implications.",
            "speaker_notes": f"On this slide, notice how {stitle.lower()} influences overall system execution and outcomes.",
            "visual_hint": f"Visual {layout} representation."
        }

        if layout == "bullets":
            slide_data["bullet_points"] = [
                f"Foundational requirement: Ensures consistent alignment across all system modules.",
                f"Operational impact: Streamlines deployment cycles and mitigates runtime bottlenecks.",
                f"Scalability factor: Adapts dynamically under varying workload pressures.",
                f"Key best practice: Adhere to strict security and modular separation standards."
            ]
        elif layout == "two-column":
            slide_data["columns"] = [
                {
                    "heading": "Strengths & Opportunities",
                    "bullets": [
                        "High throughput with minimal configuration overhead",
                        "Seamless integration into modern toolchains",
                        "Lower total cost of ownership over life cycle"
                    ],
                    "badge": "Advantage"
                },
                {
                    "heading": "Challenges & Mitigations",
                    "bullets": [
                        "Initial architectural complexity requires governance",
                        "Requires robust monitoring and failover plans",
                        "Ongoing team training and documentation discipline"
                    ],
                    "badge": "Consideration"
                }
            ]
        elif layout == "process":
            slide_data["steps"] = [
                {"step": 1, "title": "Assessment & Ingestion", "description": "Audit baseline state and structure requirements."},
                {"step": 2, "title": "Architecture Design", "description": "Design modular components and establish protocols."},
                {"step": 3, "title": "Implementation & Testing", "description": "Execute rollout with automated regression validation."},
                {"step": 4, "title": "Monitoring & Continuous Scale", "description": "Track telemetry, optimize latency, and scale."}
            ]
        elif layout == "stats":
            slide_data["stats"] = [
                {"value": "99.95%", "label": "Availability", "description": "Consistent high-reliability uptime achieved."},
                {"value": "3.8x", "label": "Performance Gain", "description": "Average speedup across processed workloads."},
                {"value": "45%", "label": "Cost Optimization", "description": "Reduction in cloud compute & maintenance overhead."},
                {"value": "< 25ms", "label": "P99 Latency", "description": "Guaranteed low response latency under peak load."}
            ]
        elif layout == "table":
            slide_data["table_data"] = {
                "headers": ["Dimension", "Traditional Approach", "Modern AI / Cloud Standard", "Strategic Benefit"],
                "rows": [
                    ["Deployment", "Manual, bi-weekly releases", "Automated continuous delivery", "10x faster iterations"],
                    ["Resource Scaling", "Static over-provisioning", "Dynamic auto-scaling pods", "40% cost reduction"],
                    ["Reliability", "Single point of failure", "Distributed multi-region active", "Zero downtime resilience"],
                    ["Governance", "Post-hoc manual audit", "Automated compliance guardrails", "Audit-ready safety"]
                ]
            }
        elif layout == "timeline":
            slide_data["steps"] = [
                {"step": 1, "title": "Q1: Discovery", "description": "Requirements gathering and technology benchmarking."},
                {"step": 2, "title": "Q2: Prototype", "description": "Proof of concept with pilot enterprise team."},
                {"step": 3, "title": "Q3: Migration", "description": "Production data migration with zero downtime."},
                {"step": 4, "title": "Q4: Scale", "description": "Full enterprise rollout and performance tuning."}
            ]
        elif layout == "diagram":
            slide_data["columns"] = [
                {
                    "heading": "Client Ingestion Tier",
                    "bullets": ["User requests, WebSockets, REST APIs, and Mobile gateways."]
                },
                {
                    "heading": "Core Processing Core",
                    "bullets": ["Event bus, business logic workers, and caching engine."]
                },
                {
                    "heading": "Persistent Storage & Analytics",
                    "bullets": ["Relational databases, object storage, and analytics data lake."]
                }
            ]
        else:
            slide_data["bullet_points"] = [
                "Key takeaway point 1 for team alignment.",
                "Key takeaway point 2 for operational excellence.",
                "Key takeaway point 3 for future roadmap planning."
            ]

        slides.append(slide_data)

    # Final Slide: Conclusion / Q&A
    slides.append({
        "id": f"s_{slide_count}_{uuid.uuid4().hex[:6]}",
        "slide_number": slide_count,
        "title": "Conclusion & Key Takeaways",
        "subtitle": "Summary & Discussion",
        "layout": "conclusion",
        "content": f"Adopting modern practices in {main_subject} yields significant competitive and operational advantages.",
        "bullet_points": [
            "Consistent architecture guarantees resilience and agility under scale.",
            "Investing in automated testing and monitoring mitigates technical debt.",
            "Continuous iteration ensures sustained long-term business value."
        ],
        "speaker_notes": "Thank you for your time. I am now open to any questions or discussion points from the audience.",
        "visual_hint": "Summary recap with Q&A badge."
    })

    outline = [{"slide_number": s["slide_number"], "title": s["title"], "layout": s["layout"]} for s in slides]

    return {
        "title": title,
        "subtitle": subtitle,
        "slides": slides,
        "outline": outline
    }

# ========================================================
# ROUTES
# ========================================================

@router.get("/project/{conv_id}")
def get_or_create_project(conv_id: str):
    """Retrieves or creates a presentation project for the given conversation ID."""
    project = conversation_repository.create_or_get_presentation_project(conv_id)
    return project

@router.get("/history")
def list_history(limit: int = 30):
    """Lists saved presentation projects."""
    projects = conversation_repository.list_presentation_projects(limit=limit)
    return projects

@router.post("/project/{conv_id}")
def update_project(conv_id: str, req: UpdatePresentationProjectRequest):
    """Updates presentation project metadata, slides, or outline."""
    updates = req.dict(exclude_unset=True)
    success = conversation_repository.update_presentation_project(conv_id, updates)
    if not success:
        conversation_repository.create_or_get_presentation_project(conv_id)
        conversation_repository.update_presentation_project(conv_id, updates)
    return conversation_repository.get_presentation_project(conv_id)

async def run_presentation_pipeline(
    req: GeneratePresentationRequest,
    on_progress: Optional[Any] = None
) -> Dict[str, Any]:
    conv_id = req.conversation_id
    topic = req.topic.strip()
    audience = req.audience or "College"
    tone = req.tone or "Professional"
    language = req.language or "en"
    theme_id = req.theme_id or "modern-professional"
    level = req.level or "Moderate"

    if on_progress:
        await on_progress("Preparing presentation", 10, "Initializing workspace and project settings...")

    # Detect slide count from topic prompt if specified (e.g. '15-slide presentation')
    slide_count = req.slide_count or 10
    detected_count = detect_slide_count_from_prompt(topic, slide_count)
    if detected_count != slide_count:
        slide_count = detected_count

    if on_progress:
        await on_progress("Understanding your content", 25, "Extracting text and analyzing source materials...")

    # Extract text from attached conversation files
    extracted_doc_text = ""
    conv_files = conversation_repository.get_files(conv_id)
    target_files = [f for f in conv_files if not req.file_ids or f["id"] in req.file_ids]

    doc_snippets = []
    for f in target_files:
        f_text = await asyncio.to_thread(extract_text_from_file_path, f["file_path"], f.get("mime_type", ""))
        if f_text:
            doc_snippets.append(f"=== SOURCE DOCUMENT: {f['filename']} ===\n{f_text[:20000]}")

    if doc_snippets:
        extracted_doc_text = "\n\n".join(doc_snippets)

    # Initialize presentation project in DB
    conversation_repository.create_or_get_presentation_project(
        conversation_id=conv_id,
        title=f"Presentation on {topic[:35]}" if topic else "Professional Presentation",
        theme_id=theme_id,
        topic=topic,
        slide_count=slide_count,
        audience=audience,
        level=level,
        tone=tone,
        language=language
    )

    if on_progress:
        await on_progress("Building slide structure", 50, f"Synthesizing structured {slide_count}-slide outline and flow...")

    client = get_gemini_client()
    generated_result = None

    if client:
        lang_name = LANGUAGE_NAMES.get(language, "English")
        system_instruction = (
            f"You are an Elite Presentation Designer and Slide Architect.\n"
            f"Your mission is to generate a comprehensive, highly professional {slide_count}-slide presentation deck in {lang_name}.\n"
            f"TARGET AUDIENCE: {audience}\n"
            f"TONE: {tone}\n"
            f"DEPTH LEVEL: {level}\n"
            f"EXACT NUMBER OF SLIDES: You MUST generate EXACTLY {slide_count} slides. Do NOT generate fewer or more.\n\n"
            f"CRITICAL DESIGN RULES:\n"
            f"1. MEANINGFUL CONTENT: Each slide must contain substantive, factual, presentation-friendly information. Never output empty or generic placeholders.\n"
            f"2. LAYOUT VARIETY: Distribute different layouts across the deck. Use:\n"
            f"   - 'title' for Slide 1\n"
            f"   - 'bullets' for key concept overviews\n"
            f"   - 'two-column' for side-by-side comparisons or pros/cons\n"
            f"   - 'process' for sequential workflows or step-by-step phases\n"
            f"   - 'timeline' for milestone schedules or history\n"
            f"   - 'table' for structured comparisons (provide 'headers' and 3-5 'rows')\n"
            f"   - 'stats' for numerical metrics (provide 3-4 items with 'value', 'label', 'description')\n"
            f"   - 'diagram' for architecture/component modules\n"
            f"   - 'conclusion' for final takeaways & Q&A\n"
            f"3. SOURCE-BASED ACCURACY: If source documents are provided below, prioritize facts, definitions, and data from them. Do not contradict the source.\n"
            f"4. SPEAKER NOTES: Provide 2-3 spoken sentences of presenter notes for EVERY slide.\n"
            f"5. LANGUAGE: All titles, content, bullets, and notes must be in {lang_name} (keep technical code/keywords in English where appropriate).\n\n"
            f"OUTPUT FORMAT: Return ONLY valid JSON matching this exact structure:\n"
            f"{{\n"
            f'  "title": "Presentation Main Title",\n'
            f'  "subtitle": "Subtitle or Topic Tagline",\n'
            f'  "slides": [\n'
            f'    {{\n'
            f'      "slide_number": 1,\n'
            f'      "title": "Title",\n'
            f'      "subtitle": "Subtitle",\n'
            f'      "layout": "title",\n'
            f'      "content": "Short intro narrative",\n'
            f'      "bullet_points": [],\n'
            f'      "speaker_notes": "What presenter says",\n'
            f'      "visual_hint": "Visual element description"\n'
            f'    }},\n'
            f'    ...\n'
            f'  ]\n'
            f"}}"
        )

        user_content_parts = [
            f"USER REQUIREMENT: {topic or 'Create a comprehensive presentation based on the attached document.'}",
            f"REQUIRED NUMBER OF SLIDES: {slide_count}"
        ]

        if extracted_doc_text:
            user_content_parts.append(f"ATTACHED SOURCE DOCUMENT CONTENT:\n{extracted_doc_text[:35000]}")

        prompt_str = "\n\n".join(user_content_parts)

        if on_progress:
            await on_progress("Generating slides", 75, "Generating in-depth slide content and presenter notes...")

        for model in GEMINI_CANDIDATE_MODELS:
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.3
                )
                resp = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model,
                    contents=prompt_str,
                    config=config
                )
                raw_text = (resp.text or "").strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r'^```json\s*', '', raw_text)
                    raw_text = re.sub(r'^```\s*', '', raw_text)
                    raw_text = re.sub(r'\s*```$', '', raw_text)

                parsed = json.loads(raw_text)
                if isinstance(parsed, dict) and "slides" in parsed and len(parsed["slides"]) > 0:
                    # Validate slide IDs and numbers
                    slides_list = parsed["slides"]
                    # If model returned fewer or more slides, adjust to exact slide_count
                    for idx, s in enumerate(slides_list):
                        s["id"] = f"s_{idx+1}_{uuid.uuid4().hex[:6]}"
                        s["slide_number"] = idx + 1
                        if "layout" not in s:
                            s["layout"] = "bullets"
                        if "speaker_notes" not in s:
                            s["speaker_notes"] = f"Key points regarding {s.get('title', '')}."

                    # If model returned fewer than requested slide count, append
                    while len(slides_list) < slide_count:
                        cur_n = len(slides_list) + 1
                        slides_list.append({
                            "id": f"s_{cur_n}_{uuid.uuid4().hex[:6]}",
                            "slide_number": cur_n,
                            "title": f"Key Milestone {cur_n}",
                            "subtitle": "Detailed Strategic Point",
                            "layout": "bullets",
                            "content": f"Important consideration for {topic[:30]}.",
                            "bullet_points": ["Critical operational guideline", "Actionable takeaway"],
                            "speaker_notes": "Continuing our examination of this key area."
                        })

                    # If model returned more than requested slide count, trim
                    if len(slides_list) > slide_count:
                        slides_list = slides_list[:slide_count]

                    parsed["slides"] = slides_list
                    parsed["outline"] = [{"slide_number": s["slide_number"], "title": s["title"], "layout": s.get("layout", "bullets")} for s in slides_list]
                    generated_result = parsed
                    break
            except Exception as e:
                logger.warning(f"Presentation generation attempt failed on {model}: {e}")

    # Fallback if Gemini failed or key not configured
    if not generated_result:
        logger.info("Using smart structural presentation builder fallback.")
        generated_result = build_fallback_presentation(
            topic=topic,
            slide_count=slide_count,
            audience=audience,
            tone=tone,
            language=language,
            doc_text=extracted_doc_text
        )

    if on_progress:
        await on_progress("Creating visuals / layout", 88, "Styling slide layouts, typography, and visual containers...")

    # Persist in DB
    title = generated_result.get("title", f"Presentation on {topic[:35]}")
    slides = generated_result.get("slides", [])
    outline = generated_result.get("outline", [])

    if on_progress:
        await on_progress("Preparing PPTX", 95, "Validating presentation structure and preparing editable PowerPoint file...")

    conversation_repository.update_presentation_project(
        conv_id,
        {
            "title": title,
            "theme_id": theme_id,
            "topic": topic,
            "slide_count": len(slides),
            "audience": audience,
            "level": level,
            "tone": tone,
            "language": language,
            "slides": slides,
            "outline": outline
        }
    )

    # Also update conversation title
    conversation_repository.update_title(conv_id, title)

    final_payload = {
        "conversation_id": conv_id,
        "title": title,
        "subtitle": generated_result.get("subtitle", ""),
        "slides": slides,
        "outline": outline,
        "theme_id": theme_id,
        "slide_count": len(slides)
    }

    if on_progress:
        await on_progress("Ready", 100, "Presentation generated successfully!")

    return final_payload


@router.post("/generate")
async def generate_presentation(req: GeneratePresentationRequest):
    """Synchronous presentation generator."""
    return await run_presentation_pipeline(req)


@router.post("/generate-stream")
async def generate_presentation_stream(req: GeneratePresentationRequest):
    """
    Streaming presentation generator using Server-Sent Events (SSE).
    Emits real progress events matching user stages:
    - Preparing presentation
    - Understanding your content
    - Building slide structure
    - Generating slides
    - Creating visuals / layout
    - Preparing PPTX
    - Ready
    """
    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def progress_cb(stage: str, percent: int, detail: str = ""):
            await queue.put({
                "type": "progress",
                "stage": stage,
                "percent": percent,
                "detail": detail
            })

        async def worker():
            try:
                res = await run_presentation_pipeline(req, on_progress=progress_cb)
                await queue.put({
                    "type": "complete",
                    "stage": "Ready",
                    "percent": 100,
                    "detail": "Ready",
                    "project": res
                })
            except Exception as exc:
                logger.error(f"Error in presentation stream generation: {exc}")
                await queue.put({
                    "type": "error",
                    "stage": "Error",
                    "percent": 0,
                    "detail": str(exc)
                })

        worker_task = asyncio.create_task(worker())

        try:
            while True:
                item = await queue.get()
                yield f"data: {json.dumps(item)}\n\n"
                if item.get("type") in ("complete", "error"):
                    break
        finally:
            await worker_task

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/slide/improve")
async def improve_slide(req: ImproveSlideRequest):
    """Improves or transforms an individual slide based on targeted AI action."""
    project = conversation_repository.get_presentation_project(req.conversation_id)
    if not project or not project.get("slides"):
        raise HTTPException(status_code=404, detail="Presentation project or slides not found")

    slides: List[Dict[str, Any]] = project["slides"]
    if req.slide_index < 0 or req.slide_index >= len(slides):
        raise HTTPException(status_code=400, detail="Invalid slide index")

    target_slide = slides[req.slide_index]
    action = req.action
    custom_inst = req.custom_instruction or ""

    client = get_gemini_client()
    if client:
        action_descriptions = {
            "simplify": "Simplify the language and make bullet points concise and punchy for easy viewing.",
            "add_technical_details": "Add deeper technical rigor, architectural specifics, and engineering precision.",
            "make_beginner_friendly": "Explain foundational concepts with beginner-friendly analogies and clear examples.",
            "convert_to_bullets": "Convert any dense paragraph text into clean, high-impact bullet points.",
            "convert_to_table": "Transform this information into a structured comparison table with 'headers' and 'rows'.",
            "regenerate": "Completely refresh and polish this slide with fresh perspective and top-tier phrasing."
        }
        inst = action_descriptions.get(action, custom_inst or "Polish and elevate this slide.")

        system_instruction = (
            "You are an Elite Presentation Slide Editor.\n"
            f"ACTION: {inst}\n"
            "Return the updated slide JSON maintaining or improving the slide structure.\n"
            "Output ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "title": "string",\n'
            '  "subtitle": "string",\n'
            '  "layout": "string",\n'
            '  "content": "string",\n'
            '  "bullet_points": ["string"],\n'
            '  "columns": [{"heading": "string", "bullets": ["string"]}],\n'
            '  "steps": [{"step": 1, "title": "string", "description": "string"}],\n'
            '  "table_data": {"headers": ["string"], "rows": [["string"]]} ,\n'
            '  "stats": [{"value": "string", "label": "string", "description": "string"}],\n'
            '  "speaker_notes": "string"\n'
            "}"
        )

        for model in GEMINI_CANDIDATE_MODELS:
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.3
                )
                resp = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model,
                    contents=f"CURRENT SLIDE DATA:\n{json.dumps(target_slide)}",
                    config=config
                )
                txt = (resp.text or "").strip()
                if txt.startswith("```"):
                    txt = re.sub(r'^```json\s*', '', txt)
                    txt = re.sub(r'^```\s*', '', txt)
                    txt = re.sub(r'\s*```$', '', txt)

                updated_slide = json.loads(txt)
                # Keep ID and slide number invariant
                updated_slide["id"] = target_slide["id"]
                updated_slide["slide_number"] = target_slide["slide_number"]
                slides[req.slide_index] = updated_slide

                conversation_repository.update_presentation_project(
                    req.conversation_id,
                    {"slides": slides}
                )
                return {"slide": updated_slide, "slide_index": req.slide_index}
            except Exception as e:
                logger.warning(f"Slide improve failed on {model}: {e}")

    # Fallback improvement
    if action == "simplify":
        if "bullet_points" in target_slide:
            target_slide["bullet_points"] = [b.split(".")[0].strip() + "." for b in target_slide["bullet_points"] if b.strip()]
    elif action == "add_technical_details":
        if "bullet_points" in target_slide:
            target_slide["bullet_points"].append("Low-latency execution validated across distributed nodes.")

    slides[req.slide_index] = target_slide
    conversation_repository.update_presentation_project(req.conversation_id, {"slides": slides})
    return {"slide": target_slide, "slide_index": req.slide_index}

@router.post("/slide/generate-notes")
async def generate_speaker_notes(req: GenerateNotesRequest):
    """Generates detailed, natural speaker notes for presentation slides."""
    project = conversation_repository.get_presentation_project(req.conversation_id)
    if not project or not project.get("slides"):
        raise HTTPException(status_code=404, detail="Project not found")

    slides: List[Dict[str, Any]] = project["slides"]
    client = get_gemini_client()

    indices_to_process = [req.slide_index] if req.slide_index is not None else list(range(len(slides)))

    for idx in indices_to_process:
        if 0 <= idx < len(slides):
            s = slides[idx]
            if client:
                try:
                    prompt = (
                        f"Write concise, engaging spoken presenter notes (2-3 sentences) for this slide:\n"
                        f"Title: {s.get('title')}\n"
                        f"Content: {s.get('content')}\n"
                        f"Bullets: {json.dumps(s.get('bullet_points', []))}\n"
                        "Speak conversationally as an expert presenting to an audience. Return ONLY the spoken sentences."
                    )
                    resp = await asyncio.to_thread(
                        client.models.generate_content,
                        model=GEMINI_CANDIDATE_MODELS[0],
                        contents=prompt
                    )
                    notes = (resp.text or "").strip()
                    if notes:
                        s["speaker_notes"] = notes
                except Exception as e:
                    logger.warning(f"Error generating speaker notes: {e}")
            if not s.get("speaker_notes"):
                s["speaker_notes"] = f"On this slide, focus on {s.get('title', '')} and highlight its practical value."

    conversation_repository.update_presentation_project(req.conversation_id, {"slides": slides})
    return {"slides": slides}

# ========================================================
# HIGH-FIDELITY POWERPOINT (.PPTX) EXPORT ENGINE
# ========================================================

THEME_PALETTES = {
    "modern-professional": {
        "bg": RGBColor(255, 255, 255),
        "primary": RGBColor(15, 23, 42),       # Dark Slate
        "accent": RGBColor(16, 185, 129),      # Emerald
        "accent_dark": RGBColor(5, 150, 105),
        "secondary_text": RGBColor(71, 85, 105),
        "card_bg": RGBColor(248, 250, 252),
        "card_border": RGBColor(226, 232, 240),
        "header_band": RGBColor(15, 23, 42),
        "header_text": RGBColor(255, 255, 255),
        "font_family": "Segoe UI"
    },
    "corporate": {
        "bg": RGBColor(255, 255, 255),
        "primary": RGBColor(30, 58, 138),       # Navy
        "accent": RGBColor(14, 165, 233),       # Sky blue
        "accent_dark": RGBColor(2, 132, 199),
        "secondary_text": RGBColor(51, 65, 85),
        "card_bg": RGBColor(241, 245, 249),
        "card_border": RGBColor(203, 213, 225),
        "header_band": RGBColor(30, 58, 138),
        "header_text": RGBColor(255, 255, 255),
        "font_family": "Arial"
    },
    "academic": {
        "bg": RGBColor(253, 253, 251),
        "primary": RGBColor(136, 19, 55),       # Deep Burgundy
        "accent": RGBColor(159, 18, 57),
        "accent_dark": RGBColor(136, 19, 55),
        "secondary_text": RGBColor(68, 64, 60),
        "card_bg": RGBColor(245, 245, 244),
        "card_border": RGBColor(214, 211, 209),
        "header_band": RGBColor(136, 19, 55),
        "header_text": RGBColor(255, 255, 255),
        "font_family": "Georgia"
    },
    "minimal": {
        "bg": RGBColor(255, 255, 255),
        "primary": RGBColor(24, 24, 27),        # Zinc 900
        "accent": RGBColor(39, 39, 42),
        "accent_dark": RGBColor(9, 9, 11),
        "secondary_text": RGBColor(82, 82, 91),
        "card_bg": RGBColor(250, 250, 250),
        "card_border": RGBColor(228, 228, 231),
        "header_band": RGBColor(24, 24, 27),
        "header_text": RGBColor(255, 255, 255),
        "font_family": "Calibri"
    },
    "technology": {
        "bg": RGBColor(15, 23, 42),            # Dark Slate 900
        "primary": RGBColor(248, 250, 252),    # Light text
        "accent": RGBColor(6, 182, 212),       # Electric Cyan
        "accent_dark": RGBColor(8, 145, 178),
        "secondary_text": RGBColor(148, 163, 184),
        "card_bg": RGBColor(30, 41, 59),
        "card_border": RGBColor(51, 65, 85),
        "header_band": RGBColor(30, 41, 59),
        "header_text": RGBColor(6, 182, 212),
        "font_family": "Consolas"
    },
    "dark-professional": {
        "bg": RGBColor(24, 24, 27),            # Zinc 900
        "primary": RGBColor(255, 255, 255),
        "accent": RGBColor(245, 158, 11),      # Amber
        "accent_dark": RGBColor(217, 119, 6),
        "secondary_text": RGBColor(161, 161, 170),
        "card_bg": RGBColor(39, 39, 42),
        "card_border": RGBColor(63, 63, 70),
        "header_band": RGBColor(39, 39, 42),
        "header_text": RGBColor(255, 255, 255),
        "font_family": "Segoe UI"
    },
    "clean-business": {
        "bg": RGBColor(255, 255, 255),
        "primary": RGBColor(3, 105, 161),       # Sky 700
        "accent": RGBColor(2, 132, 199),
        "accent_dark": RGBColor(3, 105, 161),
        "secondary_text": RGBColor(71, 85, 105),
        "card_bg": RGBColor(240, 249, 255),
        "card_border": RGBColor(186, 230, 253),
        "header_band": RGBColor(3, 105, 161),
        "header_text": RGBColor(255, 255, 255),
        "font_family": "Trebuchet MS"
    },
    "creative": {
        "bg": RGBColor(255, 255, 255),
        "primary": RGBColor(88, 28, 135),       # Deep Purple
        "accent": RGBColor(236, 72, 153),      # Pink/Coral
        "accent_dark": RGBColor(219, 39, 119),
        "secondary_text": RGBColor(75, 85, 99),
        "card_bg": RGBColor(253, 242, 248),
        "card_border": RGBColor(251, 207, 232),
        "header_band": RGBColor(88, 28, 135),
        "header_text": RGBColor(255, 255, 255),
        "font_family": "Segoe UI"
    }
}

@router.post("/export/pptx")
def export_pptx(req: ExportPptxRequest):
    """
    Builds a real, 100% editable Microsoft PowerPoint (.pptx) file.
    Uses python-pptx with 16:9 widescreen layout and high-fidelity shapes.
    """
    # Load project slides if not passed in body
    slides = req.slides
    title = req.title or "Presentation"
    theme_id = req.theme_id or "modern-professional"

    if not slides:
        project = conversation_repository.get_presentation_project(req.conversation_id)
        if project and project.get("slides"):
            slides = project["slides"]
            title = project.get("title", title)
            theme_id = project.get("theme_id", theme_id)

    if not slides:
        raise HTTPException(status_code=400, detail="No slides available to export")

    theme = THEME_PALETTES.get(theme_id, THEME_PALETTES["modern-professional"])

    # Create Presentation Widescreen 16:9 (13.333 x 7.5 inches)
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    for s_idx, s in enumerate(slides):
        slide = prs.slides.add_slide(blank_layout)

        # Set Background Color
        bg = slide.background
        bg_fill = bg.fill
        bg_fill.solid()
        bg_fill.fore_color.rgb = theme["bg"]

        # Speaker notes
        notes_text = s.get("speaker_notes", "")
        if notes_text:
            notes_slide = slide.notes_slide
            notes_slide.notes_text_frame.text = notes_text

        layout = s.get("layout", "bullets")
        s_title = s.get("title", "")
        s_subtitle = s.get("subtitle", "")
        content = s.get("content", "")

        # ----------------------------------------------------
        # 1. TITLE SLIDE LAYOUT
        # ----------------------------------------------------
        if layout == "title" or s_idx == 0:
            # Decorative Top Accent Bar
            accent_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(1.8), Inches(1.5), Inches(0.1))
            accent_bar.fill.solid()
            accent_bar.fill.fore_color.rgb = theme["accent"]
            accent_bar.line.fill.background()

            # Main Presentation Title
            title_box = slide.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(10.8), Inches(2.2))
            tf = title_box.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = s_title
            p.font.name = theme["font_family"]
            p.font.size = Pt(44)
            p.font.bold = True
            p.font.color.rgb = theme["primary"]

            # Subtitle
            sub_box = slide.shapes.add_textbox(Inches(1.2), Inches(4.5), Inches(10.8), Inches(1.2))
            stf = sub_box.text_frame
            stf.word_wrap = True
            sp = stf.paragraphs[0]
            sp.text = s_subtitle or content or "Professional Presentation Deck"
            sp.font.name = theme["font_family"]
            sp.font.size = Pt(20)
            sp.font.color.rgb = theme["secondary_text"]

            # Presenter info footer
            foot_box = slide.shapes.add_textbox(Inches(1.2), Inches(6.0), Inches(10.8), Inches(0.6))
            ftf = foot_box.text_frame
            fp = ftf.paragraphs[0]
            fp.text = "Generated with seeSpeak AI • Professional Edition"
            fp.font.name = theme["font_family"]
            fp.font.size = Pt(12)
            fp.font.color.rgb = theme["accent_dark"]
            continue

        # ----------------------------------------------------
        # STANDARD SLIDE HEADER (For all non-title slides)
        # ----------------------------------------------------
        # Top Header Divider Line
        h_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), Inches(11.733), Inches(0.04))
        h_line.fill.solid()
        h_line.fill.fore_color.rgb = theme["accent"]
        h_line.line.fill.background()

        # Header Title Box
        head_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.55), Inches(10.5), Inches(0.9))
        htf = head_box.text_frame
        htf.word_wrap = True
        hp = htf.paragraphs[0]
        hp.text = s_title
        hp.font.name = theme["font_family"]
        hp.font.size = Pt(28)
        hp.font.bold = True
        hp.font.color.rgb = theme["primary"]

        if s_subtitle:
            sp = htf.add_paragraph()
            sp.text = s_subtitle
            sp.font.name = theme["font_family"]
            sp.font.size = Pt(12)
            sp.font.color.rgb = theme["secondary_text"]

        # Slide Number Badge (Top Right)
        num_box = slide.shapes.add_textbox(Inches(11.3), Inches(0.55), Inches(1.2), Inches(0.6))
        ntf = num_box.text_frame
        np = ntf.paragraphs[0]
        np.text = f"{s_idx + 1}"
        np.alignment = PP_ALIGN.RIGHT
        np.font.name = theme["font_family"]
        np.font.size = Pt(16)
        np.font.bold = True
        np.font.color.rgb = theme["accent"]

        # ----------------------------------------------------
        # 2. TWO-COLUMN LAYOUT
        # ----------------------------------------------------
        if layout == "two-column" or layout == "comparison":
            columns = s.get("columns", [])
            col_left = columns[0] if len(columns) > 0 else {"heading": "Overview", "bullets": s.get("bullet_points", [])[:3]}
            col_right = columns[1] if len(columns) > 1 else {"heading": "Details", "bullets": s.get("bullet_points", [])[3:6]}

            # Left Card Container
            card1 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.85), Inches(5.6), Inches(4.8))
            card1.fill.solid()
            card1.fill.fore_color.rgb = theme["card_bg"]
            card1.line.color.rgb = theme["card_border"]

            c1_box = slide.shapes.add_textbox(Inches(1.1), Inches(2.1), Inches(5.0), Inches(4.3))
            c1_tf = c1_box.text_frame
            c1_tf.word_wrap = True
            c1_head = c1_tf.paragraphs[0]
            c1_head.text = col_left.get("heading", "Key Insights")
            c1_head.font.name = theme["font_family"]
            c1_head.font.size = Pt(20)
            c1_head.font.bold = True
            c1_head.font.color.rgb = theme["primary"]

            for b in col_left.get("bullets", []):
                bp = c1_tf.add_paragraph()
                bp.text = f"• {b}"
                bp.font.name = theme["font_family"]
                bp.font.size = Pt(14)
                bp.font.color.rgb = theme["secondary_text"]
                bp.space_before = Pt(8)

            # Right Card Container
            card2 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.9), Inches(1.85), Inches(5.6), Inches(4.8))
            card2.fill.solid()
            card2.fill.fore_color.rgb = theme["card_bg"]
            card2.line.color.rgb = theme["card_border"]

            c2_box = slide.shapes.add_textbox(Inches(7.2), Inches(2.1), Inches(5.0), Inches(4.3))
            c2_tf = c2_box.text_frame
            c2_tf.word_wrap = True
            c2_head = c2_tf.paragraphs[0]
            c2_head.text = col_right.get("heading", "Impact & Outcomes")
            c2_head.font.name = theme["font_family"]
            c2_head.font.size = Pt(20)
            c2_head.font.bold = True
            c2_head.font.color.rgb = theme["primary"]

            for b in col_right.get("bullets", []):
                bp = c2_tf.add_paragraph()
                bp.text = f"• {b}"
                bp.font.name = theme["font_family"]
                bp.font.size = Pt(14)
                bp.font.color.rgb = theme["secondary_text"]
                bp.space_before = Pt(8)
            continue

        # ----------------------------------------------------
        # 3. PROCESS / TIMELINE / STEPS LAYOUT
        # ----------------------------------------------------
        if layout in ["process", "timeline", "steps"]:
            steps = s.get("steps", [])
            if not steps:
                steps = [
                    {"step": i+1, "title": f"Phase {i+1}", "description": b}
                    for i, b in enumerate(s.get("bullet_points", [])[:4])
                ]
            num_steps = max(1, min(len(steps), 4))
            card_width = (11.733 - ((num_steps - 1) * 0.35)) / num_steps

            for idx, step_item in enumerate(steps[:num_steps]):
                c_left = 0.8 + idx * (card_width + 0.35)
                scard = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(c_left), Inches(2.2), Inches(card_width), Inches(4.3))
                scard.fill.solid()
                scard.fill.fore_color.rgb = theme["card_bg"]
                scard.line.color.rgb = theme["card_border"]

                # Step Badge Pill
                badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(c_left + 0.3), Inches(2.5), Inches(1.5), Inches(0.45))
                badge.fill.solid()
                badge.fill.fore_color.rgb = theme["accent"]
                badge.line.fill.background()
                btf = badge.text_frame
                bp = btf.paragraphs[0]
                bp.text = f"STEP {step_item.get('step', idx+1)}"
                bp.alignment = PP_ALIGN.CENTER
                bp.font.bold = True
                bp.font.size = Pt(11)
                bp.font.color.rgb = RGBColor(255, 255, 255)

                # Step Content
                s_box = slide.shapes.add_textbox(Inches(c_left + 0.3), Inches(3.2), Inches(card_width - 0.6), Inches(3.0))
                stf = s_box.text_frame
                stf.word_wrap = True
                sp1 = stf.paragraphs[0]
                sp1.text = step_item.get("title", f"Step {idx+1}")
                sp1.font.name = theme["font_family"]
                sp1.font.size = Pt(18)
                sp1.font.bold = True
                sp1.font.color.rgb = theme["primary"]

                sp2 = stf.add_paragraph()
                sp2.text = step_item.get("description", "")
                sp2.font.name = theme["font_family"]
                sp2.font.size = Pt(13)
                sp2.font.color.rgb = theme["secondary_text"]
                sp2.space_before = Pt(8)
            continue

        # ----------------------------------------------------
        # 4. STATS / METRICS LAYOUT
        # ----------------------------------------------------
        if layout == "stats":
            stats = s.get("stats", [])
            if not stats:
                stats = [
                    {"value": "99.9%", "label": "Reliability", "description": "Guaranteed performance standard."},
                    {"value": "4.2x", "label": "Acceleration", "description": "Efficiency gain across teams."},
                    {"value": "40%", "label": "Cost Savings", "description": "Resource optimization delivered."}
                ]
            num_stats = max(1, min(len(stats), 4))
            stat_w = (11.733 - ((num_stats - 1) * 0.4)) / num_stats

            for idx, stat_item in enumerate(stats[:num_stats]):
                s_left = 0.8 + idx * (stat_w + 0.4)
                card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(s_left), Inches(2.2), Inches(stat_w), Inches(4.3))
                card.fill.solid()
                card.fill.fore_color.rgb = theme["card_bg"]
                card.line.color.rgb = theme["card_border"]

                # Stat Value (Large bold number)
                s_box = slide.shapes.add_textbox(Inches(s_left + 0.3), Inches(2.6), Inches(stat_w - 0.6), Inches(3.5))
                stf = s_box.text_frame
                stf.word_wrap = True
                p_val = stf.paragraphs[0]
                p_val.text = stat_item.get("value", "100%")
                p_val.font.name = theme["font_family"]
                p_val.font.size = Pt(40)
                p_val.font.bold = True
                p_val.font.color.rgb = theme["accent"]

                p_label = stf.add_paragraph()
                p_label.text = stat_item.get("label", "Metric")
                p_label.font.name = theme["font_family"]
                p_label.font.size = Pt(18)
                p_label.font.bold = True
                p_label.font.color.rgb = theme["primary"]
                p_label.space_before = Pt(8)

                if stat_item.get("description"):
                    p_desc = stf.add_paragraph()
                    p_desc.text = stat_item.get("description", "")
                    p_desc.font.name = theme["font_family"]
                    p_desc.font.size = Pt(13)
                    p_desc.font.color.rgb = theme["secondary_text"]
                    p_desc.space_before = Pt(6)
            continue

        # ----------------------------------------------------
        # 5. TABLE LAYOUT
        # ----------------------------------------------------
        if layout == "table" and s.get("table_data"):
            tbl_data = s.get("table_data", {})
            headers = tbl_data.get("headers", ["Category", "Traditional", "Modern Standard", "Outcome"])
            rows = tbl_data.get("rows", [["Item A", "Legacy", "Cloud Native", "High Efficiency"]])

            n_rows = len(rows) + 1
            n_cols = len(headers)

            t_shape = slide.shapes.add_table(n_rows, n_cols, Inches(0.8), Inches(2.0), Inches(11.733), Inches(4.5))
            tbl = t_shape.table

            # Format Header Row
            for col_idx, h_text in enumerate(headers):
                cell = tbl.cell(0, col_idx)
                cell.fill.solid()
                cell.fill.fore_color.rgb = theme["header_band"]
                cell.text = h_text
                p = cell.text_frame.paragraphs[0]
                p.font.name = theme["font_family"]
                p.font.size = Pt(14)
                p.font.bold = True
                p.font.color.rgb = theme["header_text"]

            # Format Data Rows
            for row_idx, r_data in enumerate(rows):
                for col_idx, val in enumerate(r_data):
                    if col_idx < n_cols:
                        cell = tbl.cell(row_idx + 1, col_idx)
                        cell.fill.solid()
                        cell.fill.fore_color.rgb = theme["card_bg"] if row_idx % 2 == 0 else theme["bg"]
                        cell.text = str(val)
                        p = cell.text_frame.paragraphs[0]
                        p.font.name = theme["font_family"]
                        p.font.size = Pt(12)
                        p.font.color.rgb = theme["secondary_text"]
            continue

        # ----------------------------------------------------
        # 6. DEFAULT / BULLETS / CONCLUSION LAYOUT
        # ----------------------------------------------------
        # Overview Text Box
        if content:
            intro_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.733), Inches(0.8))
            itf = intro_box.text_frame
            itf.word_wrap = True
            ip = itf.paragraphs[0]
            ip.text = content
            ip.font.name = theme["font_family"]
            ip.font.size = Pt(16)
            ip.font.bold = True
            ip.font.color.rgb = theme["secondary_text"]

        bullets_y = 2.6 if content else 1.9
        bullets = s.get("bullet_points", [])

        # Bullet List Box
        bullet_box = slide.shapes.add_textbox(Inches(0.8), Inches(bullets_y), Inches(11.733), Inches(4.8))
        btf = bullet_box.text_frame
        btf.word_wrap = True

        for b_idx, bullet in enumerate(bullets):
            bp = btf.paragraphs[0] if b_idx == 0 else btf.add_paragraph()
            bp.text = f"•  {bullet}"
            bp.font.name = theme["font_family"]
            bp.font.size = Pt(16)
            bp.font.color.rgb = theme["primary"]
            bp.space_before = Pt(12)

    # Save to memory stream
    output_stream = io.BytesIO()
    prs.save(output_stream)
    output_stream.seek(0)

    # Safe filename
    safe_title = re.sub(r'[^\w\-_\.]', '_', title)[:40]
    filename = f"{safe_title}.pptx"

    return StreamingResponse(
        output_stream,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { SupportedLanguage, Conversation } from '../types';
import { 
  ResumeData, 
  TemplateId, 
  AccentColor, 
  ResumeProject, 
  AtsAnalysisData 
} from '../types/resume';
import { 
  ALL_TEMPLATES, 
  SAMPLE_RESUME_DATA, 
  getTemplateById 
} from '../components/resume/templates/templateRegistry';
import { TemplateGallery } from '../components/resume/TemplateGallery';
import { ResumeRenderer } from '../components/resume/templates/ResumeRenderer';
import { ResumeEditorForm } from '../components/resume/ResumeEditorForm';
import { AtsAnalysisPanel } from '../components/resume/AtsAnalysisPanel';
import { VoiceResumeAssistant } from '../components/resume/VoiceResumeAssistant';

import { 
  FileText, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Plus, 
  Wand2, 
  BarChart3, 
  Target, 
  Eye, 
  Edit3, 
  FileCheck, 
  Upload, 
  Mic, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  History, 
  ChevronLeft, 
  ShieldCheck, 
  FolderPlus 
} from 'lucide-react';

interface ResumeBuilderSessionProps {
  onBack: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage?: (lang: SupportedLanguage) => void;
  onSelectFeature?: (route: string) => void;
  onNewConversation?: () => void;
  conversationId?: string;
  onConversationCreated?: (conv: Conversation) => void;
  initialPrompt?: string;
}

export const ResumeBuilderSession: React.FC<ResumeBuilderSessionProps> = ({
  onBack,
  selectedLanguage,
  onSelectLanguage,
  onSelectFeature,
  onNewConversation,
  conversationId,
  onConversationCreated,
  initialPrompt,
}) => {
  // Navigation & View state: 'gallery' first as requested!
  const [view, setView] = useState<'gallery' | 'editor'>('gallery');
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [templateId, setTemplateId] = useState<TemplateId>('ats-professional');
  const [resumeData, setResumeData] = useState<ResumeData>(SAMPLE_RESUME_DATA);

  // Target Job Alignment
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [jobDescription, setJobDescription] = useState('');

  // Right Panel Tab in Editor: 'ai_assistant' | 'ats_panel' | 'voice'
  const [editorSubTab, setEditorSubTab] = useState<'ai_assistant' | 'ats_panel' | 'voice'>('ai_assistant');
  
  // Mobile / Tablet Tab Switcher: 'editor' | 'preview' | 'ai'
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview' | 'ai'>('editor');

  // Input Modal / Drawer: null | 'voice' | 'type' | 'upload'
  const [activeInputDrawer, setActiveInputDrawer] = useState<'voice' | 'type' | 'upload' | null>(null);
  const [typedQuickInput, setTypedQuickInput] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Loading & Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [isImprovingSection, setIsImprovingSection] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [atsAnalysis, setAtsAnalysis] = useState<AtsAnalysisData | null>(null);

  // Zoom & Real Page Count
  const [zoomLevel, setZoomLevel] = useState<number>(0.95);
  const [pageCount, setPageCount] = useState<number>(1);
  const previewPrintRef = useRef<HTMLDivElement | null>(null);

  // Saved Projects List
  const [projectsList, setProjectsList] = useState<ResumeProject[]>([]);
  const [showProjectsDrawer, setShowProjectsDrawer] = useState(false);

  // Fetch project list from backend
  const fetchProjectList = useCallback(async () => {
    try {
      const res = await fetch('/api/resume/history');
      if (res.ok) {
        const list = await res.json();
        setProjectsList(list);
      }
    } catch (e) {
      console.error('Failed to load resume history:', e);
    }
  }, []);

  // Load resume project from backend
  const loadProject = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/resume/project/${convId}`);
      if (res.ok) {
        const proj = await res.json();
        if (proj.template_id) {
          setTemplateId(proj.template_id as TemplateId);
        }
        if (proj.target_company) setTargetCompany(proj.target_company);
        if (proj.target_role) setTargetRole(proj.target_role);
        if (proj.job_description) setJobDescription(proj.job_description);
        if (proj.resume_data && Object.keys(proj.resume_data).length > 0) {
          // Merge with default schema to preserve fields
          setResumeData((prev) => ({
            ...prev,
            ...proj.resume_data,
            personalInfo: { ...prev.personalInfo, ...(proj.resume_data.personalInfo || {}) },
            skills: { ...prev.skills, ...(proj.resume_data.skills || {}) },
            sectionOrder: proj.resume_data.sectionOrder || prev.sectionOrder,
          }));
        }
        if (proj.ats_analysis) setAtsAnalysis(proj.ats_analysis);
      }
    } catch (e) {
      console.error('Failed to load resume project:', e);
    }
  }, []);

  // Initialize Conversation
  useEffect(() => {
    const initConversation = async () => {
      if (conversationId) {
        setActiveConvId(conversationId);
        await loadProject(conversationId);
      } else {
        try {
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              feature: 'ai-resume-builder',
              language: selectedLanguage,
              title: 'Professional Resume',
            }),
          });
          if (res.ok) {
            const conv: Conversation = await res.json();
            setActiveConvId(conv.id);
            if (onConversationCreated) onConversationCreated(conv);
            await loadProject(conv.id);
          }
        } catch (e) {
          console.error('Failed to create resume conversation:', e);
        }
      }
      fetchProjectList();
    };
    initConversation();
  }, [conversationId, loadProject, fetchProjectList]);

  // Measure Real Document Page Count
  useEffect(() => {
    const calculatePages = () => {
      if (!previewPrintRef.current) return;
      const el = previewPrintRef.current;
      // 1 standard US Letter / A4 printable page height is ~1056px at 96dpi
      const standardPageHeight = 1056;
      const height = el.scrollHeight;
      const pages = Math.max(1, Math.ceil(height / standardPageHeight));
      setPageCount(pages);
    };

    calculatePages();
    const interval = setInterval(calculatePages, 1200);
    return () => clearInterval(interval);
  }, [resumeData, templateId, zoomLevel]);

  // Save changes to backend
  const saveProject = useCallback(async (overrides?: Partial<{
    resume_data: ResumeData;
    template_id: string;
    target_company: string;
    target_role: string;
    job_description: string;
    ats_analysis: AtsAnalysisData;
  }>) => {
    if (!activeConvId) return;
    try {
      await fetch(`/api/resume/project/${activeConvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: overrides?.template_id || templateId,
          target_company: overrides?.target_company !== undefined ? overrides.target_company : targetCompany,
          target_role: overrides?.target_role !== undefined ? overrides.target_role : targetRole,
          job_description: overrides?.job_description !== undefined ? overrides.job_description : jobDescription,
          resume_data: overrides?.resume_data || resumeData,
          ats_analysis: overrides?.ats_analysis || atsAnalysis,
        }),
      });
      fetchProjectList();
    } catch (e) {
      console.error('Failed to save project:', e);
    }
  }, [activeConvId, templateId, targetCompany, targetRole, jobDescription, resumeData, atsAnalysis, fetchProjectList]);

  // Template Selection Action
  const handleSelectTemplate = (newTemplateId: TemplateId) => {
    setTemplateId(newTemplateId);
    saveProject({ template_id: newTemplateId });
    setView('editor');
    setStatusMessage(`Selected template: ${getTemplateById(newTemplateId).name}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Voice Ingestion -> Merges into ResumeData
  const handleVoiceExtracted = async (spokenText: string) => {
    if (!spokenText.trim() || !activeConvId) return;
    setIsLoading(true);
    setStatusMessage('AI is extracting your details and merging into your resume...');
    try {
      const res = await fetch('/api/resume/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          text: spokenText,
          existing_resume_data: resumeData,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resume_data) {
          const merged: ResumeData = {
            ...resumeData,
            ...data.resume_data,
            personalInfo: { ...resumeData.personalInfo, ...(data.resume_data.personalInfo || {}) },
            skills: { ...resumeData.skills, ...(data.resume_data.skills || {}) },
          };
          setResumeData(merged);
          saveProject({ resume_data: merged });
          setStatusMessage('Updated resume with spoken details!');
          setActiveInputDrawer(null);
          setTimeout(() => setStatusMessage(null), 4000);
        }
      }
    } catch (err) {
      console.error('Voice extraction error:', err);
      setStatusMessage('Failed to extract voice data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Natural Language Voice Command Execution
  const handleVoiceCommand = async (command: string): Promise<string | void> => {
    if (!command.trim() || !activeConvId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/resume/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          command,
          resume_data: resumeData,
          template_id: templateId,
          target_role: targetRole,
          target_company: targetCompany,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.updated_resume_data) {
          setResumeData(result.updated_resume_data);
        }
        if (result.updated_template_id && ALL_TEMPLATES.some((t) => t.id === result.updated_template_id)) {
          setTemplateId(result.updated_template_id as TemplateId);
        }
        if (result.updated_target_role) {
          setTargetRole(result.updated_target_role);
        }
        const msg = result.message || 'Updated resume based on your voice command!';
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(null), 4000);
        return msg;
      }
    } catch (e) {
      console.error('Voice command error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Section Polishing & Bullet Assistance
  const handlePolishSection = async (section: 'summary' | 'experience' | 'projects' | 'bullet', content: any) => {
    if (!activeConvId) return;
    setIsImprovingSection(section);
    try {
      const res = await fetch('/api/resume/improve-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          section,
          content,
          target_role: targetRole,
          target_company: targetCompany,
          job_description: jobDescription,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (section === 'summary' && typeof result.improved_content === 'string') {
          const updated = { ...resumeData, summary: result.improved_content };
          setResumeData(updated);
          saveProject({ resume_data: updated });
          setStatusMessage('Polished summary with action impact!');
          setTimeout(() => setStatusMessage(null), 3000);
        } else if (section === 'bullet') {
          return result;
        }
      }
    } catch (err) {
      console.error('Section polish error:', err);
    } finally {
      setIsImprovingSection(null);
    }
  };

  // Generate Professional Summary based strictly on credentials
  const handleGenerateSummary = async () => {
    if (!activeConvId) return;
    setIsGeneratingSummary(true);
    setStatusMessage('Synthesizing executive summary from your credentials...');
    try {
      const res = await fetch('/api/resume/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          resume_data: resumeData,
          target_role: targetRole,
          target_company: targetCompany,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.summary) {
          const updated = { ...resumeData, summary: result.summary };
          setResumeData(updated);
          saveProject({ resume_data: updated });
          setStatusMessage('Synthesized professional summary!');
          setTimeout(() => setStatusMessage(null), 3500);
        }
      }
    } catch (e) {
      console.error('Generate summary error:', e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Run ATS Analysis
  const handleRunAtsAnalysis = async () => {
    if (!activeConvId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/resume/ats-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          resume_data: resumeData,
          target_role: targetRole,
          target_company: targetCompany,
          job_description: jobDescription,
        }),
      });
      if (res.ok) {
        const analysis = await res.json();
        setAtsAnalysis(analysis);
        saveProject({ ats_analysis: analysis });
        setStatusMessage('ATS compatibility scan complete!');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (e) {
      console.error('ATS analyze error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimize for Single Page Fit
  const handleOptimizeOnePage = async () => {
    if (!activeConvId) return;
    setIsLoading(true);
    setStatusMessage('Intelligently condensing phrasing and spacing for 1-page fit...');
    try {
      const res = await fetch('/api/resume/optimize-one-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          resume_data: resumeData,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.resume_data) {
          setResumeData(result.resume_data);
          setTemplateId('one-page-compact');
          saveProject({ resume_data: result.resume_data, template_id: 'one-page-compact' });
          setStatusMessage('Optimized to fit on 1 single page!');
          setTimeout(() => setStatusMessage(null), 4000);
        }
      }
    } catch (e) {
      console.error('One page optimize error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // File Upload Document Handler (PDF, DOCX, TXT)
  const handleFileUpload = async (file: File) => {
    if (!file || !activeConvId) return;
    setIsLoading(true);
    setStatusMessage(`Parsing uploaded ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append('conversation_id', activeConvId);
      formData.append('file', file);

      const res = await fetch('/api/resume/upload-document', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        if (result.resume_data) {
          setResumeData(result.resume_data);
          saveProject({ resume_data: result.resume_data });
          setStatusMessage('Successfully extracted details from uploaded resume!');
          setActiveInputDrawer(null);
          setTimeout(() => setStatusMessage(null), 4000);
        }
      } else {
        const err = await res.json();
        setStatusMessage(err.detail || 'Could not parse resume file.');
      }
    } catch (e) {
      console.error('File upload error:', e);
      setStatusMessage('Failed to upload and parse resume file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download DOCX
  const handleDownloadDocx = async () => {
    try {
      const res = await fetch('/api/resume/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          resume_data: resumeData,
          title: resumeData.personalInfo.fullName || 'Resume',
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const candidateName = (resumeData.personalInfo.fullName || 'Candidate').replace(/\s+/g, '_');
        a.download = `${candidateName}_Resume.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error('DOCX download error:', e);
    }
  };

  // Download PDF via High-Fidelity Print Engine
  const handleDownloadPdf = () => {
    window.print();
  };

  // Start New Project
  const handleCreateNewProject = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'ai-resume-builder',
          language: selectedLanguage,
          title: 'New Resume Project',
        }),
      });
      if (res.ok) {
        const conv: Conversation = await res.json();
        setActiveConvId(conv.id);
        if (onConversationCreated) onConversationCreated(conv);
        setResumeData(SAMPLE_RESUME_DATA);
        setTemplateId('ats-professional');
        setView('gallery');
        fetchProjectList();
      }
    } catch (e) {
      console.error('Failed to create new project:', e);
    }
  };

  const activeTemplate = getTemplateById(templateId);

  // -------------------------------------------------------------
  // RENDER: STEP 1 - TEMPLATE SELECTION GALLERY
  // -------------------------------------------------------------
  if (view === 'gallery') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] overflow-hidden">
        <ConversationHeader
          title="AI Resume Builder"
          subtitle="Choose a professional template to start building your ATS-optimized resume"
          onBack={onBack}
          onNewConversation={handleCreateNewProject}
          language={selectedLanguage}
          activeFeatureId="ai-resume-builder"
          onSelectFeature={onSelectFeature}
        />

        <TemplateGallery
          onSelectTemplate={handleSelectTemplate}
          selectedTemplateId={templateId}
          activeResumeData={resumeData}
          canCancel={true}
          onCancel={() => setView('editor')}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: STEP 2 - RESUME BUILDER STUDIO
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Print Stylesheet for High-Fidelity Vector PDF Export */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #resume-preview-document, #resume-preview-document * {
            visibility: visible;
          }
          #resume-preview-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0.4in !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}} />

      {/* Top Header */}
      <ConversationHeader
        title="AI Resume Builder"
        subtitle="Professional template editor with natural voice extraction & ATS alignment"
        onBack={onBack}
        onNewConversation={handleCreateNewProject}
        language={selectedLanguage}
        activeFeatureId="ai-resume-builder"
        onSelectFeature={onSelectFeature}
      />

      {/* TOP STUDIO TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Template Switching Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('gallery')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Templates</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-0.5 hidden sm:block"></div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Active:</span>
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {activeTemplate.name}
            </span>
          </div>

          <button
            onClick={() => setView('gallery')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
          >
            [ Change Template ]
          </button>
        </div>

        {/* Real Page Count & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Real Page Count Badge */}
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border flex items-center gap-1 ${
            pageCount === 1
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
          }`}>
            <FileCheck size={13} />
            <span>{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
          </span>

          {/* Single Page Fit Quick Optimizer */}
          {pageCount > 1 && (
            <button
              onClick={handleOptimizeOnePage}
              disabled={isLoading}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
              title="Condense bullets and reduce excess spacing to fit exactly on 1 page"
            >
              <Wand2 size={12} />
              <span>Fit 1 Page</span>
            </button>
          )}

          {/* Zoom controls */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.05))}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono text-[10px] w-9 text-center font-bold">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.3, z + 0.05))}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoomLevel(0.95)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              title="Reset zoom"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={handleDownloadDocx}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
              title="Download Microsoft Word (.docx)"
            >
              <FileText size={13} />
              <span className="hidden sm:inline">Word</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
              title="Download high-resolution print PDF"
            >
              <Download size={13} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK INGESTION BAR ("HOW WOULD YOU LIKE TO ADD YOUR INFORMATION?") */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-200/80 dark:border-emerald-800/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 font-mono flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>How would you like to add information?</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveInputDrawer('voice')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs hover:bg-emerald-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Mic size={13} className="text-emerald-600" />
            <span>🎤 Speak Naturally</span>
          </button>

          <button
            onClick={() => setActiveInputDrawer('type')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span>✍ Paste / Quick Type</span>
          </button>

          <button
            onClick={() => setActiveInputDrawer('upload')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Upload size={12} />
            <span>📄 Upload Resume (PDF/DOCX)</span>
          </button>
        </div>
      </div>

      {/* STATUS NOTIFICATION BANNER */}
      {statusMessage && (
        <div className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs px-4 py-2 border-b border-emerald-300 dark:border-emerald-800 flex items-center justify-between animate-fadeIn shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <span className="text-[10px] font-mono opacity-70">Auto-saved to database</span>
        </div>
      )}

      {/* QUICK INPUT MODAL / DRAWER */}
      {activeInputDrawer && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0 shadow-md animate-fadeIn">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase font-mono text-slate-900 dark:text-white">
                {activeInputDrawer === 'voice' && '🎤 Voice Input & Extraction'}
                {activeInputDrawer === 'type' && '✍ Natural Language Text Extraction'}
                {activeInputDrawer === 'upload' && '📄 Upload Existing Resume File'}
              </span>
              <button
                onClick={() => setActiveInputDrawer(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {activeInputDrawer === 'voice' && (
              <VoiceResumeAssistant
                onVoiceExtracted={handleVoiceExtracted}
                onVoiceCommand={handleVoiceCommand}
                selectedLanguage={selectedLanguage}
                isLoading={isLoading}
                activeTemplateId={templateId}
              />
            )}

            {activeInputDrawer === 'type' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Paste or type raw details about your name, degree, college, skills, or projects. AI will automatically extract and merge into your selected template without overwriting existing sections.
                </p>
                <textarea
                  rows={4}
                  value={typedQuickInput}
                  onChange={(e) => setTypedQuickInput(e.target.value)}
                  placeholder="e.g. My name is Shiva Parvathi. I am pursuing B.Tech CSE at CBIT with a 9.63 CGPA. I built an online voting management system using Node.js, Express and MySQL..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => handleVoiceExtracted(typedQuickInput)}
                  disabled={!typedQuickInput.trim() || isLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Extracting & Merging...' : 'Extract & Populate Selected Template'}
                </button>
              </div>
            )}

            {activeInputDrawer === 'upload' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Upload your existing resume in PDF, Microsoft Word (.docx), or plain text format. All facts will be extracted into structured format and populated into the <strong>{activeTemplate.name}</strong> layout!
                </p>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE / TABLET TAB BAR */}
      <div className="lg:hidden flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 cursor-pointer ${
            mobileTab === 'editor'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500'
          }`}
        >
          Form Editor
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 cursor-pointer ${
            mobileTab === 'preview'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500'
          }`}
        >
          Live Preview ({pageCount}P)
        </button>
        <button
          onClick={() => setMobileTab('ai')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 cursor-pointer ${
            mobileTab === 'ai'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500'
          }`}
        >
          AI & ATS Panel
        </button>
      </div>

      {/* MAIN 3-PANEL STUDIO LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL 1 (LEFT): Structured Resume Sections Form */}
        <div className={`w-full lg:w-[35%] xl:w-[32%] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-y-auto p-4 md:p-5 scrollbar-thin ${
          mobileTab !== 'editor' ? 'hidden lg:block' : 'block'
        }`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase font-mono text-slate-900 dark:text-white">
              Resume Information
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
          </div>

          <ResumeEditorForm
            resumeData={resumeData}
            onChange={(updated) => {
              setResumeData(updated);
              saveProject({ resume_data: updated });
            }}
            onPolishSection={handlePolishSection}
            onGenerateSummary={handleGenerateSummary}
            isGeneratingSummary={isGeneratingSummary}
            isImprovingSection={isImprovingSection}
          />
        </div>

        {/* PANEL 2 (CENTER): High-Fidelity Live Resume Preview */}
        <div className={`flex-1 bg-slate-200/70 dark:bg-slate-950 overflow-y-auto p-4 md:p-8 flex flex-col items-center scrollbar-thin ${
          mobileTab !== 'preview' ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="w-full max-w-[800px] mb-3 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-1.5">
              <Eye size={13} className="text-emerald-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Live Document ({activeTemplate.name})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>{pageCount} Page{pageCount > 1 ? 's' : ''} Rendered</span>
              <span className="hidden sm:inline text-emerald-600 font-bold">100% Vector Print</span>
            </div>
          </div>

          {/* Actual Selected Template Document */}
          <div className="w-full flex justify-center pb-12">
            <ResumeRenderer
              ref={previewPrintRef}
              resumeData={resumeData}
              templateId={templateId}
              accentColor={resumeData.accentColor || activeTemplate.accentDefault}
              zoom={zoomLevel}
            />
          </div>
        </div>

        {/* PANEL 3 (RIGHT): AI Assistant & ATS Analysis Panel */}
        <div className={`w-full lg:w-[28%] xl:w-[26%] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-y-auto p-4 md:p-5 scrollbar-thin space-y-4 ${
          mobileTab !== 'ai' ? 'hidden lg:block' : 'block'
        }`}>
          {/* Sub-Tabs for Right Panel */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setEditorSubTab('ai_assistant')}
              className={`flex-1 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                editorSubTab === 'ai_assistant'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              AI Assistant
            </button>
            <button
              onClick={() => setEditorSubTab('ats_panel')}
              className={`flex-1 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                editorSubTab === 'ats_panel'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ATS Analysis
            </button>
            <button
              onClick={() => setEditorSubTab('voice')}
              className={`flex-1 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                editorSubTab === 'voice'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🎤 Voice
            </button>
          </div>

          {/* TAB: AI ASSISTANT */}
          {editorSubTab === 'ai_assistant' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <span className="text-xs font-bold uppercase font-mono text-slate-800 dark:text-slate-200 block">
                  Quick AI Optimizers
                </span>

                {/* 1. Generate Summary */}
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-left text-xs space-y-1 transition-all cursor-pointer"
                >
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Synthesize Professional Summary</span>
                    <Wand2 size={13} className="text-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Draft a concise executive summary using strictly your education, skills, and projects.
                  </p>
                </button>

                {/* 2. Optimize for 1 Page */}
                <button
                  onClick={handleOptimizeOnePage}
                  disabled={isLoading}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-left text-xs space-y-1 transition-all cursor-pointer"
                >
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Optimize for Single Page</span>
                    <Sparkles size={13} className="text-indigo-500" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Intelligently trims verbose bullet phrasing to guarantee single-page fit without deleting credentials.
                  </p>
                </button>

                {/* 3. Run ATS Scan */}
                <button
                  onClick={handleRunAtsAnalysis}
                  disabled={isLoading}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left text-xs space-y-1 transition-all cursor-pointer"
                >
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Scan ATS Compatibility</span>
                    <BarChart3 size={13} className="text-purple-500" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Analyze keyword alignment, section structure, and machine readability.
                  </p>
                </button>
              </div>

              {/* Zero-Fabrication Promise Badge */}
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Zero-Fabrication Guarantee</span>
                </div>
                <p className="text-[10.5px] opacity-80 leading-relaxed">
                  seeSpeak AI strictly adheres to verified user facts. We never invent metrics, falsify companies, or add skills you do not possess.
                </p>
              </div>
            </div>
          )}

          {/* TAB: ATS ANALYSIS PANEL */}
          {editorSubTab === 'ats_panel' && (
            <AtsAnalysisPanel
              resumeData={resumeData}
              targetRole={targetRole}
              targetCompany={targetCompany}
              jobDescription={jobDescription}
              onTargetRoleChange={setTargetRole}
              onTargetCompanyChange={setTargetCompany}
              onJobDescriptionChange={setJobDescription}
              atsAnalysis={atsAnalysis}
              onRunAtsAnalysis={handleRunAtsAnalysis}
              isLoading={isLoading}
            />
          )}

          {/* TAB: VOICE COMMANDS */}
          {editorSubTab === 'voice' && (
            <VoiceResumeAssistant
              onVoiceExtracted={handleVoiceExtracted}
              onVoiceCommand={handleVoiceCommand}
              selectedLanguage={selectedLanguage}
              isLoading={isLoading}
              activeTemplateId={templateId}
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default ResumeBuilderSession;

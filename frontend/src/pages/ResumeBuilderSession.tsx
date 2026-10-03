import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { InterviewSoundBox } from '../components/InterviewSoundBox';
import { SupportedLanguage, Conversation } from '../types';
import { 
  Award, 
  FileText, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Plus, 
  Trash2, 
  Wand2, 
  BarChart3, 
  Target, 
  Briefcase, 
  GraduationCap, 
  Code2, 
  FolderGit2, 
  User, 
  ExternalLink,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Eye,
  Edit3,
  FileCheck
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

export type TemplateId = 
  | 'ats-professional' 
  | 'modern-minimal' 
  | 'software-engineer' 
  | 'corporate' 
  | 'academic' 
  | 'one-page-compact';

interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
  };
  summary: string;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    gpa?: string;
    year?: string;
  }>;
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    databases: string[];
    cloud: string[];
  };
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    location?: string;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    description?: string;
    technologies: string[];
    link?: string;
    bullets: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    year?: string;
  }>;
}

const DEFAULT_RESUME: ResumeData = {
  personalInfo: {
    fullName: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexjohnson',
    github: 'github.com/alexjohnson',
    portfolio: 'alexjohnson.dev',
  },
  summary: 'Results-driven Software Engineer with 4+ years of experience designing scalable microservices, high-throughput backend APIs, and modern cloud applications. Proven track record of improving system uptime and reducing API response latency.',
  education: [
    {
      degree: 'B.S. in Computer Science',
      institution: 'University of California, Berkeley',
      location: 'Berkeley, CA',
      gpa: '3.8',
      year: '2019 - 2023',
    },
  ],
  skills: {
    languages: ['TypeScript', 'Python', 'Go', 'SQL', 'Java'],
    frameworks: ['React', 'Next.js', 'FastAPI', 'Node.js', 'Express', 'Tailwind CSS'],
    tools: ['Git', 'Docker', 'Kubernetes', 'GitHub Actions', 'Linux'],
    databases: ['PostgreSQL', 'Redis', 'MongoDB'],
    cloud: ['AWS (ECS, S3, RDS)', 'GCP', 'Vercel'],
  },
  experience: [
    {
      company: 'TechCorp Solutions',
      role: 'Full Stack Engineer',
      duration: '2023 - Present',
      location: 'San Francisco, CA',
      bullets: [
        'Architected and deployed distributed event streaming pipelines handling 5M+ daily requests using FastAPI and Redis.',
        'Migrated monolithic frontend architecture to Next.js and Tailwind, boosting Core Web Vitals performance score by 35%.',
        'Implemented automated CI/CD deployment pipelines on AWS ECS, reducing deployment cycle times from 45 to 8 minutes.',
      ],
    },
    {
      company: 'CloudScale Labs',
      role: 'Software Engineering Intern',
      duration: 'Summer 2022',
      location: 'Remote',
      bullets: [
        'Built real-time telemetry analytics dashboards for 200+ enterprise microservices using React and WebSockets.',
        'Optimized slow PostgreSQL queries with composite indexing, cutting 95th percentile query latency by 42%.',
      ],
    },
  ],
  projects: [
    {
      name: 'OmniStream AI Audio Engine',
      description: 'Real-time WebRTC audio transcription & intelligence platform with low-latency streaming pipeline.',
      technologies: ['FastAPI', 'WebSockets', 'React', 'Docker'],
      link: 'github.com/alexjohnson/omnistream',
      bullets: [
        'Engineered chunked audio streaming pipeline with under 250ms glass-to-glass latency.',
        'Designed responsive split-pane analytics dashboard with live waveform visualizer.',
      ],
    },
    {
      name: 'Distributed Key-Value Store',
      description: 'Fault-tolerant distributed storage engine using Raft consensus protocol.',
      technologies: ['Go', 'gRPC', 'Protobuf'],
      link: 'github.com/alexjohnson/raft-kv',
      bullets: [
        'Implemented leader election and log replication with 99.99% data consistency during network partitions.',
      ],
    },
  ],
  certifications: [
    {
      name: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services',
      year: '2023',
    },
  ],
};

const TEMPLATES: Array<{ id: TemplateId; name: string; tag: string; description: string }> = [
  { id: 'ats-professional', name: 'ATS Professional', tag: 'Standard', description: 'Classic single-column layout with optimal parser readability.' },
  { id: 'modern-minimal', name: 'Modern Minimal', tag: 'Popular', description: 'Sleek typographic hierarchy with compact margins and subtle indigo accents.' },
  { id: 'software-engineer', name: 'Software Engineer', tag: 'Tech Focus', description: 'Prioritizes Technical Skills and Projects upfront for engineering managers.' },
  { id: 'corporate', name: 'Corporate Executive', tag: 'Business', description: 'Deep slate styling designed for finance, consulting, and management.' },
  { id: 'academic', name: 'Academic & Research', tag: 'CV Style', description: 'Emphasizes education, publications, research, and certifications.' },
  { id: 'one-page-compact', name: 'One Page Compact', tag: 'Space Saver', description: 'Tightly optimized line-height and spacing guaranteed to fit single page.' },
];

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
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [templateId, setTemplateId] = useState<TemplateId>('ats-professional');
  const [resumeData, setResumeData] = useState<ResumeData>(DEFAULT_RESUME);
  
  // Target Job Alignment
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [jobDescription, setJobDescription] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'details' | 'target' | 'voice' | 'ats'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [isImprovingSection, setIsImprovingSection] = useState<string | null>(null);
  const [atsAnalysis, setAtsAnalysis] = useState<any>(null);
  const [showAtsModal, setShowAtsModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const previewPrintRef = useRef<HTMLDivElement | null>(null);

  // Load resume project from backend
  const loadProject = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/resume/project/${convId}`);
      if (res.ok) {
        const proj = await res.json();
        if (proj.template_id) setTemplateId(proj.template_id as TemplateId);
        if (proj.target_company) setTargetCompany(proj.target_company);
        if (proj.target_role) setTargetRole(proj.target_role);
        if (proj.job_description) setJobDescription(proj.job_description);
        if (proj.resume_data && Object.keys(proj.resume_data).length > 0) {
          setResumeData(proj.resume_data);
        }
        if (proj.ats_analysis) setAtsAnalysis(proj.ats_analysis);
      }
    } catch (e) {
      console.error('Failed to load resume project:', e);
    }
  }, []);

  // Ensure conversation ID is initialized
  useEffect(() => {
    const initConversation = async () => {
      if (conversationId) {
        setActiveConvId(conversationId);
        loadProject(conversationId);
      } else {
        try {
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              feature: 'ai-resume-builder',
              language: selectedLanguage,
              title: 'AI Resume Project',
            }),
          });
          if (res.ok) {
            const conv: Conversation = await res.json();
            setActiveConvId(conv.id);
            if (onConversationCreated) onConversationCreated(conv);
            loadProject(conv.id);
          }
        } catch (e) {
          console.error('Failed to create resume conversation:', e);
        }
      }
    };
    initConversation();
  }, [conversationId, loadProject]);

  // Save changes to backend
  const saveProject = useCallback(async (overrides?: Partial<{
    resume_data: ResumeData;
    template_id: string;
    target_company: string;
    target_role: string;
    job_description: string;
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
        }),
      });
    } catch (e) {
      console.error('Failed to save project:', e);
    }
  }, [activeConvId, templateId, targetCompany, targetRole, jobDescription, resumeData]);

  // Voice Speech Ingestion -> Merges into ResumeData
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
          setResumeData(data.resume_data);
          setStatusMessage('Updated resume with spoken details!');
          setTimeout(() => setStatusMessage(null), 4000);
        }
      }
    } catch (err: any) {
      console.error('Voice extraction error:', err);
      setStatusMessage('Failed to extract voice data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Polish a specific section with AI
  const handlePolishSection = async (section: 'summary' | 'experience' | 'projects', content: any) => {
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
        } else if (section === 'experience' && Array.isArray(result.improved_content)) {
          const updated = { ...resumeData, experience: result.improved_content };
          setResumeData(updated);
          saveProject({ resume_data: updated });
        } else if (section === 'projects' && Array.isArray(result.improved_content)) {
          const updated = { ...resumeData, projects: result.improved_content };
          setResumeData(updated);
          saveProject({ resume_data: updated });
        }
      }
    } catch (err) {
      console.error('Section improve error:', err);
    } finally {
      setIsImprovingSection(null);
    }
  };

  // Perform ATS Analysis
  const handleAtsAnalyze = async () => {
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
        setShowAtsModal(true);
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
    setStatusMessage('Optimizing spacing & bullet counts for 1-page fit...');
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
          setStatusMessage('Resume condensed to fit on 1 page!');
          setTimeout(() => setStatusMessage(null), 4000);
        }
      }
    } catch (e) {
      console.error('One page optimize error:', e);
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

  // Form Field Update Helpers
  const updatePersonalInfo = (key: keyof ResumeData['personalInfo'], val: string) => {
    const updated = {
      ...resumeData,
      personalInfo: { ...resumeData.personalInfo, [key]: val },
    };
    setResumeData(updated);
    saveProject({ resume_data: updated });
  };

  const updateSkillsCategory = (cat: keyof ResumeData['skills'], val: string) => {
    const items = val.split(',').map((s) => s.trim()).filter(Boolean);
    const updated = {
      ...resumeData,
      skills: { ...resumeData.skills, [cat]: items },
    };
    setResumeData(updated);
    saveProject({ resume_data: updated });
  };

  // Render Template-Specific Preview Layout
  const renderResumeDocument = () => {
    const { personalInfo, summary, skills, experience, projects, education, certifications } = resumeData;

    // Class styles tailored per template
    let containerClass = "p-8 md:p-10 font-sans text-slate-800 leading-normal max-w-3xl mx-auto bg-white shadow-2xl rounded-sm border border-slate-200 transition-all";
    let headingBorderClass = "border-b border-slate-300 pb-1 mb-2";
    let sectionTitleClass = "text-xs font-bold uppercase tracking-wider text-slate-900";
    let nameClass = "text-2xl md:text-3xl font-bold tracking-tight text-slate-950 text-center";
    let contactClass = "text-[11px] text-slate-600 flex flex-wrap items-center justify-center gap-2 mt-1 mb-4";

    if (templateId === 'ats-professional') {
      nameClass = "text-2xl font-bold text-slate-900 tracking-wide uppercase text-center";
      sectionTitleClass = "text-xs font-bold uppercase tracking-wider text-slate-900";
      headingBorderClass = "border-b-2 border-slate-900 pb-0.5 mb-2 mt-4";
    } else if (templateId === 'modern-minimal') {
      nameClass = "text-3xl font-extrabold text-indigo-950 tracking-tight text-left";
      contactClass = "text-xs text-indigo-700/80 flex flex-wrap items-center gap-3 mt-1 mb-5";
      sectionTitleClass = "text-xs font-bold uppercase tracking-widest text-indigo-900";
      headingBorderClass = "border-b border-indigo-200 pb-1 mb-3 mt-4";
    } else if (templateId === 'software-engineer') {
      nameClass = "text-2xl font-bold text-slate-900 tracking-tight font-mono text-left";
      sectionTitleClass = "text-xs font-bold uppercase tracking-wider text-slate-800 font-mono";
      headingBorderClass = "border-b border-slate-400 pb-1 mb-2 mt-3";
    } else if (templateId === 'corporate') {
      nameClass = "text-2xl md:text-3xl font-serif font-bold text-slate-900 text-center";
      sectionTitleClass = "text-xs font-serif font-bold uppercase tracking-widest text-slate-800 text-center";
      headingBorderClass = "border-t border-b border-slate-800 py-1 my-3";
    } else if (templateId === 'academic') {
      nameClass = "text-2xl font-serif font-semibold text-slate-900 text-center";
      sectionTitleClass = "text-xs font-serif font-bold uppercase tracking-wider text-slate-900";
      headingBorderClass = "border-b border-slate-300 pb-1 mb-2 mt-4";
    } else if (templateId === 'one-page-compact') {
      containerClass = "p-5 md:p-6 font-sans text-slate-800 text-xs leading-tight max-w-3xl mx-auto bg-white shadow-xl rounded-sm border border-slate-200";
      nameClass = "text-xl font-bold text-slate-900 tracking-tight text-center";
      contactClass = "text-[10px] text-slate-600 flex flex-wrap items-center justify-center gap-2 mt-0.5 mb-2";
      sectionTitleClass = "text-[10px] font-bold uppercase tracking-wider text-slate-900";
      headingBorderClass = "border-b border-slate-400 pb-0.5 mb-1.5 mt-2";
    }

    return (
      <div id="resume-preview-document" ref={previewPrintRef} className={containerClass}>
        {/* Header Personal Info */}
        <div className="mb-2">
          <h1 className={nameClass}>{personalInfo.fullName || 'Candidate Name'}</h1>
          <div className={contactClass}>
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.location && <span>• {personalInfo.location}</span>}
            {personalInfo.linkedin && <span>• {personalInfo.linkedin}</span>}
            {personalInfo.github && <span>• {personalInfo.github}</span>}
            {personalInfo.portfolio && <span>• {personalInfo.portfolio}</span>}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="mb-3">
            <div className={headingBorderClass}>
              <h2 className={sectionTitleClass}>Professional Summary</h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed text-justify">{summary}</p>
          </div>
        )}

        {/* Engineering specific: Technical Skills & Projects prioritized */}
        {templateId === 'software-engineer' ? (
          <>
            {/* Technical Skills */}
            <div className="mb-3">
              <div className={headingBorderClass}>
                <h2 className={sectionTitleClass}>Technical Skills</h2>
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                {skills.languages?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Languages:</span> {skills.languages.join(', ')}</div>
                )}
                {skills.frameworks?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Frameworks:</span> {skills.frameworks.join(', ')}</div>
                )}
                {skills.tools?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Developer Tools:</span> {skills.tools.join(', ')}</div>
                )}
                {skills.databases?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Databases:</span> {skills.databases.join(', ')}</div>
                )}
                {skills.cloud?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Cloud & DevOps:</span> {skills.cloud.join(', ')}</div>
                )}
              </div>
            </div>

            {/* Projects */}
            {projects?.length > 0 && (
              <div className="mb-3">
                <div className={headingBorderClass}>
                  <h2 className={sectionTitleClass}>Technical Projects</h2>
                </div>
                <div className="space-y-2.5">
                  {projects.map((proj, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-slate-900">{proj.name}</span>
                        {proj.link && <span className="text-[10px] text-indigo-600 font-mono">{proj.link}</span>}
                      </div>
                      {proj.technologies?.length > 0 && (
                        <div className="text-[11px] text-slate-600 italic">
                          Stack: {proj.technologies.join(', ')}
                        </div>
                      )}
                      {proj.description && (
                        <p className="text-xs text-slate-700 mt-0.5">{proj.description}</p>
                      )}
                      <ul className="list-disc list-outside ml-4 text-xs text-slate-700 mt-1 space-y-0.5">
                        {proj.bullets?.map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {experience?.length > 0 && (
              <div className="mb-3">
                <div className={headingBorderClass}>
                  <h2 className={sectionTitleClass}>Work Experience</h2>
                </div>
                <div className="space-y-3">
                  {experience.map((exp, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-slate-900">{exp.role} <span className="font-normal text-slate-600">at {exp.company}</span></span>
                        <span className="text-slate-500 font-mono text-[11px]">{exp.duration}</span>
                      </div>
                      {exp.location && <div className="text-[11px] text-slate-500">{exp.location}</div>}
                      <ul className="list-disc list-outside ml-4 text-xs text-slate-700 mt-1 space-y-0.5">
                        {exp.bullets?.map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Standard / Minimal / Corporate / Academic / Compact ordering */
          <>
            {/* Experience */}
            {experience?.length > 0 && (
              <div className="mb-3">
                <div className={headingBorderClass}>
                  <h2 className={sectionTitleClass}>Experience</h2>
                </div>
                <div className="space-y-3">
                  {experience.map((exp, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-slate-900">{exp.role} <span className="font-semibold text-slate-700">— {exp.company}</span></span>
                        <span className="text-slate-500 font-mono text-[11px]">{exp.duration}</span>
                      </div>
                      {exp.location && <div className="text-[10px] text-slate-500">{exp.location}</div>}
                      <ul className="list-disc list-outside ml-4 text-xs text-slate-700 mt-1 space-y-0.5">
                        {exp.bullets?.map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {projects?.length > 0 && (
              <div className="mb-3">
                <div className={headingBorderClass}>
                  <h2 className={sectionTitleClass}>Key Projects</h2>
                </div>
                <div className="space-y-2.5">
                  {projects.map((proj, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-slate-900">{proj.name}</span>
                        {proj.link && <span className="text-[10px] text-slate-500 font-mono">{proj.link}</span>}
                      </div>
                      {proj.technologies?.length > 0 && (
                        <div className="text-[10px] text-slate-500 italic">
                          Tools: {proj.technologies.join(', ')}
                        </div>
                      )}
                      {proj.description && (
                        <p className="text-xs text-slate-700 mt-0.5">{proj.description}</p>
                      )}
                      <ul className="list-disc list-outside ml-4 text-xs text-slate-700 mt-1 space-y-0.5">
                        {proj.bullets?.map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Skills */}
            <div className="mb-3">
              <div className={headingBorderClass}>
                <h2 className={sectionTitleClass}>Skills & Tools</h2>
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                {skills.languages?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Languages:</span> {skills.languages.join(', ')}</div>
                )}
                {skills.frameworks?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Frameworks:</span> {skills.frameworks.join(', ')}</div>
                )}
                {skills.tools?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Tools:</span> {skills.tools.join(', ')}</div>
                )}
                {skills.databases?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Databases:</span> {skills.databases.join(', ')}</div>
                )}
                {skills.cloud?.length > 0 && (
                  <div><span className="font-semibold text-slate-900">Cloud:</span> {skills.cloud.join(', ')}</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Education */}
        {education?.length > 0 && (
          <div className="mb-3">
            <div className={headingBorderClass}>
              <h2 className={sectionTitleClass}>Education</h2>
            </div>
            <div className="space-y-1.5">
              {education.map((edu, i) => (
                <div key={i} className="flex items-baseline justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{edu.degree}</span>
                    <span className="text-slate-600">, {edu.institution}</span>
                    {edu.gpa && <span className="text-slate-500"> (GPA: {edu.gpa})</span>}
                  </div>
                  {edu.year && <span className="text-slate-500 font-mono text-[11px]">{edu.year}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certifications?.length > 0 && (
          <div className="mb-2">
            <div className={headingBorderClass}>
              <h2 className={sectionTitleClass}>Certifications</h2>
            </div>
            <ul className="list-disc list-outside ml-4 text-xs text-slate-700 space-y-0.5">
              {certifications.map((c, i) => (
                <li key={i}>
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  {c.issuer && <span className="text-slate-600"> — {c.issuer}</span>}
                  {c.year && <span className="text-slate-500"> ({c.year})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Print Stylesheet for Zero-Margin High-Resolution PDF Print */}
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
        subtitle="ATS-optimized resume generator with voice continuation & target tailoring"
        onBack={onBack}
        onNewConversation={() => {
          setResumeData(DEFAULT_RESUME);
          setActiveConvId(undefined);
          if (onNewConversation) onNewConversation();
        }}
        language={selectedLanguage}
        activeFeatureId="ai-resume-builder"
        onSelectFeature={onSelectFeature}
      />

      {/* Template Selector Top Bar */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-500/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-mono uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Layers size={14} />
            <span>Template:</span>
          </span>
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => {
                setTemplateId(tmpl.id);
                saveProject({ template_id: tmpl.id });
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                templateId === tmpl.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tmpl.name}
            </button>
          ))}
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2">
          {/* Analyze ATS */}
          <button
            onClick={handleAtsAnalyze}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Scan for ATS compliance score and missing keywords"
          >
            <BarChart3 size={13} />
            <span className="hidden sm:inline">Analyze ATS</span>
          </button>

          {/* Fit 1 Page */}
          <button
            onClick={handleOptimizeOnePage}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Condense bullets and phrasing to fit exactly on 1 page"
          >
            <Wand2 size={13} />
            <span className="hidden sm:inline">Fit 1 Page</span>
          </button>

          {/* Download DOCX */}
          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
            title="Download formatted Microsoft Word document (.docx)"
          >
            <FileText size={13} />
            <span className="hidden md:inline">Word (.docx)</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
            title="Download high-resolution print PDF"
          >
            <Download size={13} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs px-4 py-2 border-b border-emerald-300 dark:border-emerald-700 flex items-center justify-between animate-fadeIn">
          <span>{statusMessage}</span>
          <span className="text-[10px] font-mono opacity-70">Auto-saved to database</span>
        </div>
      )}

      {/* Main Split-Screen Studio */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANEL: Form Editor & Voice Ingestion */}
        <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 overflow-y-auto p-4 md:p-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Resume Editor
            </button>
            <button
              onClick={() => setActiveTab('target')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'target'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Target Role & JD
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'voice'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>🎤 Voice Input</span>
            </button>
          </div>

          {/* TAB 1: RESUME DETAILS EDITORS */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              
              {/* Personal Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
                  <User size={14} className="text-emerald-500" />
                  <span>Personal Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Full Name</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.fullName}
                      onChange={(e) => updatePersonalInfo('fullName', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Email</label>
                    <input
                      type="email"
                      value={resumeData.personalInfo.email}
                      onChange={(e) => updatePersonalInfo('email', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Phone</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.phone}
                      onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Location</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.location}
                      onChange={(e) => updatePersonalInfo('location', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">LinkedIn</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.linkedin}
                      onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">GitHub / Portfolio</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.github}
                      onChange={(e) => updatePersonalInfo('github', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
                    <FileText size={14} className="text-emerald-500" />
                    <span>Professional Summary</span>
                  </div>
                  <button
                    onClick={() => handlePolishSection('summary', resumeData.summary)}
                    disabled={isImprovingSection === 'summary'}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    <span>{isImprovingSection === 'summary' ? 'Polishing...' : 'AI Polish'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={resumeData.summary}
                  onChange={(e) => {
                    const updated = { ...resumeData, summary: e.target.value };
                    setResumeData(updated);
                    saveProject({ resume_data: updated });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed"
                />
              </div>

              {/* Technical Skills */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
                  <Code2 size={14} className="text-emerald-500" />
                  <span>Technical Skills (Comma Separated)</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Programming Languages</label>
                    <input
                      type="text"
                      value={resumeData.skills.languages?.join(', ') || ''}
                      onChange={(e) => updateSkillsCategory('languages', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Frameworks & Libraries</label>
                    <input
                      type="text"
                      value={resumeData.skills.frameworks?.join(', ') || ''}
                      onChange={(e) => updateSkillsCategory('frameworks', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Tools, Cloud & Databases</label>
                    <input
                      type="text"
                      value={resumeData.skills.tools?.join(', ') || ''}
                      onChange={(e) => updateSkillsCategory('tools', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Work Experience */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
                    <Briefcase size={14} className="text-emerald-500" />
                    <span>Work Experience</span>
                  </div>
                  <button
                    onClick={() => handlePolishSection('experience', resumeData.experience)}
                    disabled={isImprovingSection === 'experience'}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    <span>{isImprovingSection === 'experience' ? 'Polishing Bullets...' : 'AI Polish Bullets'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {resumeData.experience.map((exp, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={exp.role}
                          placeholder="Job Title / Role"
                          onChange={(e) => {
                            const newExp = [...resumeData.experience];
                            newExp[i].role = e.target.value;
                            setResumeData({ ...resumeData, experience: newExp });
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                        />
                        <input
                          type="text"
                          value={exp.company}
                          placeholder="Company Name"
                          onChange={(e) => {
                            const newExp = [...resumeData.experience];
                            newExp[i].company = e.target.value;
                            setResumeData({ ...resumeData, experience: newExp });
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                        />
                      </div>
                      <input
                        type="text"
                        value={exp.duration}
                        placeholder="Dates (e.g. 2022 - Present)"
                        onChange={(e) => {
                          const newExp = [...resumeData.experience];
                          newExp[i].duration = e.target.value;
                          setResumeData({ ...resumeData, experience: newExp });
                        }}
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-mono"
                      />
                      <label className="text-[10px] font-mono text-slate-500 uppercase block">Bullet Points (One per line)</label>
                      <textarea
                        rows={3}
                        value={exp.bullets?.join('\n') || ''}
                        onChange={(e) => {
                          const newExp = [...resumeData.experience];
                          newExp[i].bullets = e.target.value.split('\n');
                          setResumeData({ ...resumeData, experience: newExp });
                        }}
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
                    <FolderGit2 size={14} className="text-emerald-500" />
                    <span>Projects</span>
                  </div>
                  <button
                    onClick={() => handlePolishSection('projects', resumeData.projects)}
                    disabled={isImprovingSection === 'projects'}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    <span>{isImprovingSection === 'projects' ? 'Polishing...' : 'AI Polish Bullets'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {resumeData.projects.map((proj, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={proj.name}
                          placeholder="Project Name"
                          onChange={(e) => {
                            const newProj = [...resumeData.projects];
                            newProj[i].name = e.target.value;
                            setResumeData({ ...resumeData, projects: newProj });
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-semibold"
                        />
                        <input
                          type="text"
                          value={proj.technologies?.join(', ') || ''}
                          placeholder="Technologies (comma separated)"
                          onChange={(e) => {
                            const newProj = [...resumeData.projects];
                            newProj[i].technologies = e.target.value.split(',').map((s) => s.trim());
                            setResumeData({ ...resumeData, projects: newProj });
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={proj.bullets?.join('\n') || ''}
                        placeholder="Bullet points describing your accomplishment..."
                        onChange={(e) => {
                          const newProj = [...resumeData.projects];
                          newProj[i].bullets = e.target.value.split('\n');
                          setResumeData({ ...resumeData, projects: newProj });
                        }}
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TARGET ROLE & JOB DESCRIPTION */}
          {activeTab === 'target' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
                <Target size={15} className="text-emerald-500" />
                <span>Target Job Tailoring (Zero-Fabrication Keyword Matching)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Provide the target company and job description. The AI will align your existing credentials with matching industry keywords without inventing fake experiences.
              </p>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Target Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => {
                    setTargetRole(e.target.value);
                    saveProject({ target_role: e.target.value });
                  }}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Target Company</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => {
                    setTargetCompany(e.target.value);
                    saveProject({ target_company: e.target.value });
                  }}
                  placeholder="e.g. Google, Stripe, Microsoft"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Job Description</label>
                <textarea
                  rows={6}
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value);
                    saveProject({ job_description: e.target.value });
                  }}
                  placeholder="Paste the job description or role requirements here..."
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed"
                />
              </div>

              <button
                onClick={handleAtsAnalyze}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Scan Resume Against This Job Description
              </button>
            </div>
          )}

          {/* TAB 3: VOICE INGESTION SOUND BOX */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                <span className="font-bold block mb-1">🎙 Spoken Resume Continuation:</span>
                Tell seeSpeak AI about your past experiences, projects, degree, or skills. You can speak multiple times; every recording intelligently merges without wiping earlier sections!
              </div>

              <InterviewSoundBox
                onSpeechCaptured={(spoken) => handleVoiceExtracted(spoken)}
                isProcessing={isLoading}
                isAiSpeaking={false}
                selectedLanguage={selectedLanguage}
                title="● Spoken Resume Input Ready"
                idlePlaceholder="Click [ START ] and speak your experience, projects, or degree"
                startLabel="🎤 START SPEAKING"
                stopLabel="■ STOP & MERGE INTO RESUME"
                disabled={isLoading}
              />
            </div>
          )}

        </div>

        {/* RIGHT PANEL: Live Rendered Resume Document */}
        <div className="w-full lg:w-1/2 flex flex-col bg-slate-100 dark:bg-slate-950/80 overflow-y-auto p-4 md:p-8 items-center scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          <div className="w-full max-w-3xl mb-3 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <Eye size={13} className="text-emerald-500" />
              <span>Live ATS Preview ({TEMPLATES.find((t) => t.id === templateId)?.name})</span>
            </span>
            <span className="text-[11px] hidden sm:inline">100% Vector Print Format</span>
          </div>

          {/* Render the selected template */}
          {renderResumeDocument()}
        </div>

      </div>

      {/* ATS ANALYSIS MODAL */}
      {showAtsModal && atsAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-purple-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                  ATS Score & Keyword Alignment
                </h3>
              </div>
              <button
                onClick={() => setShowAtsModal(false)}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Score Badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/20 text-center">
                <span className="text-3xl font-extrabold text-purple-700 dark:text-purple-300 font-mono">
                  {atsAnalysis.ats_score || 85} / 100
                </span>
                <span className="block text-xs font-semibold text-purple-900 dark:text-purple-200 mt-1">
                  Overall ATS Compatibility
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-center">
                <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                  {atsAnalysis.keyword_match_percentage || 80}%
                </span>
                <span className="block text-xs font-semibold text-emerald-900 dark:text-emerald-200 mt-1">
                  Keyword Alignment Match
                </span>
              </div>
            </div>

            {/* Matched Keywords */}
            {atsAnalysis.matched_keywords?.length > 0 && (
              <div>
                <span className="text-xs font-bold font-mono uppercase text-slate-700 dark:text-slate-300 block mb-2">
                  ✅ Matched Industry Keywords
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {atsAnalysis.matched_keywords.map((kw: string, i: number) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Keywords */}
            {atsAnalysis.missing_keywords?.length > 0 && (
              <div>
                <span className="text-xs font-bold font-mono uppercase text-amber-700 dark:text-amber-400 block mb-2">
                  ⚡ Suggested Missing Keywords (Add only if you possess these skills!)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {atsAnalysis.missing_keywords.map((kw: string, i: number) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-800">
                      + {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Recommendations */}
            {atsAnalysis.actionable_recommendations?.length > 0 && (
              <div>
                <span className="text-xs font-bold font-mono uppercase text-slate-700 dark:text-slate-300 block mb-2">
                  📋 Actionable Improvements
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {atsAnalysis.actionable_recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default ResumeBuilderSession;

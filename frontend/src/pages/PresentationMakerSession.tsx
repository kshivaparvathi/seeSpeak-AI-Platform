import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { SupportedLanguage, Conversation } from '../types';
import { 
  SlideItem, 
  PresentationProject, 
  PresentationThemeId, 
  PresentationAudience, 
  PresentationLevel, 
  PresentationTone, 
  PRESENTATION_THEMES,
  SlideLayoutType
} from '../types/presentation';
import { SlideCanvas } from '../components/presentation/SlideCanvas';
import { FeatureVisual } from '../components/FeatureVisual';
import { 
  Presentation, 
  Sparkles, 
  Download, 
  Upload, 
  Mic, 
  MicOff, 
  Play, 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Maximize2, 
  Minimize2, 
  Wand2, 
  Layers, 
  FileCode, 
  Clock, 
  CheckCircle2, 
  X,
  History,
  FolderPlus
} from 'lucide-react';

interface PresentationMakerSessionProps {
  onBack: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage?: (lang: SupportedLanguage) => void;
  onSelectFeature?: (route: string) => void;
  onNewConversation?: () => void;
  conversationId?: string;
  onConversationCreated?: (conv: Conversation) => void;
  initialPrompt?: string;
}

export const PresentationMakerSession: React.FC<PresentationMakerSessionProps> = ({
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
  const [project, setProject] = useState<PresentationProject | null>(null);

  // Setup Screen States
  const [topicPrompt, setTopicPrompt] = useState(initialPrompt || '');
  const [slideCount, setSlideCount] = useState<number>(10);
  const [audience, setAudience] = useState<PresentationAudience>('College');
  const [level, setLevel] = useState<PresentationLevel>('Moderate');
  const [tone, setTone] = useState<PresentationTone>('Professional');
  const [presLanguage, setPresLanguage] = useState<string>(selectedLanguage || 'en');
  const [themeId, setThemeId] = useState<PresentationThemeId>('modern-professional');

  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; size: number }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Studio Presentation States
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showProjectsDrawer, setShowProjectsDrawer] = useState<boolean>(false);
  const [projectsList, setProjectsList] = useState<any[]>([]);

  // Generation & AI Polish States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<string>('Preparing presentation');
  const [progressPercent, setProgressPercent] = useState<number>(10);
  const [stageDetail, setStageDetail] = useState<string>('Initializing presentation workspace...');
  const [isImprovingSlide, setIsImprovingSlide] = useState<boolean>(false);
  const [slideInstruction, setSlideInstruction] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-detect slide count from user's natural prompt
  useEffect(() => {
    if (!topicPrompt) return;
    const match = topicPrompt.match(/(\d+)\s*[-_]?\s*slides?/i);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 3 && val <= 50) {
        setSlideCount(val);
      }
    }
  }, [topicPrompt]);

  // Load project from backend
  const loadProject = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/presentation/project/${convId}`);
      if (res.ok) {
        const proj = await res.json();
        if (proj && proj.slides && proj.slides.length > 0) {
          setProject(proj);
          if (proj.topic) setTopicPrompt(proj.topic);
          if (proj.slide_count) setSlideCount(proj.slide_count);
          if (proj.theme_id) setThemeId(proj.theme_id);
          if (proj.audience) setAudience(proj.audience);
          if (proj.tone) setTone(proj.tone);
          if (proj.language) setPresLanguage(proj.language);
        }
      }
    } catch (e) {
      console.error('Failed to load presentation project:', e);
    }
  }, []);

  // Fetch project list
  const fetchProjectList = useCallback(async () => {
    try {
      const res = await fetch('/api/presentation/history');
      if (res.ok) {
        const list = await res.json();
        setProjectsList(list);
      }
    } catch (e) {
      console.error('Failed to fetch presentation history:', e);
    }
  }, []);

  // Init conversation on mount
  useEffect(() => {
    const init = async () => {
      if (conversationId) {
        setActiveConvId(conversationId);
        await loadProject(conversationId);
      } else {
        try {
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              feature: 'ai-presentation-maker',
              language: selectedLanguage,
              title: 'New Presentation',
            }),
          });
          if (res.ok) {
            const conv: Conversation = await res.json();
            setActiveConvId(conv.id);
            if (onConversationCreated) onConversationCreated(conv);
            await loadProject(conv.id);
          }
        } catch (e) {
          console.error('Failed to create presentation conversation:', e);
        }
      }
      fetchProjectList();
    };
    init();
  }, [conversationId, loadProject, fetchProjectList]);

  // Handle Real Microphone Voice Input
  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage('Voice speech recognition not supported in this browser.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = presLanguage === 'te' ? 'te-IN' : presLanguage === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setStatusMessage('Listening to your presentation requirements...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setTopicPrompt((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setStatusMessage(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Microphone recording error:', err);
      setIsRecording(false);
    }
  };

  // Handle Multiple File Uploads
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeConvId) return;
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversation_id', activeConvId);
        formData.append('feature', 'ai-presentation-maker');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const rec = await res.json();
          setUploadedFiles((prev) => [
            ...prev,
            { id: rec.id, name: file.name, size: file.size },
          ]);
        }
      }
      setStatusMessage('Source documents uploaded successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error('File upload error:', e);
      setStatusMessage('Failed to upload some documents.');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove Uploaded File
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Generate Presentation Action with Real Streaming Progress
  const handleGeneratePresentation = async () => {
    if (!activeConvId) return;
    if (!topicPrompt.trim() && uploadedFiles.length === 0) {
      setStatusMessage('Please enter what presentation you want to create or upload source material.');
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    setIsGenerating(true);
    setCurrentStage('Preparing presentation');
    setProgressPercent(10);
    setStageDetail('Initializing presentation workspace & project...');

    try {
      const res = await fetch('/api/presentation/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          topic: topicPrompt,
          slide_count: slideCount,
          audience,
          level,
          tone,
          language: presLanguage,
          theme_id: themeId,
          file_ids: uploadedFiles.map((f) => f.id),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to start presentation stream');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              if (data.type === 'progress') {
                if (data.stage) setCurrentStage(data.stage);
                if (typeof data.percent === 'number') setProgressPercent(data.percent);
                if (data.detail) setStageDetail(data.detail);
              } else if (data.type === 'complete') {
                setCurrentStage('Ready');
                setProgressPercent(100);
                setStageDetail('Presentation generated successfully!');
                if (data.project) {
                  setProject(data.project);
                  setSelectedSlideIndex(0);
                  setStatusMessage(`Generated ${data.project.slides.length} professional slides!`);
                  setTimeout(() => setStatusMessage(null), 3500);
                  fetchProjectList();
                }
              } else if (data.type === 'error') {
                throw new Error(data.detail || 'Presentation generation error');
              }
            } catch (err) {
              console.error('Error parsing SSE event:', err);
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('Falling back to direct presentation pipeline:', e);
      try {
        setStageDetail('Finalizing slides via direct high-speed pipeline...');
        const fallbackRes = await fetch('/api/presentation/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: activeConvId,
            topic: topicPrompt,
            slide_count: slideCount,
            audience,
            level,
            tone,
            language: presLanguage,
            theme_id: themeId,
            file_ids: uploadedFiles.map((f) => f.id),
          }),
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setProject(data);
          setSelectedSlideIndex(0);
          setStatusMessage(`Generated ${data.slides.length} professional slides!`);
          setTimeout(() => setStatusMessage(null), 3500);
          fetchProjectList();
          return;
        }
      } catch (_) {}
      setStatusMessage('Error creating presentation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update Individual Slide Action
  const handleUpdateSlide = async (updated: SlideItem) => {
    if (!project || !activeConvId) return;
    const newSlides = [...project.slides];
    newSlides[selectedSlideIndex] = updated;

    setProject({ ...project, slides: newSlides });

    try {
      await fetch(`/api/presentation/project/${activeConvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: newSlides }),
      });
    } catch (e) {
      console.error('Failed to sync slide edits:', e);
    }
  };

  // AI Polish Slide Action
  const handleImproveSlide = async (action: string, customText?: string) => {
    if (!project || !activeConvId) return;
    setIsImprovingSlide(true);
    setStatusMessage(`Applying AI transformation to Slide ${selectedSlideIndex + 1}...`);

    try {
      const res = await fetch('/api/presentation/slide/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          slide_index: selectedSlideIndex,
          action,
          custom_instruction: customText || slideInstruction,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.slide) {
          const newSlides = [...project.slides];
          newSlides[selectedSlideIndex] = data.slide;
          setProject({ ...project, slides: newSlides });
          setSlideInstruction('');
          setStatusMessage('Slide updated successfully!');
          setTimeout(() => setStatusMessage(null), 3000);
        }
      }
    } catch (e) {
      console.error('Error improving slide:', e);
      setStatusMessage('Failed to improve slide.');
    } finally {
      setIsImprovingSlide(false);
    }
  };

  // Add New Slide Action
  const handleAddSlide = () => {
    if (!project || !activeConvId) return;
    const newSlideNumber = project.slides.length + 1;
    const newSlide: SlideItem = {
      id: `s_${newSlideNumber}_${Date.now()}`,
      slide_number: newSlideNumber,
      title: 'New Slide Title',
      subtitle: 'Key Insights',
      layout: 'bullets',
      content: 'Add your summary statement here.',
      bullet_points: ['Key strategic takeaway point 1', 'Actionable recommendation 2'],
      speaker_notes: 'Speaker notes for this new slide.',
    };

    const newSlides = [...project.slides, newSlide];
    setProject({ ...project, slides: newSlides, slide_count: newSlides.length });
    setSelectedSlideIndex(newSlides.length - 1);

    fetch(`/api/presentation/project/${activeConvId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: newSlides, slide_count: newSlides.length }),
    });
  };

  // Duplicate Slide Action
  const handleDuplicateSlide = () => {
    if (!project || !activeConvId || !project.slides[selectedSlideIndex]) return;
    const current = project.slides[selectedSlideIndex];
    const cloned: SlideItem = {
      ...current,
      id: `s_${Date.now()}`,
      title: `${current.title} (Copy)`,
    };

    const newSlides = [...project.slides];
    newSlides.splice(selectedSlideIndex + 1, 0, cloned);
    // Renumber
    newSlides.forEach((s, i) => (s.slide_number = i + 1));

    setProject({ ...project, slides: newSlides, slide_count: newSlides.length });
    setSelectedSlideIndex(selectedSlideIndex + 1);

    fetch(`/api/presentation/project/${activeConvId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: newSlides, slide_count: newSlides.length }),
    });
  };

  // Delete Slide Action
  const handleDeleteSlide = () => {
    if (!project || !activeConvId || project.slides.length <= 1) {
      setStatusMessage('A presentation must have at least 1 slide.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const newSlides = project.slides.filter((_, i) => i !== selectedSlideIndex);
    newSlides.forEach((s, i) => (s.slide_number = i + 1));

    setProject({ ...project, slides: newSlides, slide_count: newSlides.length });
    setSelectedSlideIndex(Math.max(0, selectedSlideIndex - 1));

    fetch(`/api/presentation/project/${activeConvId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: newSlides, slide_count: newSlides.length }),
    });
  };

  // Move Slide Up / Down Action
  const handleMoveSlide = (direction: 'up' | 'down') => {
    if (!project || !activeConvId) return;
    const targetIdx = direction === 'up' ? selectedSlideIndex - 1 : selectedSlideIndex + 1;
    if (targetIdx < 0 || targetIdx >= project.slides.length) return;

    const newSlides = [...project.slides];
    const temp = newSlides[selectedSlideIndex];
    newSlides[selectedSlideIndex] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;

    newSlides.forEach((s, i) => (s.slide_number = i + 1));
    setProject({ ...project, slides: newSlides });
    setSelectedSlideIndex(targetIdx);

    fetch(`/api/presentation/project/${activeConvId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: newSlides }),
    });
  };

  // REAL PowerPoint (.PPTX) Export Action
  const handleDownloadPptx = async () => {
    if (!project || !activeConvId) return;
    setStatusMessage('Building your editable Microsoft PowerPoint (.pptx) file...');

    try {
      const res = await fetch('/api/presentation/export/pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvId,
          slides: project.slides,
          title: project.title,
          theme_id: themeId,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (project.title || 'Presentation').replace(/[^\w\-_.]/g, '_');
        a.download = `${safeTitle}.pptx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setStatusMessage('PowerPoint presentation downloaded successfully!');
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        throw new Error('Failed to generate PPTX export file.');
      }
    } catch (e) {
      console.error('PPTX export error:', e);
      setStatusMessage('Export error. Please try again.');
    }
  };

  // Keyboard navigation for Fullscreen Presentation Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!project) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        setSelectedSlideIndex((prev) => Math.min(project.slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setSelectedSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, isFullscreen]);

  // Create brand new project
  const handleCreateNewProject = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'ai-presentation-maker',
          language: selectedLanguage,
          title: 'New Presentation Project',
        }),
      });
      if (res.ok) {
        const conv: Conversation = await res.json();
        setActiveConvId(conv.id);
        if (onConversationCreated) onConversationCreated(conv);
        setProject(null);
        setTopicPrompt('');
        setUploadedFiles([]);
        setSlideCount(10);
        fetchProjectList();
      }
    } catch (e) {
      console.error('Failed to create new project:', e);
    }
  };

  const activeSlide = project?.slides[selectedSlideIndex];

  // -------------------------------------------------------------
  // FULLSCREEN PRESENTATION MODE
  // -------------------------------------------------------------
  if (isFullscreen && project && activeSlide) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-6xl aspect-[16/9] shadow-2xl rounded-lg overflow-hidden">
          <SlideCanvas
            slide={activeSlide}
            themeId={themeId}
            totalSlides={project.slides.length}
            isEditable={false}
          />
        </div>

        {/* Floating Presenter Controls */}
        <div className="absolute bottom-6 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-full border border-slate-700 text-white flex items-center gap-4 text-xs font-medium shadow-xl">
          <button
            onClick={() => setSelectedSlideIndex((p) => Math.max(0, p - 1))}
            disabled={selectedSlideIndex === 0}
            className="p-1.5 rounded-full hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Slide <strong className="font-bold">{selectedSlideIndex + 1}</strong> of {project.slides.length}
          </span>
          <button
            onClick={() => setSelectedSlideIndex((p) => Math.min(project.slides.length - 1, p + 1))}
            disabled={selectedSlideIndex === project.slides.length - 1}
            className="p-1.5 rounded-full hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
          <div className="h-4 w-[1px] bg-slate-700" />
          <button
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
          >
            <Minimize2 size={14} />
            <span>Exit Fullscreen</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MODE 1: INITIAL REQUIREMENT & SETUP SCREEN
  // -------------------------------------------------------------
  if (!project || !project.slides || project.slides.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-y-auto">
        <ConversationHeader
          title="AI Presentation Maker"
          subtitle="Create professional PowerPoint presentations from your requirements, documents, PDFs, notes, or voice input"
          onBack={onBack}
          onNewConversation={handleCreateNewProject}
          language={selectedLanguage}
          activeFeatureId="ai-presentation-maker"
          onSelectFeature={onSelectFeature}
        />

        {statusMessage && (
          <div className="bg-indigo-600 text-white text-xs px-4 py-2 text-center font-medium animate-fadeIn">
            {statusMessage}
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 flex flex-col justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-10 space-y-8">
            {/* Header Title with FeatureVisual */}
            <div className="flex items-start gap-4">
              <div className="shrink-0 pt-1">
                <FeatureVisual featureId="ai-presentation-maker" size={54} />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800 mb-2">
                  <Presentation size={13} />
                  <span>Create • Design • Present</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  What presentation do you want to create?
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Describe your presentation topic naturally, speak via microphone, or upload lecture notes, PDFs, and reports.
                </p>
              </div>
            </div>

            {/* Large Natural Language Requirement Input */}
            <div className="relative">
              <textarea
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="e.g. Create a 10-slide presentation about Cloud Computing for a college seminar. Explain IaaS, PaaS, SaaS, deployment models, benefits, limitations, and real-world enterprise examples."
                rows={4}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm leading-relaxed"
              />

              {/* Voice Input Button */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`absolute right-3.5 bottom-3.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isRecording ? <MicOff size={13} /> : <Mic size={13} className="text-rose-500" />}
                <span>{isRecording ? 'Stop Recording' : '🎤 Speak'}</span>
              </button>
            </div>

            {/* Source Material Upload Zone */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Upload size={13} className="text-violet-500" />
                  <span>Upload Source Material (Optional)</span>
                </label>
                <span className="text-[11px] text-slate-400">PDF, DOCX, PPTX, TXT, Images</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.png,.jpg,.jpeg"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-500/80 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-850/50 group"
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                    <FileText size={22} />
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isUploading ? 'Uploading files...' : 'Click to upload lecture notes, papers, or project documentation'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    The AI will extract source facts and synthesize them directly into the slide deck.
                  </div>
                </div>
              </div>

              {/* Uploaded File Chips */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                    >
                      <FileText size={12} className="text-violet-500 shrink-0" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Slide Count & Core Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Number of Slides */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Number of Slides
                  </label>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 font-mono">
                    {slideCount} Slides
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[5, 6, 8, 10, 12, 15, 20, 25].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSlideCount(num)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        slideCount === num
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={3}
                    max={50}
                    value={slideCount}
                    onChange={(e) => setSlideCount(Math.max(3, parseInt(e.target.value, 10) || 10))}
                    className="w-16 px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Target Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as PresentationAudience)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="College">College / University Students</option>
                  <option value="School">School / High School</option>
                  <option value="Professional">Professional / Corporate</option>
                  <option value="Technical">Technical & Engineering Peers</option>
                  <option value="General">General Public / Broad Audience</option>
                </select>
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Presentation Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as PresentationTone)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="Professional">Professional</option>
                  <option value="Academic">Academic & Scholarly</option>
                  <option value="Corporate">Corporate & Strategic</option>
                  <option value="Technical">Technical & Rigorous</option>
                  <option value="Simple / Student-friendly">Simple & Student-Friendly</option>
                </select>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Presentation Language
                </label>
                <select
                  value={presLanguage}
                  onChange={(e) => setPresLanguage(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="en">English</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="gu">Gujarati (ગુજરાતી)</option>
                  <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                  <option value="ur">Urdu (اردو)</option>
                </select>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Choose Presentation Theme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(Object.keys(PRESENTATION_THEMES) as PresentationThemeId[]).map((tId) => {
                  const t = PRESENTATION_THEMES[tId];
                  const isSel = themeId === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setThemeId(tId)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSel
                          ? 'border-violet-600 ring-2 ring-violet-500/20 bg-violet-50/40 dark:bg-violet-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-3 h-3 rounded-full ${t.accentBg}`} />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {t.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 leading-tight">
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real Generation Progress Card */}
            {isGenerating && (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-violet-50/90 to-indigo-50/90 dark:from-slate-850 dark:to-slate-900 border border-violet-200/80 dark:border-violet-800/60 shadow-lg space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                      <Sparkles className="animate-spin" size={17} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                        Presentation Engine
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {currentStage}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/70 px-3 py-1 rounded-full border border-violet-200/70 dark:border-violet-800/40 shadow-xs">
                    {progressPercent}%
                  </span>
                </div>

                {/* Real Progress Bar */}
                <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {stageDetail && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {stageDetail}
                  </p>
                )}

                {/* Real Progression Checklist (7 Specific Required Stages) */}
                <div className="pt-3 border-t border-violet-200/50 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Preparing presentation', min: 10 },
                    { label: 'Understanding your content', min: 25 },
                    { label: 'Building slide structure', min: 50 },
                    { label: 'Generating slides', min: 75 },
                    { label: 'Creating visuals / layout', min: 88 },
                    { label: 'Preparing PPTX', min: 95 },
                    { label: 'Ready', min: 100 },
                  ].map((step, idx) => {
                    const isDone = progressPercent > step.min || (step.min === 100 && progressPercent >= 100);
                    const isCurrent = (progressPercent >= step.min && !isDone) || (currentStage === step.label);

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                          isCurrent
                            ? 'bg-violet-100/90 dark:bg-violet-950/60 text-violet-900 dark:text-violet-200 font-bold border border-violet-300 dark:border-violet-700/60 shadow-xs'
                            : isDone
                            ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                            : 'text-slate-400 dark:text-slate-500 font-normal'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        ) : isCurrent ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-ping shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                        )}
                        <span className="truncate">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGeneratePresentation}
                disabled={isGenerating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-violet-600/30 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="animate-spin" size={18} />
                    <span>{currentStage} ({progressPercent}%)</span>
                  </>
                ) : (
                  <>
                    <Presentation size={18} />
                    <span>Generate Presentation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MODE 2: LIVE PRESENTATION STUDIO
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Top Navigation & Action Toolbar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProject(null)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Setup</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* Editable Presentation Title */}
          <input
            type="text"
            value={project.title}
            onChange={(e) => setProject({ ...project, title: e.target.value })}
            className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-violet-500 focus:outline-none max-w-[240px] sm:max-w-md truncate"
          />

          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
            {project.slides.length} Slides
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value as PresentationThemeId)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            {(Object.keys(PRESENTATION_THEMES) as PresentationThemeId[]).map((tId) => (
              <option key={tId} value={tId}>
                {PRESENTATION_THEMES[tId].name}
              </option>
            ))}
          </select>

          {/* Present Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
            title="Start Fullscreen Presentation"
          >
            <Play size={13} className="text-emerald-500" />
            <span className="hidden sm:inline">Present</span>
          </button>

          {/* REAL POWERPOINT DOWNLOAD BUTTON */}
          <button
            onClick={handleDownloadPptx}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>Download .PPTX</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-indigo-600 text-white text-xs px-4 py-1.5 text-center font-medium">
          {statusMessage}
        </div>
      )}

      {/* Main Studio Work Area */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* LEFT: SLIDE THUMBNAIL STRIP */}
        <aside className="w-56 sm:w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 overflow-y-auto flex flex-col justify-between shrink-0 space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Slide Outline
              </span>
              <button
                onClick={handleAddSlide}
                className="p-1 rounded-md text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer"
                title="Add New Slide"
              >
                <Plus size={15} />
              </button>
            </div>

            {project.slides.map((s, idx) => {
              const isSelected = idx === selectedSlideIndex;
              return (
                <div
                  key={s.id || idx}
                  onClick={() => setSelectedSlideIndex(idx)}
                  className={`group relative p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30 ring-2 ring-violet-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1 px-0.5">
                    <span className="font-mono font-bold text-slate-500">#{idx + 1}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{s.layout}</span>
                  </div>

                  {/* Thumbnail Canvas */}
                  <div className="w-full aspect-[16/9] rounded overflow-hidden shadow-xs pointer-events-none transform scale-100">
                    <SlideCanvas
                      slide={s}
                      themeId={themeId}
                      totalSlides={project.slides.length}
                      isEditable={false}
                      isThumbnail={true}
                    />
                  </div>

                  <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate mt-1.5 px-0.5">
                    {s.title}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddSlide}
            className="w-full py-2 rounded-xl text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 text-slate-600 dark:text-slate-300 hover:text-violet-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Slide</span>
          </button>
        </aside>

        {/* CENTER: LARGE ACTIVE SLIDE CANVAS */}
        <main className="flex-1 flex flex-col items-center justify-between p-4 sm:p-8 overflow-y-auto bg-slate-200/40 dark:bg-slate-950">
          {activeSlide && (
            <div className="w-full max-w-4xl flex flex-col items-center space-y-4">
              {/* Slide Quick Action Bar */}
              <div className="w-full flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Layout:
                  </span>
                  <select
                    value={activeSlide.layout}
                    onChange={(e) => handleUpdateSlide({ ...activeSlide, layout: e.target.value as SlideLayoutType })}
                    className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none"
                  >
                    <option value="title">Title Slide</option>
                    <option value="bullets">Bullets Overview</option>
                    <option value="two-column">Two-Column Comparison</option>
                    <option value="process">Step-by-Step Process</option>
                    <option value="timeline">Milestone Timeline</option>
                    <option value="stats">Key Metrics / Stats</option>
                    <option value="table">Data Table</option>
                    <option value="conclusion">Conclusion & Takeaways</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveSlide('up')}
                    disabled={selectedSlideIndex === 0}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Move Slide Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveSlide('down')}
                    disabled={selectedSlideIndex === project.slides.length - 1}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Move Slide Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={handleDuplicateSlide}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    title="Duplicate Slide"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={handleDeleteSlide}
                    className="p-1.5 rounded hover:bg-rose-100 text-rose-500 cursor-pointer"
                    title="Delete Slide"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Large Editable Slide Canvas */}
              <div className="w-full aspect-[16/9] shadow-xl rounded-lg overflow-hidden bg-white">
                <SlideCanvas
                  slide={activeSlide}
                  themeId={themeId}
                  totalSlides={project.slides.length}
                  isEditable={true}
                  onUpdateSlide={handleUpdateSlide}
                />
              </div>

              {/* Slide Navigation Pagination */}
              <div className="flex items-center justify-between w-full pt-1">
                <button
                  onClick={() => setSelectedSlideIndex((p) => Math.max(0, p - 1))}
                  disabled={selectedSlideIndex === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-bold font-mono text-slate-500">
                  Slide {selectedSlideIndex + 1} of {project.slides.length}
                </span>

                <button
                  onClick={() => setSelectedSlideIndex((p) => Math.min(project.slides.length - 1, p + 1))}
                  disabled={selectedSlideIndex === project.slides.length - 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* AI Slide Assistant & Speaker Notes Toolbar */}
              <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      AI Slide Assistant
                    </span>
                  </div>

                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    {showNotes ? 'Hide Speaker Notes' : 'Show Speaker Notes'}
                  </button>
                </div>

                {/* AI Quick Polish Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'simplify', label: 'Make this slide simpler' },
                    { id: 'add_technical_details', label: 'Add more technical details' },
                    { id: 'make_beginner_friendly', label: 'Make beginner-friendly' },
                    { id: 'convert_to_bullets', label: 'Convert to bullet points' },
                    { id: 'convert_to_table', label: 'Create comparison table' },
                    { id: 'regenerate', label: 'Regenerate this slide' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      onClick={() => handleImproveSlide(act.id)}
                      disabled={isImprovingSlide}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-700 dark:text-slate-300 hover:text-violet-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>

                {/* Custom Instruction Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={slideInstruction}
                    onChange={(e) => setSlideInstruction(e.target.value)}
                    placeholder="Type custom instruction for this slide (e.g. Focus on AWS serverless metrics)..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    onClick={() => handleImproveSlide('custom', slideInstruction)}
                    disabled={!slideInstruction.trim() || isImprovingSlide}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white cursor-pointer disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>

                {/* Speaker Notes Area */}
                {showNotes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Speaker Notes (Spoken Presenter Context)
                      </span>
                      <button
                        onClick={async () => {
                          if (!activeConvId) return;
                          setStatusMessage('Synthesizing speaker notes...');
                          await fetch('/api/presentation/slide/generate-notes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              conversation_id: activeConvId,
                              slide_index: selectedSlideIndex,
                            }),
                          });
                          await loadProject(activeConvId);
                          setStatusMessage('Generated speaker notes!');
                          setTimeout(() => setStatusMessage(null), 3000);
                        }}
                        className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Auto-Generate Notes
                      </button>
                    </div>
                    <textarea
                      value={activeSlide.speaker_notes || ''}
                      onChange={(e) => handleUpdateSlide({ ...activeSlide, speaker_notes: e.target.value })}
                      placeholder="Enter what the presenter should say on this slide..."
                      rows={2}
                      className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

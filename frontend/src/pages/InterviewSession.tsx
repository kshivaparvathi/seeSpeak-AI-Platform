import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { InterviewSoundBox } from '../components/InterviewSoundBox';
import { getFeatureConfig } from '../config/features';
import { Conversation, Message, ConversationFile, SupportedLanguage } from '../types';
import { speakText, stopSpeaking, detectLanguageFromText, isSpeaking } from '../utils/speech';
import { 
  Award, 
  CheckCircle2, 
  Square, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Check, 
  BookOpen, 
  RotateCcw, 
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Upload,
  Volume2,
  VolumeX,
  Send,
  User,
  Bot,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

interface InterviewSessionProps {
  onBack: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage?: (lang: SupportedLanguage) => void;
  onSelectFeature?: (route: string) => void;
  onNewConversation?: () => void;
  conversationId?: string;
  onConversationCreated?: (conv: Conversation) => void;
  initialPrompt?: string;
}

export const INTERVIEW_LANGUAGES: { code: SupportedLanguage; name: string; nativeName: string; flag: string; speechCode: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', speechCode: 'en-US' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', speechCode: 'te-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', speechCode: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', speechCode: 'ta-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', speechCode: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', speechCode: 'ml-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', speechCode: 'mr-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', speechCode: 'bn-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', speechCode: 'gu-IN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', speechCode: 'pa-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', speechCode: 'ur-IN' },
];

export const INTERVIEW_ROLES = [
  'Software Engineer',
  'Full Stack Developer',
  'Frontend Engineer',
  'Backend Engineer',
  'Data Scientist / AI Engineer',
  'DevOps / Cloud Engineer',
  'Mobile Developer',
  'System Architect',
  'HR & Behavioral',
];

export const INTERVIEW_DIFFICULTIES = [
  'Junior',
  'Intermediate',
  'Senior',
  'Lead / Principal',
];

export const getLanguageName = (code: string) => {
  const match = INTERVIEW_LANGUAGES.find((l) => l.code === code);
  return match ? `${match.name} (${match.nativeName})` : code.toUpperCase();
};

export const InterviewSession: React.FC<InterviewSessionProps> = ({
  onBack,
  selectedLanguage,
  onSelectLanguage,
  onSelectFeature,
  onNewConversation,
  conversationId,
  onConversationCreated,
  initialPrompt,
}) => {
  const feature = getFeatureConfig('ai-interview');
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ConversationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sound & Speech State
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [autoTts, setAutoTts] = useState(true);
  const [typedInput, setTypedInput] = useState('');

  // Interview Setup & Language State (strictly isolated to this interview conversation)
  const [selectedRole, setSelectedRole] = useState<string>('Software Engineer');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Senior');
  const [interviewLanguage, setInterviewLanguage] = useState<SupportedLanguage>(
    selectedLanguage && selectedLanguage !== 'auto' ? selectedLanguage : 'en'
  );
  const [detectedSpokenLanguage, setDetectedSpokenLanguage] = useState<string | null>(null);

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Interview Session Metadata & Evaluated Dashboard State
  const [sessionData, setSessionData] = useState<any>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [expandedQaIdx, setExpandedQaIdx] = useState<number | null>(null);

  // Load existing interview conversation data strictly isolated
  const loadConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conversations/${id}`);
        if (res.ok) {
          const data: Conversation = await res.json();
          const norm = (data.feature || '').toLowerCase().replace('feature/', '');
          if (norm !== 'ai-interview' && norm !== 'interview') {
            setConversation(null);
            setMessages([]);
            setAttachedFiles([]);
            setActiveConvId(undefined);
            return;
          }
          setConversation(data);
          setMessages(data.messages || []);
          setAttachedFiles(data.files || []);
          if (data.language && data.language !== 'auto') {
            setInterviewLanguage(data.language);
          }
        }

        // Fetch interview session record
        const sessRes = await fetch(`/api/interview/session/${id}`);
        if (sessRes.ok) {
          const sess = await sessRes.json();
          setSessionData(sess);
          if (sess.role) setSelectedRole(sess.role);
          if (sess.difficulty) setSelectedDifficulty(sess.difficulty);
          if (sess.language) {
            setInterviewLanguage(sess.language as SupportedLanguage);
          } else if (sess.setup_data?.interview_language) {
            setInterviewLanguage(sess.setup_data.interview_language as SupportedLanguage);
          }
          if (sess.status === 'completed') {
            setShowDashboard(true);
          }
        }
      } catch (err) {
        console.error('Failed to load interview conversation:', err);
      }
    },
    []
  );

  useEffect(() => {
    setActiveConvId(conversationId);
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setConversation(null);
      setMessages([]);
      setAttachedFiles([]);
      setSessionData(null);
      setShowDashboard(false);
      setDetectedSpokenLanguage(null);
    }
  }, [conversationId, loadConversation]);

  // Handle Interview Setup Change (Role, Difficulty, Interview Language)
  const handleUpdateSetup = async (newRole?: string, newDiff?: string, newLang?: SupportedLanguage) => {
    const roleVal = newRole ?? selectedRole;
    const diffVal = newDiff ?? selectedDifficulty;
    const langVal = newLang ?? interviewLanguage;

    if (newRole !== undefined) setSelectedRole(newRole);
    if (newDiff !== undefined) setSelectedDifficulty(newDiff);
    if (newLang !== undefined) {
      setInterviewLanguage(newLang);
      // Reset detected language when candidate explicitly changes interview language
      setDetectedSpokenLanguage(null);
    }

    if (activeConvId) {
      try {
        await fetch('/api/interview/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: activeConvId,
            role: roleVal,
            difficulty: diffVal,
            interview_language: langVal,
            candidate_name: sessionData?.candidate_name || '',
          }),
        });
      } catch (err) {
        console.error('Failed to update interview setup:', err);
      }
    }
  };

  // Scroll transcript to bottom when messages update
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Speak interviewer responses
  const playInterviewerSpeech = useCallback(
    (text: string) => {
      if (!autoTts || !text) return;
      stopSpeaking();
      const effectiveLang = (detectedSpokenLanguage as SupportedLanguage) || interviewLanguage;
      const detectedLang = detectLanguageFromText(text, effectiveLang);
      speakText(text, detectedLang, {
        onStart: () => setIsAiSpeaking(true),
        onEnd: () => setIsAiSpeaking(false),
        onError: () => setIsAiSpeaking(false),
      });
    },
    [autoTts, detectedSpokenLanguage, interviewLanguage]
  );

  // Handle Resume / JD / PDF Upload
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (activeConvId) {
        formData.append('conversation_id', activeConvId);
      }
      formData.append('feature', 'ai-interview');
      formData.append('language', interviewLanguage);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const fileRecord = await res.json();
      const convId = fileRecord.conversation_id;

      if (!activeConvId && convId) {
        setActiveConvId(convId);
        if (onConversationCreated) {
          const convRes = await fetch(`/api/conversations/${convId}`);
          if (convRes.ok) {
            const newConv = await convRes.json();
            onConversationCreated(newConv);
          }
        }
      }

      if (convId) {
        await loadConversation(convId);
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Send Candidate Spoken or Typed Response
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setStreamingText('');

    // If verbal "end interview" command
    if (text.trim().toLowerCase().match(/^(?:end|stop|finish|conclude)\s+interview/i)) {
      handleEndInterview();
      setIsLoading(false);
      return;
    }

    // Dynamic candidate spoken language detection (spoken language takes precedence)
    const detected = detectLanguageFromText(text, interviewLanguage);
    if (detected && detected !== detectedSpokenLanguage) {
      setDetectedSpokenLanguage(detected);
    }
    const sendLanguage = detected || interviewLanguage;

    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      conversation_id: activeConvId || '',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let currentId = activeConvId;
      if (!currentId) {
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature: 'ai-interview',
            language: interviewLanguage,
            title: `Interview: ${text.slice(0, 30)}`,
          }),
        });
        if (createRes.ok) {
          const newConv: Conversation = await createRes.json();
          currentId = newConv.id;
          setActiveConvId(currentId);
          if (onConversationCreated) onConversationCreated(newConv);

          // Persist setup data into the new session
          try {
            await fetch('/api/interview/setup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversation_id: currentId,
                role: selectedRole,
                difficulty: selectedDifficulty,
                interview_language: interviewLanguage,
              }),
            });
          } catch (_) {}
        }
      }

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentId,
          message: text,
          language: sendLanguage,
          feature: 'ai-interview',
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat error: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value);
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.text && !parsed.done) {
                  accumulated += parsed.text;
                  setStreamingText(accumulated);
                }
              } catch (_) {}
            }
          }
        }
      }

      if (currentId) {
        await loadConversation(currentId);
      }

      // Automatically speak out the AI interviewer's answer
      if (accumulated) {
        playInterviewerSpeech(accumulated);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing interview response');
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  // Finalize & End Interview -> Generate Real Evaluated Dashboard
  const handleEndInterview = async () => {
    if (!activeConvId) return;
    setIsEnding(true);
    stopSpeaking();
    try {
      const res = await fetch('/api/interview/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: activeConvId }),
      });
      if (res.ok) {
        const result = await res.json();
        setSessionData(result);
        setShowDashboard(true);
      }
    } catch (err) {
      console.error('Failed to finalize interview:', err);
    } finally {
      setIsEnding(false);
    }
  };

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isLoading) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Determine current active question from the AI interviewer
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const activeQuestionText =
    streamingText ||
    lastAssistantMsg?.content ||
    "Hello! Welcome to your AI Mock Interview. Click [ ▶ START RECORDING ] below to introduce yourself, or ask for guidance on any topic or error.";

  const candidateName = sessionData?.candidate_name || 'Candidate';
  const roleName = sessionData?.role || sessionData?.company_exam || 'Technical Role';
  const metrics = sessionData?.metrics || {};

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Top Header Bar */}
      <ConversationHeader
        title="AI Interview Practice"
        subtitle={
          sessionData?.candidate_name
            ? `Candidate: ${sessionData.candidate_name} • ${selectedRole} (${selectedDifficulty})`
            : `Senior Mock Interview: ${selectedRole} • ${selectedDifficulty}`
        }
        onBack={onBack}
        onNewConversation={() => {
          stopSpeaking();
          setSessionData(null);
          setShowDashboard(false);
          setDetectedSpokenLanguage(null);
          if (onNewConversation) onNewConversation();
        }}
        language={interviewLanguage}
        activeFeatureId="ai-interview"
        onSelectFeature={onSelectFeature}
      />

      {/* Top Meta Ribbon */}
      <div className="bg-rose-50 dark:bg-rose-950/20 border-b border-rose-200 dark:border-rose-500/20 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-rose-800 dark:text-rose-200 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <Award size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-bold">Interview Workspace</span>
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
            • Evaluates Correctness, Reasoning, Communication & Missing Concepts
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* TTS Toggle */}
          <button
            onClick={() => {
              const next = !autoTts;
              setAutoTts(next);
              if (!next) stopSpeaking();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              autoTts
                ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700/50 text-rose-700 dark:text-rose-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
            title="Toggle automated interviewer speech"
          >
            {autoTts ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span className="hidden md:inline">{autoTts ? 'Voice On' : 'Voice Off'}</span>
          </button>

          {/* End Interview Action Button */}
          {messages.length > 0 && !showDashboard && (
            <button
              onClick={handleEndInterview}
              disabled={isEnding}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/30 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Square size={12} className="fill-white" />
              <span>{isEnding ? 'Evaluating...' : 'End Interview'}</span>
            </button>
          )}

          {showDashboard && (
            <button
              onClick={() => setShowDashboard(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs transition-colors cursor-pointer"
            >
              <MessageSquare size={13} />
              <span>View Workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View: Toggle between Dynamic Evaluated Dashboard OR Active Interview Stage */}
      {showDashboard && sessionData ? (
        /* =====================================================
           FINAL PERSONALIZED INTERVIEW DASHBOARD
           ===================================================== */
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 animate-fadeIn">
          {/* Hero Greeting Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-slate-100/50 dark:from-indigo-900/40 dark:via-purple-900/20 dark:to-slate-900/80 border border-indigo-200 dark:border-indigo-500/30 shadow-lg dark:shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
              <Sparkles size={14} />
              <span>Interview Session Concluded</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              Hi {candidateName}! 👋
            </h1>
            <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
              Your <span className="font-semibold text-indigo-600 dark:text-indigo-300">{roleName}</span> mock interview is complete. Here is your comprehensive evaluation calculated from your actual responses.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
              <span>🎯 Target: {sessionData.target || sessionData.company_exam || 'General'}</span>
              <span>🎓 Branch: {sessionData.branch || 'Engineering'}</span>
              <span>⚡ Type: {sessionData.interview_type || 'Technical'}</span>
            </div>
          </div>

          {/* Dynamic Performance Metrics Cards */}
          <div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
              <BarChart3 size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Session Performance Metrics</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-500/30 flex flex-col items-center justify-center text-center shadow-md">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  {metrics.overall_readiness || 0}%
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">Overall Readiness</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.technical_knowledge || 0}%
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">Technical Knowledge</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {metrics.answer_quality || 0}%
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">Answer Quality</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {metrics.communication || 0}%
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">Communication</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {metrics.questions_answered || 0}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">Questions Answered</span>
              </div>
            </div>
          </div>

          {/* Strengths & Improvement Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-500/20 shadow-md">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider font-mono mb-3">
                <Check size={16} />
                <span>Demonstrated Strengths</span>
              </div>
              <ul className="space-y-2">
                {(sessionData.strengths || []).map((s: string, idx: number) => (
                  <li key={idx} className="text-xs md:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-500/20 shadow-md">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider font-mono mb-3">
                <TrendingUp size={16} />
                <span>Areas For Improvement</span>
              </div>
              <ul className="space-y-2">
                {(sessionData.improvements || []).map((imp: string, idx: number) => (
                  <li key={idx} className="text-xs md:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Concepts to Revise */}
          {sessionData.concepts_to_revise && sessionData.concepts_to_revise.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-rose-200 dark:border-rose-500/20 shadow-md">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider font-mono mb-3">
                <AlertTriangle size={15} />
                <span>Concepts To Revise Before Real Interview</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sessionData.concepts_to_revise.map((concept: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-rose-700 dark:text-rose-300 font-medium"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question-by-Question Detailed Review */}
          {sessionData.qa_records && sessionData.qa_records.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Question-by-Question Deep Dive ({sessionData.qa_records.length})</span>
              </div>

              {sessionData.qa_records.map((qa: any, idx: number) => {
                const isExpanded = expandedQaIdx === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      onClick={() => setExpandedQaIdx(isExpanded ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0 pr-2">
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          Q{qa.index || idx + 1}
                        </span>
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {qa.question}
                        </div>
                      </div>
                      <div className="text-slate-400 shrink-0">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-3 border-t border-slate-100 dark:border-slate-800/60 text-xs leading-relaxed">
                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                          <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold block mb-1 text-[11px]">
                            Your Spoken Response:
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 italic">
                            "{qa.user_response || 'No verbal answer recorded'}"
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
                              ✓ What You Did Well
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">{qa.what_was_good}</span>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
                            <span className="font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                              ⚠ What Needs Improvement
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">{qa.what_needs_improvement}</span>
                          </div>
                        </div>

                        {qa.better_answer && (
                          <div className="bg-indigo-50 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-500/25 rounded-xl p-3">
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300 block mb-1 font-mono text-[11px]">
                              💎 Better Interview Formulation:
                            </span>
                            <span className="text-slate-800 dark:text-slate-200">{qa.better_answer}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setSessionData(null);
                setShowDashboard(false);
                if (onNewConversation) onNewConversation();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw size={14} />
              <span>Start New Interview</span>
            </button>

            <button
              onClick={() => setShowDashboard(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs transition-colors cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Review Dialogue Transcript</span>
            </button>
          </div>
        </div>
      ) : (
        /* =====================================================
           SENIOR AI INTERVIEWER COMPLETE WORKSPACE STAGE
           ===================================================== */
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-3 md:p-5 overflow-y-auto lg:overflow-hidden max-w-7xl mx-auto w-full">
          
          {/* LEFT PANEL: COMPLETE SENIOR AI INTERVIEWER WORKSPACE */}
          <div className="lg:w-7/12 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-md relative overflow-hidden transition-all duration-200">
            {/* Header: Avatar, Title, Status & Listen Again */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/25 shrink-0 ${isAiSpeaking ? 'animate-pulse' : ''}`}>
                    <Bot size={22} />
                  </div>
                  {isAiSpeaking && (
                    <span className="absolute -inset-1 rounded-2xl bg-rose-500/30 animate-ping pointer-events-none" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Senior AI Interviewer</span>
                    {isAiSpeaking ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-mono animate-pulse">
                        Speaking...
                      </span>
                    ) : isLoading ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono animate-pulse">
                        Thinking...
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono">
                        Ready
                      </span>
                    )}
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Evaluation Domain: {selectedRole} • {selectedDifficulty}
                  </span>
                </div>
              </div>

              {/* Read question aloud button */}
              <button
                onClick={() => playInterviewerSpeech(activeQuestionText)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="Read question aloud"
              >
                <Volume2 size={13} className="text-indigo-500" />
                <span className="hidden sm:inline">Listen Again</span>
              </button>
            </div>

            {/* Clean Interview Setup Area: Role, Difficulty, Interview Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shrink-0">
              {/* Role Selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => handleUpdateSetup(e.target.value, undefined, undefined)}
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                >
                  {INTERVIEW_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Difficulty
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => handleUpdateSetup(undefined, e.target.value, undefined)}
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                >
                  {INTERVIEW_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interview Language Selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Interview Language
                </label>
                <select
                  value={interviewLanguage}
                  onChange={(e) => handleUpdateSetup(undefined, undefined, e.target.value as SupportedLanguage)}
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                >
                  {INTERVIEW_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidate Spoken Language Priority Notification Badge */}
            {detectedSpokenLanguage && detectedSpokenLanguage !== interviewLanguage && (
              <div className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 mb-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/50 shrink-0 animate-fadeIn">
                <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Candidate spoken language: <strong>{getLanguageName(detectedSpokenLanguage)}</strong> — Senior AI Interviewer will respond in {getLanguageName(detectedSpokenLanguage)}.
                </span>
              </div>
            )}

            {/* Current Active Question Display (scrolls internally if long) */}
            <div className="flex-1 min-h-[85px] max-h-48 overflow-y-auto pr-1.5 mb-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 scrollbar-thin">
              <span className="block text-[10px] font-mono uppercase font-bold text-rose-600 dark:text-rose-400 mb-1 tracking-wider">
                Current Question / Guidance
              </span>
              <div className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {activeQuestionText}
              </div>
            </div>

            {/* Embedded SoundBox with Waveform & Large Start/Stop Controls */}
            <div className="shrink-0">
              <InterviewSoundBox
                embedded={true}
                onSpeechCaptured={(spoken) => handleSendMessage(spoken)}
                isProcessing={isLoading}
                isAiSpeaking={isAiSpeaking}
                selectedLanguage={(detectedSpokenLanguage as any) || interviewLanguage}
                currentQuestion={activeQuestionText}
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons Footer: Upload Resume / JD and End Interview */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Upload size={13} className="text-blue-500" />
                <span>Upload Resume / JD</span>
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handleEndInterview}
                  disabled={isEnding}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Square size={12} className="fill-white" />
                  <span>{isEnding ? 'Evaluating...' : 'End Interview'}</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: LIVE INTERVIEW TRANSCRIPT & CHAT AREA */}
          <div className="lg:w-5/12 flex flex-col h-full min-h-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md overflow-hidden transition-all duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Live Transcript ({messages.length} exchanges)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Real-time Spoken Log
              </span>
            </div>

            {/* Scrollable Transcript List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Bot size={20} />
                  </div>
                  <p>No dialogue recorded yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Click the green <span className="font-semibold text-emerald-600 dark:text-emerald-400">[ ▶ START RECORDING ]</span> button to introduce yourself or speak your answer.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`p-3 rounded-2xl text-xs md:text-sm leading-relaxed flex items-start gap-2.5 ${
                        isUser
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-500/20 ml-4'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 mr-4'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white ${
                          isUser ? 'bg-indigo-600' : 'bg-rose-600'
                        }`}
                      >
                        {isUser ? <User size={13} /> : <Bot size={13} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider font-mono opacity-80">
                            {isUser ? 'Candidate Response' : 'Interviewer'}
                          </span>
                          {!isUser && (
                            <button
                              onClick={() => playInterviewerSpeech(msg.content)}
                              className="text-slate-400 hover:text-indigo-500 p-0.5 cursor-pointer"
                              title="Listen"
                            >
                              <Volume2 size={12} />
                            </button>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={transcriptBottomRef} />
            </div>

            {/* Fallback Text Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (typedInput.trim()) {
                  handleSendMessage(typedInput.trim());
                  setTypedInput('');
                }
              }}
              className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/40 shrink-0"
            >
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="Or type an answer / question here..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
              <button
                type="submit"
                disabled={isLoading || !typedInput.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-sm"
                title="Send written response"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};

export default InterviewSession;

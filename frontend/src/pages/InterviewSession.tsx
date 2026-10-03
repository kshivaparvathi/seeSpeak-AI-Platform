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
        }

        // Fetch interview session record
        const sessRes = await fetch(`/api/interview/session/${id}`);
        if (sessRes.ok) {
          const sess = await sessRes.json();
          setSessionData(sess);
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
    }
  }, [conversationId, loadConversation]);

  // Scroll transcript to bottom when messages update
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Speak interviewer responses
  const playInterviewerSpeech = useCallback(
    (text: string) => {
      if (!autoTts || !text) return;
      stopSpeaking();
      const detectedLang = detectLanguageFromText(text, selectedLanguage);
      speakText(text, detectedLang, {
        onStart: () => setIsAiSpeaking(true),
        onEnd: () => setIsAiSpeaking(false),
        onError: () => setIsAiSpeaking(false),
      });
    },
    [autoTts, selectedLanguage]
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
      formData.append('language', selectedLanguage);

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
            language: selectedLanguage,
            title: `Interview: ${text.slice(0, 30)}`,
          }),
        });
        if (createRes.ok) {
          const newConv: Conversation = await createRes.json();
          currentId = newConv.id;
          setActiveConvId(currentId);
          if (onConversationCreated) onConversationCreated(newConv);
        }
      }

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentId,
          message: text,
          language: selectedLanguage,
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
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Top Header Bar */}
      <ConversationHeader
        title="AI Interview Practice"
        subtitle={
          sessionData?.candidate_name
            ? `Candidate: ${sessionData.candidate_name} • ${roleName}`
            : "Professional Mock Interview Platform"
        }
        onBack={onBack}
        onNewConversation={() => {
          stopSpeaking();
          setSessionData(null);
          setShowDashboard(false);
          if (onNewConversation) onNewConversation();
        }}
        language={selectedLanguage}
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
           HACKERRANK-STYLE ACTIVE INTERVIEW PLATFORM STAGE
           ===================================================== */
        <div className="flex-1 flex flex-col overflow-y-auto px-3 py-4 md:px-6 md:py-5 max-w-4xl mx-auto w-full space-y-5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          
          {/* SECTION 1: AI INTERVIEWER CARD */}
          <div className="p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
                  <Bot size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>AI Senior Interviewer</span>
                    {isAiSpeaking && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-mono animate-pulse">
                        Speaking...
                      </span>
                    )}
                  </h2>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Evaluation Domain: {roleName}
                  </span>
                </div>
              </div>

              {/* Re-read question aloud button */}
              <button
                onClick={() => playInterviewerSpeech(activeQuestionText)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
                title="Read question aloud"
              >
                <Volume2 size={13} className="text-indigo-500" />
                <span className="hidden sm:inline">Listen Again</span>
              </button>
            </div>

            {/* Current Active Interviewer Question Display */}
            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed font-sans whitespace-pre-wrap">
              {activeQuestionText}
            </div>
          </div>

          {/* SECTION 2: DEDICATED SOUND BOX / VOICE RECORDING AREA */}
          <div className="w-full">
            <InterviewSoundBox
              onSpeechCaptured={(spoken) => handleSendMessage(spoken)}
              isProcessing={isLoading}
              isAiSpeaking={isAiSpeaking}
              selectedLanguage={selectedLanguage}
              currentQuestion={activeQuestionText}
              disabled={isLoading}
            />
          </div>

          {/* SECTION 3: QUICK CONTROLS BAR (Screen Share, Upload, End) */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              {/* Hidden file input */}
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

              {/* Upload Resume / JD Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Upload size={14} className="text-blue-500" />
                <span>Upload Resume / JD</span>
              </button>
            </div>

            {/* End Interview Quick Button */}
            {messages.length > 0 && (
              <button
                onClick={handleEndInterview}
                disabled={isEnding}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Square size={13} className="fill-white" />
                <span>End Interview</span>
              </button>
            )}
          </div>

          {/* SECTION 4: CONVERSATION TRANSCRIPT & HISTORY */}
          <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Interview Transcript ({messages.length} exchanges)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Real-time Spoken Log
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs">
                No dialogue yet. Use the large <span className="font-semibold text-emerald-600 dark:text-emerald-400">[ ▶ START RECORDING ]</span> button to speak your first answer.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`p-3 rounded-2xl text-xs md:text-sm leading-relaxed flex items-start gap-2.5 ${
                        isUser
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-500/20 ml-6'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 mr-6'
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
                })}
                <div ref={transcriptBottomRef} />
              </div>
            )}
          </div>

          {/* SECTION 5: FALLBACK TEXT INPUT (For candidates who prefer typing) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typedInput.trim()) {
                handleSendMessage(typedInput.trim());
                setTypedInput('');
              }
            }}
            className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder="Or type an answer / question here..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs md:text-sm bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={isLoading || !typedInput.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              title="Send written response"
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      )}
    </div>
  );
};

export default InterviewSession;

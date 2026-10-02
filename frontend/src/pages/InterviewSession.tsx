import React, { useState, useEffect, useCallback } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { MultimodalChat } from '../components/MultimodalChat';
import { VoiceModal } from '../components/VoiceModal';
import { getFeatureConfig } from '../config/features';
import { Conversation, Message, ConversationFile, SupportedLanguage } from '../types';
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
  ChevronUp
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
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Interview Session Metadata & Dashboard State
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

  // Handle Send Candidate Answer / Question
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    setError(null);
    setStreamingText('');

    // Check if user is saying "end interview" verbally
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
    } catch (err: any) {
      setError(err.message || 'Error processing interview answer');
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  // Finalize & End Interview -> Generate Real Evaluated Dashboard
  const handleEndInterview = async () => {
    if (!activeConvId) return;
    setIsEnding(true);
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

  const candidateName = sessionData?.candidate_name || 'Candidate';
  const roleName = sessionData?.role || sessionData?.company_exam || 'Technical Role';
  const metrics = sessionData?.metrics || {};

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      <ConversationHeader
        title="AI Interview Practice"
        subtitle={
          sessionData?.candidate_name
            ? `Candidate: ${sessionData.candidate_name} • ${roleName}`
            : "Personalized Interactive Mock Interviewer"
        }
        onBack={onBack}
        onNewConversation={() => {
          setSessionData(null);
          setShowDashboard(false);
          if (onNewConversation) onNewConversation();
        }}
        language={selectedLanguage}
        activeFeatureId="ai-interview"
        onSelectFeature={onSelectFeature}
      />

      {/* Top Banner / Interview Mode Controls */}
      <div className="bg-rose-950/30 border-b border-rose-500/20 px-4 py-2 flex items-center justify-between text-xs text-rose-200 shrink-0">
        <div className="flex items-center gap-2">
          <Award size={15} className="text-rose-400 shrink-0" />
          <span className="font-semibold">Mock Interview Session</span>
          <span className="text-slate-400 hidden sm:inline">
            • Evaluates Correctness, Clarity, Communication & Missing Concepts
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* End Interview Action Button */}
          {messages.length > 0 && !showDashboard && (
            <button
              onClick={handleEndInterview}
              disabled={isEnding}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/30 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Square size={12} className="fill-white" />
              <span>{isEnding ? 'Analyzing...' : 'End Interview'}</span>
            </button>
          )}

          {showDashboard && (
            <button
              onClick={() => setShowDashboard(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            >
              <MessageSquare size={13} />
              <span>View Transcript</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono hidden md:flex">
            <CheckCircle2 size={12} />
            <span>Voice & Mic Active</span>
          </div>
        </div>
      </div>

      {/* Main View: Toggle between Dynamic Evaluated Dashboard OR Active Dialogue */}
      {showDashboard && sessionData ? (
        /* =====================================================
           FINAL PERSONALIZED INTERVIEW DASHBOARD
           Calculated dynamically from the actual interview session
           ===================================================== */
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6 scrollbar-thin scrollbar-thumb-slate-800 animate-fadeIn">
          {/* Hero Greeting Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-slate-900/80 border border-indigo-500/30 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
              <Sparkles size={14} />
              <span>Interview Session Concluded</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
              Hi {candidateName}! 👋
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
              Your <span className="font-semibold text-indigo-300">{roleName}</span> mock interview is complete. Here is your comprehensive evaluation calculated from your actual responses.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
              <span>🎯 Target: {sessionData.target || sessionData.company_exam || 'General'}</span>
              <span>🎓 Branch: {sessionData.branch || 'Engineering'}</span>
              <span>⚡ Type: {sessionData.interview_type || 'Technical'}</span>
            </div>
          </div>

          {/* Dynamic Performance Metrics Cards */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
              <BarChart3 size={15} className="text-indigo-400" />
              <span>Session Performance Metrics</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30 flex flex-col items-center justify-center text-center shadow-lg">
                <span className="text-3xl font-black text-indigo-400 tracking-tight">
                  {metrics.overall_readiness || 0}%
                </span>
                <span className="text-xs font-semibold text-slate-300 mt-1">Overall Readiness</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-emerald-400">
                  {metrics.technical_knowledge || 0}%
                </span>
                <span className="text-xs text-slate-400 mt-1">Technical Knowledge</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-blue-400">
                  {metrics.answer_quality || 0}%
                </span>
                <span className="text-xs text-slate-400 mt-1">Answer Quality</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-purple-400">
                  {metrics.communication || 0}%
                </span>
                <span className="text-xs text-slate-400 mt-1">Communication</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-amber-400">
                  {metrics.questions_answered || 0}
                </span>
                <span className="text-xs text-slate-400 mt-1">Questions Answered</span>
              </div>
            </div>
          </div>

          {/* Strengths & Improvement Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Strengths */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 shadow-md">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider font-mono mb-3">
                <Check size={16} />
                <span>Demonstrated Strengths</span>
              </div>
              <ul className="space-y-2">
                {(sessionData.strengths || []).map((s: string, idx: number) => (
                  <li key={idx} className="text-xs md:text-sm text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvement Areas */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/20 shadow-md">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider font-mono mb-3">
                <TrendingUp size={16} />
                <span>Areas For Improvement</span>
              </div>
              <ul className="space-y-2">
                {(sessionData.improvements || []).map((imp: string, idx: number) => (
                  <li key={idx} className="text-xs md:text-sm text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Concepts to Revise */}
          {sessionData.concepts_to_revise && sessionData.concepts_to_revise.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-rose-500/20 shadow-md">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider font-mono mb-3">
                <AlertTriangle size={15} />
                <span>Concepts To Revise Before Real Interview</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sessionData.concepts_to_revise.map((concept: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-rose-200"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Personalized Next Step Recommendation */}
          {sessionData.next_step_recommendation && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 text-xs md:text-sm text-slate-200 leading-relaxed shadow-lg">
              <span className="font-bold text-indigo-300 block mb-1 font-mono uppercase text-xs">
                💡 Personalized Recommendation:
              </span>
              {sessionData.next_step_recommendation}
            </div>
          )}

          {/* Question-by-Question Detailed Review */}
          {sessionData.qa_records && sessionData.qa_records.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                <BookOpen size={15} className="text-indigo-400" />
                <span>Question-by-Question Deep Dive ({sessionData.qa_records.length})</span>
              </div>

              {sessionData.qa_records.map((qa: any, idx: number) => {
                const isExpanded = expandedQaIdx === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      onClick={() => setExpandedQaIdx(isExpanded ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-850/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0 pr-2">
                        <span className="text-xs font-mono font-bold text-indigo-400 mt-0.5">
                          Q{qa.index || idx + 1}
                        </span>
                        <div className="truncate text-sm font-semibold text-white">
                          {qa.question}
                        </div>
                      </div>
                      <div className="text-slate-400 shrink-0">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-3 border-t border-slate-800/60 text-xs leading-relaxed">
                        {/* User's Exact Answer */}
                        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                          <span className="font-mono text-slate-400 font-semibold block mb-1 text-[11px]">
                            Your Spoken Response:
                          </span>
                          <p className="text-slate-200 italic">
                            "{qa.user_response || 'No verbal answer recorded'}"
                          </p>
                        </div>

                        {/* What was good & needs improvement */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3">
                            <span className="font-semibold text-emerald-400 block mb-1">
                              ✓ What You Did Well
                            </span>
                            <span className="text-slate-300">{qa.what_was_good}</span>
                          </div>
                          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3">
                            <span className="font-semibold text-amber-400 block mb-1">
                              ⚠ What Needs Improvement
                            </span>
                            <span className="text-slate-300">{qa.what_needs_improvement}</span>
                          </div>
                        </div>

                        {/* Better Interview Answer */}
                        {qa.better_answer && (
                          <div className="bg-indigo-950/25 border border-indigo-500/25 rounded-xl p-3">
                            <span className="font-semibold text-indigo-300 block mb-1 font-mono text-[11px]">
                              💎 Better Interview Formulation:
                            </span>
                            <span className="text-slate-200">{qa.better_answer}</span>
                          </div>
                        )}

                        {/* Communication Feedback */}
                        {qa.communication_feedback && (
                          <div className="text-slate-400 text-[11px]">
                            <span className="font-semibold text-slate-300">Communication & Pacing: </span>
                            {qa.communication_feedback}
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
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Review Dialogue Transcript</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Dialogue Chatbot Stage */
        <MultimodalChat
          conversation={conversation}
          messages={messages}
          attachedFiles={attachedFiles}
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={onSelectLanguage || (() => {})}
          isLoading={isLoading}
          streamingText={streamingText}
          error={error}
          featureId="ai-interview"
          featureTitle="AI Mock Interview Practice"
          featureDescription="Tell me your name, target company, role, or branch to begin. The interviewer will evaluate your spoken answers and guide you step-by-step."
          samplePrompts={feature.samplePrompts}
          onOpenVoice={() => setIsVoiceOpen(true)}
          autoSpeakDefault={true}
        />
      )}

      {/* Voice Modal for Live WebSocket Audio */}
      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => {
          setIsVoiceOpen(false);
          if (activeConvId) {
            loadConversation(activeConvId);
          }
        }}
        featureId="ai-interview"
        featureTitle="AI Mock Interviewer (Live Spoken Session)"
        conversationId={activeConvId}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
};

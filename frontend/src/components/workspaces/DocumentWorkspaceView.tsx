import React, { useRef, useEffect, useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Volume2, 
  AlertCircle, 
  CheckCircle2, 
  BookOpen, 
  HelpCircle, 
  ListChecks, 
  GraduationCap, 
  Layers, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search
} from 'lucide-react';
import { Conversation, Message, SupportedLanguage, ConversationFile } from '../../types';
import { FileUpload } from '../FileUpload';
import { FileCard } from '../FileCard';
import { ChatComposer } from '../ChatComposer';
import { FeatureVisual } from '../FeatureVisual';
import { speakText, stopSpeaking, detectLanguageFromText, isSpeaking } from '../../utils/speech';

interface DocumentWorkspaceViewProps {
  conversation: Conversation | null;
  messages: Message[];
  attachedFiles: ConversationFile[];
  onSendMessage: (text: string) => Promise<void>;
  onFileUpload: (file: File) => Promise<void>;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  isLoading: boolean;
  streamingText?: string;
  error?: string | null;
  onOpenVoice?: () => void;
}

export const DocumentWorkspaceView: React.FC<DocumentWorkspaceViewProps> = ({
  conversation,
  messages,
  attachedFiles,
  onSendMessage,
  onFileUpload,
  selectedLanguage,
  onSelectLanguage,
  isLoading,
  streamingText,
  error,
  onOpenVoice,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState<boolean>(() => {
    return localStorage.getItem('seespeak_voice_output') === 'true';
  });

  const lastSpokenIdRef = useRef<string | null>(null);

  // Keep active file in sync
  useEffect(() => {
    if (attachedFiles.length > 0 && !activeFileId) {
      setActiveFileId(attachedFiles[0].id);
    }
  }, [attachedFiles, activeFileId]);

  // Scroll smoothly to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isLoading]);

  // Read aloud helper
  const handleSpeak = (text: string, id: string) => {
    if (speakingId === id || isSpeaking()) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    const lang = detectLanguageFromText(text, selectedLanguage);
    setSpeakingId(id);
    speakText(text, lang, {
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVoiceOutput = () => {
    setIsVoiceOutputEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('seespeak_voice_output', String(next));
      if (!next) {
        stopSpeaking();
        setSpeakingId(null);
      }
      return next;
    });
  };

  const activeFile = attachedFiles.find((f) => f.id === activeFileId) || attachedFiles[0];

  const studyActions = [
    {
      title: 'Executive Summary',
      desc: 'Concise summary with core takeaways',
      prompt: 'Please provide a comprehensive executive summary of this document, organized by key themes and critical takeaways.',
      icon: <BookOpen size={15} className="text-indigo-500" />,
    },
    {
      title: 'Exam & Viva Questions',
      desc: '5 high-yield revision questions with answers',
      prompt: 'Generate 5 high-yield exam and viva questions based on this document with model answers and concept explanations.',
      icon: <GraduationCap size={15} className="text-purple-500" />,
    },
    {
      title: 'Key Definitions & Formulas',
      desc: 'Terminology and essential equations',
      prompt: 'Extract all important definitions, formulas, technical terminology, and key concepts mentioned in this document.',
      icon: <Layers size={15} className="text-blue-500" />,
    },
    {
      title: 'Action Items & Next Steps',
      desc: 'Actionable deliverables checklist',
      prompt: 'Extract all action items, decisions made, deadlines, and recommended next steps from this document.',
      icon: <ListChecks size={15} className="text-emerald-500" />,
    },
    {
      title: 'Simple Explanation (ELI5)',
      desc: 'Explain in everyday plain language',
      prompt: 'Explain the core thesis and difficult concepts in this document in simple, beginner-friendly terms with real-world analogies.',
      icon: <HelpCircle size={15} className="text-amber-500" />,
    },
  ];

  const isEmpty = attachedFiles.length === 0 && messages.length === 0 && !streamingText;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {isEmpty ? (
        /* ================= PURPOSE-BUILT EMPTY STATE ================= */
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full mx-auto text-center space-y-6">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-sm">
              <Sparkles size={14} className="text-indigo-500" />
              <span>Document Intelligence Studio</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Strict Citation Isolation</span>
            </div>

            {/* Visual Centerpiece */}
            <div className="flex justify-center">
              <FeatureVisual featureId="document-analysis" size={72} />
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Document Intelligence Studio
              </h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
                Upload research papers, PDF contracts, textbooks, notes, or reports. Gemini reads every page with zero hallucination and ground-truth citations.
              </p>
            </div>

            {/* Upload Zone */}
            <div className="w-full">
              <FileUpload
                onFileUpload={onFileUpload}
                featureTitle="Document Studio"
                isUploading={isLoading}
              />
              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">PDF</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">DOCX</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">TXT</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">EPUB</span>
                <span>• Up to 20MB grounded</span>
              </div>
            </div>

            {/* Quick Starters */}
            <div className="pt-2 text-left">
              <div className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-500" />
                <span>Instant Comprehension Starters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {studyActions.slice(0, 4).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(action.prompt)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 hover:bg-indigo-50/50 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 text-left transition-all shadow-sm group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {action.icon}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                        {action.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {action.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= PURPOSE-BUILT ACTIVE 2-COLUMN STUDIO ================= */
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
          {/* LEFT / CENTER COLUMN: Document Chat & Grounded Stream */}
          <div className="flex-1 flex flex-col h-full min-w-0 border-r border-slate-200/70 dark:border-slate-800/80 overflow-hidden">
            {/* Grounded Document Header Bar */}
            {attachedFiles.length > 0 && (
              <div className="px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {activeFile?.filename || 'Active Document'}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={11} /> Grounded Document Context
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {attachedFiles.length > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto max-w-xs">
                      {attachedFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => setActiveFileId(file.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium truncate max-w-[120px] transition-colors cursor-pointer ${
                            file.id === activeFile?.id
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {file.filename}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    RAG Verified
                  </span>
                </div>
              </div>
            )}

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 animate-fadeIn ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 shadow-sm">
                        <Bot size={17} />
                      </div>
                    )}

                    <div
                      className={`group relative max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20 font-medium'
                          : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-none shadow-sm text-sm'
                      }`}
                    >
                      {msg.content}

                      {!isUser && (
                        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 text-xs">
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => handleSpeak(msg.content, msg.id)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                              speakingId === msg.id ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
                            }`}
                            title="Read aloud"
                          >
                            <Volume2
                              size={12}
                              className={speakingId === msg.id ? 'animate-pulse' : ''}
                            />
                            <span>{speakingId === msg.id ? 'Stop Speaking' : 'Read Aloud'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Streaming Response */}
              {streamingText && (
                <div className="flex items-start gap-3 animate-fadeIn justify-start">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <Bot size={17} />
                  </div>
                  <div className="max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-none shadow-sm leading-relaxed whitespace-pre-wrap text-sm">
                    {streamingText}
                    <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 rounded animate-pulse" />
                  </div>
                </div>
              )}

              {/* Thinking Indicator */}
              {isLoading && !streamingText && (
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 pl-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 text-xs font-mono shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                    <span>Analyzing document pages with Gemini 2.5...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Bottom Composer */}
            <div className="p-3 md:p-4 bg-white/70 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shrink-0">
              <ChatComposer
                onSendMessage={onSendMessage}
                onTriggerFileUpload={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.docx,.txt,.epub,.md';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      onFileUpload(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
                onOpenVoice={onOpenVoice}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={onSelectLanguage}
                isLoading={isLoading}
                hasAttachedFiles={attachedFiles.length > 0}
                placeholder="Ask any question about this document or choose a study action..."
                isVoiceOutputEnabled={isVoiceOutputEnabled}
                onToggleVoiceOutput={toggleVoiceOutput}
              />
            </div>
          </div>

          {/* RIGHT SIDEBAR: Document Study Tools & Grounded Companion */}
          <div className="w-full lg:w-80 xl:w-88 bg-slate-50/70 dark:bg-[#0e1322]/70 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-auto lg:h-full overflow-y-auto p-4 space-y-4 shrink-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {/* Grounded File Overview Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">
                <span>Active Document</span>
                <span className="text-emerald-500">Indexed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {activeFile?.filename || 'Document Loaded'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeFile ? `${(activeFile.size_bytes / 1024).toFixed(1)} KB` : 'Ready for questions'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Study Actions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-indigo-500" />
                  <span>Study Actions</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">1-Click</span>
              </div>

              {studyActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(action.prompt)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
                        {action.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {action.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 group-hover:text-indigo-500 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>

            {/* Grounding & Integrity Assurance */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-500/20 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold mb-1">
                <ShieldCheck size={15} />
                <span>Strict Grounding Shield</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Gemini answers are synthesized strictly from this document’s verified pages. Answers include verbatim excerpts where applicable.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

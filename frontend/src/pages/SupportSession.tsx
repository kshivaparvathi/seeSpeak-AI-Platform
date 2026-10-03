import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { ChatComposer } from '../components/ChatComposer';
import { FileUpload } from '../components/FileUpload';
import { FileCard } from '../components/FileCard';
import { FeatureVisual } from '../components/FeatureVisual';
import { getFeatureConfig } from '../config/features';
import { Conversation, Message, ConversationFile, SupportedLanguage } from '../types';
import { speakText, stopSpeaking, detectLanguageFromText, isSpeaking } from '../utils/speech';
import { 
  Headphones, 
  ShieldCheck, 
  LifeBuoy, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Volume2, 
  AlertCircle, 
  Wrench, 
  CreditCard, 
  KeyRound, 
  HelpCircle, 
  FileCode,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileQuestion
} from 'lucide-react';

interface SupportSessionProps {
  onBack: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage?: (lang: SupportedLanguage) => void;
  onSelectFeature?: (route: string) => void;
  onNewConversation?: () => void;
  conversationId?: string;
  onConversationCreated?: (conv: Conversation) => void;
  initialPrompt?: string;
}

export const SupportSession: React.FC<SupportSessionProps> = ({
  onBack,
  selectedLanguage,
  onSelectLanguage,
  onSelectFeature,
  onNewConversation,
  conversationId,
  onConversationCreated,
  initialPrompt,
}) => {
  const feature = getFeatureConfig('customer-support');
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ConversationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState<boolean>(() => {
    return localStorage.getItem('seespeak_voice_output') === 'true';
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load existing support conversation data strictly isolated
  const loadConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conversations/${id}`);
        if (res.ok) {
          const data: Conversation = await res.json();
          const norm = (data.feature || '').toLowerCase().replace('feature/', '');
          if (norm !== 'customer-support' && norm !== 'support') {
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
      } catch (err) {
        console.error('Failed to load support conversation:', err);
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
    }
  }, [conversationId, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isLoading]);

  // Handle Error Screenshot / Invoice / File Upload
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (activeConvId) {
        formData.append('conversation_id', activeConvId);
      }
      formData.append('feature', 'customer-support');
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
      setError(err.message || 'Error uploading support attachment');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Send Support Inquiry
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    setError(null);
    setStreamingText('');

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
            feature: 'customer-support',
            language: selectedLanguage,
            title: `Support: ${text.slice(0, 35)}`,
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
          feature: 'customer-support',
        }),
      });

      if (!res.ok) {
        throw new Error(`Support chat error: ${res.statusText}`);
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
      setError(err.message || 'Error processing support inquiry');
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isLoading) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

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

  const supportActions = [
    {
      title: 'Diagnose Error Screenshot',
      desc: 'Troubleshoot error codes & stack traces',
      prompt: 'I am encountering an error in the application. Please diagnose the cause from my description or uploaded screenshot and provide step-by-step resolution instructions.',
      icon: <Wrench size={15} className="text-emerald-500" />,
    },
    {
      title: 'Billing & Invoice Resolution',
      desc: 'Payment queries, refunds & plan upgrades',
      prompt: 'I have a question regarding my subscription, billing invoice, or payment status. Please guide me through resolving this.',
      icon: <CreditCard size={15} className="text-indigo-500" />,
    },
    {
      title: 'Account Access & Security',
      desc: 'Password recovery & session resets',
      prompt: 'I need assistance resetting my account access or verifying my authentication security settings.',
      icon: <KeyRound size={15} className="text-purple-500" />,
    },
    {
      title: 'Generate Technical Bug Report',
      desc: 'Structured diagnostics report for engineers',
      prompt: 'Please draft a clear, reproducible technical bug report for my issue including observed behavior, expected behavior, and diagnostic steps.',
      icon: <FileCode size={15} className="text-blue-500" />,
    },
  ];

  const isEmpty = attachedFiles.length === 0 && messages.length === 0 && !streamingText;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      <ConversationHeader
        title="Customer Support & Diagnostic Care"
        subtitle={conversation?.title || "Empathetic Technical & Account Care • Step-by-Step Resolution"}
        onBack={onBack}
        onNewConversation={onNewConversation}
        language={selectedLanguage}
        activeFeatureId="customer-support"
        onSelectFeature={onSelectFeature}
      />

      {/* Diagnostic Care Status Banner */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-200/80 dark:border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 shrink-0">
        <div className="flex items-center gap-2">
          <LifeBuoy size={15} className="text-emerald-500 shrink-0" />
          <span className="font-bold">Priority Diagnostic Concierge:</span>
          <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
            Attach error screenshots, invoices, or logs for instant root-cause analysis.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Care Active</span>
          </div>
        </div>
      </div>

      {isEmpty ? (
        /* Empty State */
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-sm">
              <Sparkles size={14} className="text-emerald-500" />
              <span>Dedicated Care Specialist</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">24/7 Intelligent Diagnostics</span>
            </div>

            <div className="flex justify-center">
              <FeatureVisual featureId="customer-support" size={72} />
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                How Can We Help You Today?
              </h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
                Describe your inquiry, attach an error screenshot or invoice, or speak directly to receive fast-track step-by-step diagnostic resolution.
              </p>
            </div>

            <div className="w-full">
              <FileUpload
                onFileUpload={handleFileUpload}
                featureTitle="Diagnostic Care"
                isUploading={isLoading}
              />
              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">Screenshots</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">Invoices</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">Logs</span>
                <span>• Strict Customer Privacy Isolated</span>
              </div>
            </div>

            <div className="pt-2 text-left">
              <div className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-500" />
                <span>Common Support Pathways</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {supportActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(action.prompt)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 hover:bg-emerald-50/50 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 text-left transition-all shadow-sm group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {action.icon}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
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
        /* Active Diagnostic Care Studio */
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
          {/* Main Conversation Stream */}
          <div className="flex-1 flex flex-col h-full min-w-0 border-r border-slate-200/70 dark:border-slate-800/80 overflow-hidden">
            {attachedFiles.length > 0 && (
              <div className="p-3 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Attached Support Evidence ({attachedFiles.length})</span>
                  <span className="text-emerald-500 font-mono text-[10px]">Encrypted & Isolated</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachedFiles.map((file) => (
                    <FileCard key={file.id} file={file} />
                  ))}
                </div>
              </div>
            )}

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
                      <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 shadow-sm">
                        <Bot size={17} />
                      </div>
                    )}

                    <div
                      className={`group relative max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/20 font-medium'
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
                              speakingId === msg.id ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
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

              {streamingText && (
                <div className="flex items-start gap-3 animate-fadeIn justify-start">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <Bot size={17} />
                  </div>
                  <div className="max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-none shadow-sm leading-relaxed whitespace-pre-wrap text-sm">
                    {streamingText}
                    <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 rounded animate-pulse" />
                  </div>
                </div>
              )}

              {isLoading && !streamingText && (
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 pl-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 text-xs font-mono shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Analyzing technical diagnostics & formulating solution...</span>
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
                onSendMessage={handleSendMessage}
                onTriggerFileUpload={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,.pdf,.txt,.log,.docx';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={onSelectLanguage || (() => {})}
                isLoading={isLoading}
                hasAttachedFiles={attachedFiles.length > 0}
                placeholder="Describe your issue or attach an error screenshot..."
                isVoiceOutputEnabled={isVoiceOutputEnabled}
                onToggleVoiceOutput={() => {
                  setIsVoiceOutputEnabled((prev) => {
                    const next = !prev;
                    localStorage.setItem('seespeak_voice_output', String(next));
                    if (!next) {
                      stopSpeaking();
                      setSpeakingId(null);
                    }
                    return next;
                  });
                }}
              />
            </div>
          </div>

          {/* Right Sidebar: Support Tools & Diagnostic Pathways */}
          <div className="w-full lg:w-80 xl:w-88 bg-slate-50/70 dark:bg-[#0e1322]/70 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-auto lg:h-full overflow-y-auto p-4 space-y-4 shrink-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {/* Quick Diagnostic Actions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-500" />
                  <span>Troubleshooting Pathways</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">1-Click</span>
              </div>

              {supportActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action.prompt)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 truncate">
                        {action.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {action.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 group-hover:text-emerald-500 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>

            {/* Privacy & SLA Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold mb-1">
                <ShieldCheck size={15} />
                <span>Encrypted Diagnostic Data</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                All error logs and invoices are processed inside your isolated user session with strict end-to-end encryption.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

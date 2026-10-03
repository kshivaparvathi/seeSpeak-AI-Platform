import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Video, 
  Music, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Volume2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ListChecks, 
  FileText, 
  Users, 
  Mail, 
  ChevronRight,
  ShieldCheck,
  Disc
} from 'lucide-react';
import { Conversation, Message, SupportedLanguage, ConversationFile } from '../../types';
import { FileUpload } from '../FileUpload';
import { ChatComposer } from '../ChatComposer';
import { FeatureVisual } from '../FeatureVisual';
import { speakText, stopSpeaking, detectLanguageFromText, isSpeaking } from '../../utils/speech';

interface MediaWorkspaceViewProps {
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

export const MediaWorkspaceView: React.FC<MediaWorkspaceViewProps> = ({
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

  // Get media files
  const mediaFiles = attachedFiles.filter(
    (f) =>
      f.mime_type.startsWith('video/') ||
      f.mime_type.startsWith('audio/') ||
      f.filename.match(/\.(mp4|mov|webm|mp3|wav|ogg|m4a)$/i)
  );

  useEffect(() => {
    if (mediaFiles.length > 0 && !activeFileId) {
      setActiveFileId(mediaFiles[0].id);
    }
  }, [mediaFiles, activeFileId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isLoading]);

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

  const activeMedia = mediaFiles.find((f) => f.id === activeFileId) || mediaFiles[0];
  const isVideo = activeMedia?.mime_type.startsWith('video/') || activeMedia?.filename.match(/\.(mp4|mov|webm)$/i);

  const mediaActions = [
    {
      title: 'Executive Meeting Minutes',
      desc: 'Structured overview of attendees, key decisions & outcomes',
      prompt: 'Generate professional executive meeting minutes from this recording. Include meeting goals, discussion summary, key decisions made, and unresolved topics.',
      icon: <FileText size={15} className="text-amber-500" />,
    },
    {
      title: 'Timestamped Agenda & Topics',
      desc: 'Chronological timeline of topics discussed',
      prompt: 'Provide a chronological timestamped breakdown of all topics, debates, and presentations throughout this audio/video recording.',
      icon: <Clock size={15} className="text-indigo-500" />,
    },
    {
      title: 'Action Items & Deliverables Checklist',
      desc: 'Tasks, owners, and next deadlines',
      prompt: 'Extract all action items, task assignments, commitments, and deadlines mentioned in this recording as an actionable checklist.',
      icon: <ListChecks size={15} className="text-emerald-500" />,
    },
    {
      title: 'Speaker Key Quotes & Stances',
      desc: 'Identify prominent arguments and viewpoints',
      prompt: 'Extract the most important quotes, key arguments, and consensus points expressed by participants during this recording.',
      icon: <Users size={15} className="text-blue-500" />,
    },
    {
      title: 'Draft Follow-Up Email',
      desc: 'Ready-to-send summary for team members',
      prompt: 'Draft a clean, polite follow-up email summarizing the key outcomes and next steps from this recording for distribution to the team.',
      icon: <Mail size={15} className="text-rose-500" />,
    },
  ];

  const isEmpty = attachedFiles.length === 0 && messages.length === 0 && !streamingText;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {isEmpty ? (
        /* ================= PURPOSE-BUILT EMPTY STATE ================= */
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold shadow-sm">
              <Sparkles size={14} className="text-amber-500" />
              <span>Media Review Room</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Multimodal Audio & Video</span>
            </div>

            <div className="flex justify-center">
              <FeatureVisual featureId="video-audio-review" size={72} />
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Video & Audio Review Room
              </h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
                Upload recorded lectures, meeting discussions, voice memos, or video presentations. Gemini extracts timestamped minutes, action items, and answers any query.
              </p>
            </div>

            <div className="w-full">
              <FileUpload
                onFileUpload={onFileUpload}
                featureTitle="Media Review Room"
                isUploading={isLoading}
              />
              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">MP3</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">WAV</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">MP4</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">WEBM</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">M4A</span>
                <span>• Full Audio/Video Native Ingestion</span>
              </div>
            </div>

            <div className="pt-2 text-left">
              <div className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>Instant Media Review Starters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {mediaActions.slice(0, 4).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(action.prompt)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 hover:bg-amber-50/50 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/50 text-left transition-all shadow-sm group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {action.icon}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-300">
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
        /* ================= PURPOSE-BUILT ACTIVE 2-COLUMN MEDIA STUDIO ================= */
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
          {/* LEFT / CENTER COLUMN: Native Player & Discussion Stream */}
          <div className="flex-1 flex flex-col h-full min-w-0 border-r border-slate-200/70 dark:border-slate-800/80 overflow-hidden">
            {/* Native HTML5 Media Player Bar */}
            {activeMedia && (
              <div className="p-3 md:p-4 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isVideo ? (
                        <Video size={16} className="text-rose-500 shrink-0" />
                      ) : (
                        <Music size={16} className="text-amber-500 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {activeMedia.filename}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                      Ground Audio Active
                    </span>
                  </div>

                  {/* HTML5 Native Video / Audio Player */}
                  {isVideo ? (
                    <div className="w-full max-h-[260px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
                      <video
                        src={`/uploads/${activeMedia.file_path.split(/[\\/]/).pop()}`}
                        controls
                        className="w-full h-auto max-h-[260px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full py-1">
                      <audio
                        src={`/uploads/${activeMedia.file_path.split(/[\\/]/).pop()}`}
                        controls
                        className="w-full h-10 rounded-lg"
                      />
                    </div>
                  )}
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
                      <div className="w-8 h-8 rounded-xl bg-amber-600/10 dark:bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 shadow-sm">
                        <Bot size={17} />
                      </div>
                    )}

                    <div
                      className={`group relative max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-amber-600 text-white rounded-tr-none shadow-md shadow-amber-600/20 font-medium'
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
                              speakingId === msg.id ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''
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
                  <div className="w-8 h-8 rounded-xl bg-amber-600/10 dark:bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <Bot size={17} />
                  </div>
                  <div className="max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-none shadow-sm leading-relaxed whitespace-pre-wrap text-sm">
                    {streamingText}
                    <span className="inline-block w-2 h-4 ml-1 bg-amber-500 rounded animate-pulse" />
                  </div>
                </div>
              )}

              {isLoading && !streamingText && (
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 pl-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600/10 dark:bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 animate-pulse">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 text-xs font-mono shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    <span>Gemini 2.5 transcribing audio timestamps...</span>
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
                  input.accept = 'video/*,audio/*,.mp4,.mov,.webm,.mp3,.wav,.ogg,.m4a';
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
                hasAttachedFiles={mediaFiles.length > 0}
                placeholder="Ask about this recording, request timestamps, or extract action items..."
                isVoiceOutputEnabled={isVoiceOutputEnabled}
                onToggleVoiceOutput={toggleVoiceOutput}
              />
            </div>
          </div>

          {/* RIGHT SIDEBAR: Media Intelligence Companion & Tools */}
          <div className="w-full lg:w-80 xl:w-88 bg-slate-50/70 dark:bg-[#0e1322]/70 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-auto lg:h-full overflow-y-auto p-4 space-y-4 shrink-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {/* Quick Media Actions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Media Tools</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">1-Click</span>
              </div>

              {mediaActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(action.prompt)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-300 truncate">
                        {action.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {action.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 group-hover:text-amber-500 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>

            {/* Audio Timestamp Assurance */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/20 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold mb-1">
                <ShieldCheck size={15} />
                <span>Timestamped Audio Grounding</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Gemini processes acoustic audio tracks to transcribe speakers and align timestamps with zero hallucination.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

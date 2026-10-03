import React, { useRef, useEffect, useState } from 'react';
import { 
  Eye, 
  Image as ImageIcon, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Volume2, 
  AlertCircle, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Layers, 
  Code2, 
  Palette, 
  FileSearch,
  ScanText,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Conversation, Message, SupportedLanguage, ConversationFile } from '../../types';
import { FileUpload } from '../FileUpload';
import { ChatComposer } from '../ChatComposer';
import { FeatureVisual } from '../FeatureVisual';
import { speakText, stopSpeaking, detectLanguageFromText, isSpeaking } from '../../utils/speech';

interface VisionWorkspaceViewProps {
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

export const VisionWorkspaceView: React.FC<VisionWorkspaceViewProps> = ({
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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState<boolean>(() => {
    return localStorage.getItem('seespeak_voice_output') === 'true';
  });

  // Get image files
  const imageFiles = attachedFiles.filter(
    (f) => f.mime_type.startsWith('image/') || f.filename.match(/\.(png|jpg|jpeg|webp|svg)$/i)
  );

  useEffect(() => {
    if (imageFiles.length > 0 && !activeFileId) {
      setActiveFileId(imageFiles[0].id);
    }
  }, [imageFiles, activeFileId]);

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

  const activeImage = imageFiles.find((f) => f.id === activeFileId) || imageFiles[0];

  const visionActions = [
    {
      title: 'Full Visual Inspection & Audit',
      desc: 'Examine UI hierarchy, spacing & design flaws',
      prompt: 'Perform a comprehensive visual inspection of this image. Detail the layout structure, visual hierarchy, spacing, accessibility contrast, and any design or alignment flaws.',
      icon: <Eye size={15} className="text-purple-500" />,
    },
    {
      title: 'OCR: Transcribe All Text',
      desc: 'High-precision text & label extraction',
      prompt: 'Extract and transcribe all text, numbers, labels, and watermarks present in this image with high precision, maintaining their logical grouping.',
      icon: <ScanText size={15} className="text-indigo-500" />,
    },
    {
      title: 'System / Architecture Diagram Flow',
      desc: 'Understand flowchart logic & components',
      prompt: 'Analyze this diagram. Identify all system components, nodes, relational arrows, data pipelines, and explain the overall architecture workflow step-by-step.',
      icon: <Layers size={15} className="text-blue-500" />,
    },
    {
      title: 'Convert UI Design to Code',
      desc: 'Generate clean HTML / Tailwind CSS markup',
      prompt: 'Convert the UI components in this image into clean, responsive HTML and Tailwind CSS code with modern styling.',
      icon: <Code2 size={15} className="text-emerald-500" />,
    },
    {
      title: 'Palette & Visual Style Guide',
      desc: 'Extract color hex codes & typography',
      prompt: 'Extract the complete color palette (with hex codes), typography choices, button styles, and design system rules reflected in this image.',
      icon: <Palette size={15} className="text-amber-500" />,
    },
  ];

  const isEmpty = attachedFiles.length === 0 && messages.length === 0 && !streamingText;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {isEmpty ? (
        /* ================= PURPOSE-BUILT EMPTY STATE ================= */
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold shadow-sm">
              <Sparkles size={14} className="text-purple-500" />
              <span>AI Vision & Canvas Studio</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Gemini 2.5 Multimodal</span>
            </div>

            <div className="flex justify-center">
              <FeatureVisual featureId="visual-intelligence" size={72} />
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Visual Intelligence Studio
              </h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
                Upload UI designs, system architectures, screenshots, diagrams, or charts for pixel-accurate inspection, OCR transcription, and code generation.
              </p>
            </div>

            <div className="w-full">
              <FileUpload
                onFileUpload={onFileUpload}
                featureTitle="Vision Studio"
                isUploading={isLoading}
              />
              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">PNG</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">JPG</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">WEBP</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">SVG</span>
                <span>• High-Resolution Multimodal Analysis</span>
              </div>
            </div>

            <div className="pt-2 text-left">
              <div className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-500" />
                <span>Instant Vision Starters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {visionActions.slice(0, 4).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(action.prompt)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 hover:bg-purple-50/50 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/50 text-left transition-all shadow-sm group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {action.icon}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-300">
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
        /* ================= PURPOSE-BUILT ACTIVE 2-COLUMN VISION CANVAS ================= */
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
          {/* LEFT / CENTER COLUMN: Large Visual Canvas & Discussion */}
          <div className="flex-1 flex flex-col h-full min-w-0 border-r border-slate-200/70 dark:border-slate-800/80 overflow-hidden">
            {/* Visual Canvas Display Area */}
            {activeImage && (
              <div className="p-3 md:p-4 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                  {/* Canvas Toolbar */}
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ImageIcon size={14} className="text-purple-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {activeImage.filename}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300">
                        Target Grounded
                      </span>
                    </div>

                    {/* Canvas Zoom Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <span className="text-[11px] font-mono text-slate-500 w-10 text-center">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        onClick={() => setZoomLevel(1)}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer text-[10px] font-mono"
                        title="Reset Zoom"
                      >
                        100%
                      </button>
                    </div>
                  </div>

                  {/* High-Resolution Visual Preview Canvas */}
                  <div className="relative w-full max-h-[260px] md:max-h-[320px] overflow-auto bg-slate-900/5 dark:bg-black/40 flex items-center justify-center p-3">
                    <img
                      src={`/uploads/${activeImage.file_path.split(/[\\/]/).pop()}`}
                      alt={activeImage.filename}
                      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                      className="max-h-[240px] md:max-h-[290px] w-auto object-contain rounded-lg shadow-sm transition-transform duration-150"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
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
                      <div className="w-8 h-8 rounded-xl bg-purple-600/10 dark:bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 shadow-sm">
                        <Bot size={17} />
                      </div>
                    )}

                    <div
                      className={`group relative max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-purple-600 text-white rounded-tr-none shadow-md shadow-purple-600/20 font-medium'
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
                              speakingId === msg.id ? 'text-purple-600 dark:text-purple-400 font-semibold' : ''
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
                  <div className="w-8 h-8 rounded-xl bg-purple-600/10 dark:bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                    <Bot size={17} />
                  </div>
                  <div className="max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-none shadow-sm leading-relaxed whitespace-pre-wrap text-sm">
                    {streamingText}
                    <span className="inline-block w-2 h-4 ml-1 bg-purple-500 rounded animate-pulse" />
                  </div>
                </div>
              )}

              {isLoading && !streamingText && (
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 pl-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/10 dark:bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 animate-pulse">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 text-xs font-mono shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                    <span>Gemini 2.5 Vision inspecting image pixels...</span>
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
                  input.accept = 'image/*,.png,.jpg,.jpeg,.webp,.svg';
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
                hasAttachedFiles={imageFiles.length > 0}
                placeholder="Ask about this image, request OCR, or click an inspection tool..."
                isVoiceOutputEnabled={isVoiceOutputEnabled}
                onToggleVoiceOutput={toggleVoiceOutput}
              />
            </div>
          </div>

          {/* RIGHT SIDEBAR: Vision Diagnostics & Tools */}
          <div className="w-full lg:w-80 xl:w-88 bg-slate-50/70 dark:bg-[#0e1322]/70 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-auto lg:h-full overflow-y-auto p-4 space-y-4 shrink-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {/* Gallery Thumbnails if multiple images */}
            {imageFiles.length > 1 && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Grounded Images ({imageFiles.length})
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {imageFiles.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveFileId(img.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        img.id === activeImage?.id
                          ? 'border-purple-500 ring-2 ring-purple-500/20 scale-105'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={`/uploads/${img.file_path.split(/[\\/]/).pop()}`}
                        alt={img.filename}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Inspection Actions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-500" />
                  <span>Vision Tools</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">1-Click</span>
              </div>

              {visionActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(action.prompt)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-300 truncate">
                        {action.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {action.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 group-hover:text-purple-500 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>

            {/* Gemini Vision Assurance */}
            <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-500/20 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold mb-1">
                <ShieldCheck size={15} />
                <span>Multimodal Vision Grounding</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Gemini processes the raw image tensors to examine spatial layout, typography, colors, and visual artifacts with precision.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

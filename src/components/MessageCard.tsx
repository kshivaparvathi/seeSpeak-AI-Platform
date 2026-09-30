'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  User, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Languages, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Database, 
  ChevronDown,
  Layers,
  HelpCircle,
  Play,
  Square
} from 'lucide-react';
import { ExplanationStyle, Message, SupportedLanguage, UploadedFile } from '@/lib/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SUPPORTED_LANGUAGES, getLanguageInfo } from '@/lib/languages';

interface MessageCardProps {
  message: Message;
  isStreaming?: boolean;
  statusMessage?: string;
  onExplainDifferently: (style: ExplanationStyle) => void;
  onRegenerate: () => void;
  onTranslateTo: (lang: SupportedLanguage) => void;
  onFollowUpClick: (question: string) => void;
  onAskAboutFile?: (file: UploadedFile) => void;
  isSpeakingThis: boolean;
  onPlaySpeech: (text: string, lang: SupportedLanguage) => void;
  onStopSpeech: () => void;
}

const EXPLAIN_OPTIONS: Array<{ style: ExplanationStyle; label: string; icon: string }> = [
  { style: 'simple', label: 'Simple (ELI5)', icon: '🎈' },
  { style: 'detailed', label: 'Detailed & In-Depth', icon: '🔬' },
  { style: 'beginner', label: 'Beginner Friendly', icon: '🌱' },
  { style: 'technical', label: 'Deeply Technical', icon: '⚙️' },
  { style: 'exam_ready', label: 'Exam Ready / Revision', icon: '📝' },
  { style: 'with_examples', label: 'With Real-World Examples', icon: '💡' },
  { style: 'step_by_step', label: 'Step-by-Step Guide', icon: '🪜' },
];

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  isStreaming = false,
  statusMessage,
  onExplainDifferently,
  onRegenerate,
  onTranslateTo,
  onFollowUpClick,
  onAskAboutFile,
  isSpeakingThis,
  onPlaySpeech,
  onStopSpeech,
}) => {
  const [copied, setCopied] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={14} className="text-purple-400" />;
      case 'pdf':
        return <FileText size={14} className="text-rose-400" />;
      case 'document':
        return <FileText size={14} className="text-blue-400" />;
      case 'audio':
        return <Music size={14} className="text-amber-400" />;
      case 'video':
        return <Video size={14} className="text-emerald-400" />;
      case 'data':
        return <Database size={14} className="text-teal-400" />;
      default:
        return <FileText size={14} className="text-slate-400" />;
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 my-4 group">
        <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end">
          {/* Uploaded File Badges / Thumbnails */}
          {message.files && message.files.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 mb-2">
              {message.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-md text-xs text-slate-200"
                >
                  {file.base64Data && file.type === 'image' ? (
                    <img
                      src={file.base64Data}
                      alt={file.name}
                      className="w-10 h-10 object-cover rounded-lg border border-slate-700"
                    />
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/60">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  <div className="max-w-[150px] truncate text-left">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{file.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User message bubble */}
          <div className="px-4 py-3 rounded-2xl rounded-tr-none bg-indigo-600 text-white shadow-md text-sm md:text-base leading-relaxed break-words">
            {message.content}
          </div>

          <div className="flex items-center gap-2 mt-1 mr-1 text-[11px] text-slate-500">
            {message.isVoiceInput && (
              <span className="flex items-center gap-1 text-rose-400">
                <Music size={11} /> Voice Input
              </span>
            )}
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
          <User size={16} />
        </div>
      </div>
    );
  }

  // Assistant Message
  const langInfo = getLanguageInfo(message.responseLanguage || 'auto');

  return (
    <div className="flex gap-3 my-5 group">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-indigo-600/20">
        <Bot size={17} />
      </div>

      <div className="max-w-[92%] sm:max-w-[85%] flex-1 space-y-3">
        {/* Dynamic Thinking State Pill */}
        {isStreaming && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{statusMessage || 'AURA is analyzing and generating response...'}</span>
          </div>
        )}

        {/* Message Content Box */}
        <div className="p-4 md:p-5 rounded-2xl rounded-tl-none bg-slate-900/90 border border-slate-800/80 shadow-lg text-slate-100 backdrop-blur-sm">
          {message.content ? (
            <MarkdownRenderer content={message.content} />
          ) : isStreaming ? (
            <div className="flex items-center gap-1.5 py-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          ) : null}

          {/* If there's an attached diagram */}
          {message.visualDiagram && (
            <div className="my-4 p-4 rounded-xl bg-slate-950 border border-indigo-500/30">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 mb-2 uppercase tracking-wider">
                <Layers size={14} />
                <span>Visual Flow Diagram</span>
              </div>
              <pre className="text-xs font-mono text-emerald-300 p-2 overflow-x-auto bg-slate-900 rounded-lg">
                {message.visualDiagram}
              </pre>
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        {!isStreaming && message.content && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pt-1 select-none">
            {/* Talk Back (TTS) button */}
            <button
              onClick={() => {
                if (isSpeakingThis) {
                  onStopSpeech();
                } else {
                  onPlaySpeech(message.content, message.responseLanguage || 'auto');
                }
              }}
              title={isSpeakingThis ? 'Stop speaking' : 'Listen to this response aloud'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                isSpeakingThis
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm animate-pulse'
                  : 'bg-slate-850 hover:bg-slate-800 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              {isSpeakingThis ? <Square size={13} className="fill-current" /> : <Volume2 size={14} />}
              <span>{isSpeakingThis ? 'Stop' : 'Talk Back'}</span>
              {isSpeakingThis && (
                <div className="flex items-center gap-0.5 ml-1">
                  <span className="w-0.5 h-2.5 bg-rose-400 animate-wave" />
                  <span className="w-0.5 h-3.5 bg-rose-400 animate-wave [animation-delay:0.1s]" />
                  <span className="w-0.5 h-2 bg-rose-400 animate-wave [animation-delay:0.2s]" />
                </div>
              )}
            </button>

            {/* Explain It My Way Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStyleMenu(!showStyleMenu)}
                title="Explain this in another style"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/60 hover:text-slate-200 transition-colors"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Explain differently</span>
                <ChevronDown size={12} />
              </button>

              {showStyleMenu && (
                <div className="absolute left-0 top-full mt-1 w-56 p-1.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-20 space-y-1">
                  {EXPLAIN_OPTIONS.map((opt) => (
                    <button
                      key={opt.style}
                      onClick={() => {
                        setShowStyleMenu(false);
                        onExplainDifferently(opt.style);
                      }}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-indigo-600/20 transition-colors"
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Translate Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTranslateMenu(!showTranslateMenu)}
                title="Translate this response to another language"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/60 hover:text-slate-200 transition-colors"
              >
                <Languages size={13} className="text-indigo-400" />
                <span>Translate</span>
                <ChevronDown size={12} />
              </button>

              {showTranslateMenu && (
                <div className="absolute left-0 top-full mt-1 w-48 max-h-56 overflow-y-auto p-1.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-20 space-y-0.5">
                  {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setShowTranslateMenu(false);
                        onTranslateTo(l.code);
                      }}
                      className="w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-indigo-600/20 transition-colors"
                    >
                      <span>
                        {l.flag} {l.name}
                      </span>
                      <span className="text-[10px] text-slate-500">{l.nativeName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              title="Copy message to clipboard"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/60 hover:text-slate-200 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Regenerate button */}
            <button
              onClick={onRegenerate}
              title="Regenerate this response"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/60 hover:text-slate-200 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Regenerate</span>
            </button>
          </div>
        )}

        {/* Smart Follow-Up Suggestions */}
        {!isStreaming && message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium text-slate-400">
              <HelpCircle size={12} className="text-indigo-400" />
              <span>Suggested Follow-Ups:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.followUpSuggestions.map((suggestion, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => onFollowUpClick(suggestion)}
                  className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-slate-700/70 text-xs text-slate-300 hover:text-indigo-200 transition-all text-left shadow-sm"
                >
                  ⚡ {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

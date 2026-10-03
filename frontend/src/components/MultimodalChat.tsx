import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bot, User, Sparkles, AlertCircle, FileText, Check, Copy, Volume2, VolumeX } from 'lucide-react';
import { Conversation, Message, SupportedLanguage, ConversationFile } from '../types';
import { FileCard } from './FileCard';
import { FileUpload } from './FileUpload';
import { ChatComposer } from './ChatComposer';
import { FeatureVisual } from './FeatureVisual';
import { speakText, stopSpeaking, detectLanguageFromText, isSpeaking } from '../utils/speech';

interface MultimodalChatProps {
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
  featureId: string;
  featureTitle: string;
  featureDescription: string;
  samplePrompts?: { text: string; langHint: string }[];
  onOpenVoice?: () => void;
  autoSpeakDefault?: boolean;
}

export const MultimodalChat: React.FC<MultimodalChatProps> = ({
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
  featureId,
  featureTitle,
  featureDescription,
  samplePrompts = [],
  onOpenVoice,
  autoSpeakDefault = false,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('seespeak_voice_output');
    return saved !== null ? saved === 'true' : autoSpeakDefault;
  });

  const lastSpokenIdRef = useRef<string | null>(null);

  const toggleVoiceOutput = useCallback(() => {
    setIsVoiceOutputEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('seespeak_voice_output', String(next));
      if (!next) {
        stopSpeaking();
        setSpeakingId(null);
      }
      return next;
    });
  }, []);

  // Scroll to bottom on updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isLoading]);

  // Handle Automatic Voice Playback when new assistant message completes
  useEffect(() => {
    if (!isVoiceOutputEnabled || isLoading || streamingText) return;

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.id !== lastSpokenIdRef.current) {
        lastSpokenIdRef.current = lastMsg.id;
        const lang = detectLanguageFromText(lastMsg.content, selectedLanguage);
        speakText(lastMsg.content, lang, {
          onStart: () => setSpeakingId(lastMsg.id),
          onEnd: () => setSpeakingId(null),
          onError: () => setSpeakingId(null),
        });
      }
    }
  }, [messages, isLoading, streamingText, isVoiceOutputEnabled, selectedLanguage]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  // Check if any attached files have image previews
  const imageFiles = attachedFiles.filter(
    (f) => f.mime_type.startsWith('image/') || f.filename.match(/\.(png|jpg|jpeg|webp)$/i)
  );

  return (
    <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto w-full px-3 md:px-6 py-3 md:py-4 overflow-hidden">
      {/* Attached Files Context Bar */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-400" />
              <span>Workspace Grounded Files ({attachedFiles.length})</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Isolated Context</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {attachedFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>

          {/* Quick Image Preview thumbnail if image workspace */}
          {imageFiles.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto">
              {imageFiles.map((img) => (
                <div
                  key={img.id}
                  className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-black/40 shrink-0"
                >
                  <img
                    src={`/uploads/${img.file_path.split(/[\\/]/).pop()}`}
                    alt={img.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
              <span className="text-[11px] text-slate-400 font-mono">Target Grounded</span>
            </div>
          )}
        </div>
      )}

      {/* Main Conversation Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 && !streamingText ? (
          /* Empty Workspace State */
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
            <div className="mb-4 flex items-center justify-center">
              <FeatureVisual featureId={featureId} size={64} />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">
              {featureTitle}
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              {featureDescription}
            </p>

            {/* Direct Upload Box if no files uploaded yet */}
            {attachedFiles.length === 0 && (
              <div className="w-full max-w-md mb-6">
                <FileUpload
                  onFileUpload={onFileUpload}
                  featureTitle={featureTitle}
                  isUploading={isLoading}
                />
              </div>
            )}

            {/* Smart Suggestions Chips */}
            {samplePrompts.length > 0 && (
              <div className="w-full max-w-lg text-left mt-2">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 font-mono">
                  Suggested Prompts
                </div>
                <div className="flex flex-wrap gap-2">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(p.text)}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-all hover:border-indigo-400 dark:hover:border-indigo-500/40 cursor-pointer shadow-sm"
                    >
                      <span>{p.text}</span>
                      <span className="text-[10px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {p.langHint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Message Stream */
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 text-sm md:text-base animate-fadeIn ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 shadow-sm">
                  <Bot size={17} />
                </div>
              )}

              {/* Message Bubble: Always displays the user's complete original question without fragmentation */}
              <div
                className={`group relative max-w-[88%] md:max-w-[80%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
                    : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800/90 rounded-tl-none shadow-sm'
                }`}
              >
                {msg.content}

                {/* Assistant Message Actions (Copy & Read Aloud) */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 text-xs">
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check size={12} className="text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => handleSpeak(msg.content, msg.id)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                        speakingId === msg.id ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
                      }`}
                      title={speakingId === msg.id ? 'Stop reading' : 'Read aloud with natural speech'}
                    >
                      <Volume2
                        size={12}
                        className={speakingId === msg.id ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''}
                      />
                      <span>{speakingId === msg.id ? 'Stop Speaking' : 'Read Aloud'}</span>
                    </button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5 shadow-sm">
                  <User size={17} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Live Streaming Response preview */}
        {streamingText && (
          <div className="flex items-start gap-3 text-sm md:text-base animate-fadeIn justify-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
              <Bot size={17} />
            </div>
            <div className="max-w-[88%] md:max-w-[80%] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none shadow-sm leading-relaxed whitespace-pre-wrap">
              {streamingText}
              <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 rounded animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading / Thinking Indicator */}
        {isLoading && !streamingText && (
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 pl-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse">
              <Sparkles size={16} />
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-mono shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span>Analyzing grounded context with Gemini...</span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Bottom Composer */}
      <div className="mt-2 shrink-0">
        <ChatComposer
          onSendMessage={onSendMessage}
          onTriggerFileUpload={() => {
            const input = document.createElement('input');
            input.type = 'file';
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
          isVoiceOutputEnabled={isVoiceOutputEnabled}
          onToggleVoiceOutput={toggleVoiceOutput}
        />
      </div>
    </div>
  );
};

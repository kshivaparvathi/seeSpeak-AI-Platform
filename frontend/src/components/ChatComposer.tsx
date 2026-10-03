import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Mic, MicOff, Globe, Radio, Volume2, VolumeX, Check, X, AlertCircle } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { SUPPORTED_LANGUAGES, getLanguageInfo } from '../config/languages';
import { QuickActionsMenu } from './QuickActionsMenu';
import { isSpeechRecognitionSupported, stopSpeaking } from '../utils/speech';

interface ChatComposerProps {
  onSendMessage: (message: string) => void;
  onTriggerFileUpload?: () => void;
  onOpenVoice?: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  isLoading?: boolean;
  placeholder?: string;
  hasAttachedFiles?: boolean;
  isVoiceOutputEnabled?: boolean;
  onToggleVoiceOutput?: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  onTriggerFileUpload,
  onOpenVoice,
  selectedLanguage,
  onSelectLanguage,
  isLoading = false,
  placeholder = 'Ask anything about your files or prompt...',
  hasAttachedFiles = false,
  isVoiceOutputEnabled = true,
  onToggleVoiceOutput,
}) => {
  const [text, setText] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<any>(null);

  const currentLang = getLanguageInfo(selectedLanguage);

  // Submit typed or current text
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    }

    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleQuickAction = (actionPrompt: string, _actionName: string) => {
    let finalPrompt = actionPrompt;
    if (text.trim()) {
      finalPrompt = `${text.trim()}\n\n${actionPrompt}`;
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    onSendMessage(finalPrompt);
  };

  // Stop listening cleanly and optionally send captured text
  const stopListening = useCallback((shouldSend: boolean = true) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    setIsListening(false);

    const fullCaptured = (finalTranscriptRef.current || liveTranscript).trim();
    finalTranscriptRef.current = '';
    setLiveTranscript('');

    if (shouldSend && fullCaptured && !isLoading) {
      onSendMessage(fullCaptured);
    }
  }, [liveTranscript, isLoading, onSendMessage]);

  // Cancel listening without sending
  const handleCancelListening = () => {
    stopListening(false);
  };

  // Start real speech recognition
  const startListening = async () => {
    setMicError(null);

    // Natural interruption: stop active AI speech playback when user starts talking
    stopSpeaking();

    if (!isSpeechRecognitionSupported()) {
      setMicError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setTimeout(() => setMicError(null), 5000);
      return;
    }

    // Check/request microphone permission with getUserMedia
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        // Stop the temporary stream tracks immediately after permission check
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone permission blocked. Please allow microphone in browser settings.');
      } else {
        setMicError(`Microphone access error: ${err.message || err.name}`);
      }
      setTimeout(() => setMicError(null), 5000);
      return;
    }

    try {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRec();

      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = currentLang.speechCode || 'en-US';

      finalTranscriptRef.current = '';
      setLiveTranscript('');

      rec.onstart = () => {
        setIsListening(true);
        setMicError(null);
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let accumulatedFinal = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            accumulatedFinal += (accumulatedFinal ? ' ' : '') + res[0].transcript.trim();
          } else {
            interim += res[0].transcript;
          }
        }

        finalTranscriptRef.current = accumulatedFinal;
        const currentDisplay = (accumulatedFinal + (interim ? ' ' + interim : '')).trim();
        setLiveTranscript(currentDisplay);

        // Reset silence detection timer (auto-send after 3.2s of silence if speech detected)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (accumulatedFinal.trim()) {
          silenceTimerRef.current = setTimeout(() => {
            stopListening(true);
          }, 3200);
        }
      };

      rec.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Normal silence, keep listening
          return;
        }
        if (event.error === 'not-allowed') {
          setMicError('Microphone permission was denied.');
        } else if (event.error === 'audio-capture') {
          setMicError('No microphone hardware detected.');
        } else {
          setMicError(`Recognition error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setMicError(null), 5000);
      };

      rec.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setMicError(`Failed to start microphone: ${err.message || err}`);
      setIsListening(false);
      setTimeout(() => setMicError(null), 5000);
    }
  };

  // Toggle listening button
  const handleToggleMic = () => {
    if (isListening) {
      stopListening(true);
    } else {
      startListening();
    }
  };

  // Close language popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up recognition and silence timer on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  return (
    <div className="w-full relative">
      {/* Microphone Error Notification */}
      {micError && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-red-500/15 border border-red-500/40 text-red-200 px-3.5 py-2 rounded-2xl text-xs flex items-center justify-between z-40 backdrop-blur-md shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <span>{micError}</span>
          </div>
          <button
            onClick={() => setMicError(null)}
            className="text-red-300 hover:text-white ml-2 p-0.5 rounded cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Active Listening Floating Banner */}
      {isListening && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-2 border-rose-500/50 rounded-2xl p-3 shadow-2xl z-40 backdrop-blur-md animate-fadeIn flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">
                Listening in {currentLang.name}... Speak your complete question
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stopListening(true)}
                disabled={!liveTranscript.trim() && !finalTranscriptRef.current}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  liveTranscript.trim() || finalTranscriptRef.current
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                <Check size={13} />
                <span>Done / Send</span>
              </button>
              <button
                type="button"
                onClick={handleCancelListening}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/70 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800/80 font-medium min-h-[36px] flex items-center">
            {liveTranscript ? (
              <span className="text-slate-900 dark:text-white italic">"{liveTranscript}"</span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-xs font-mono animate-pulse">
                [Audio stream active — speak now...]
              </span>
            )}
          </div>
        </div>
      )}

      {/* Language Selector Dropdown Popup */}
      {showLangMenu && (
        <div
          ref={menuRef}
          className="absolute bottom-full mb-2 left-0 w-64 max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-2 z-50 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Select Preferred Language
          </div>
          <div className="space-y-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang.code);
                  setShowLangMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  selectedLanguage === lang.code
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </span>
                <span className="text-[11px] opacity-70">{lang.nativeName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Composer Box */}
      <div className={`flex flex-col rounded-2xl bg-white dark:bg-slate-900/90 border transition-all shadow-md dark:shadow-lg p-2.5 ${
        isListening
          ? 'border-rose-500/70 ring-2 ring-rose-500/20'
          : 'border-slate-200 dark:border-slate-800 focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/20'
      }`}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? `Listening in ${currentLang.name}... Speak your full question...`
              : hasAttachedFiles
              ? 'Ask a question or choose a Quick Action for attached file(s)...'
              : placeholder
          }
          rows={1}
          disabled={isLoading || isListening}
          className={`w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm md:text-base resize-none focus:outline-none px-2 py-1 max-h-40 leading-relaxed ${
            isListening ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        />

        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-1 gap-2">
          {/* Left Action Controls: Upload + Quick Actions + Language + Voice Toggle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {onTriggerFileUpload && (
              <button
                type="button"
                onClick={onTriggerFileUpload}
                title="Attach document or media"
                disabled={isLoading || isListening}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Paperclip size={18} />
              </button>
            )}

            {/* Quick Actions Menu Trigger */}
            <QuickActionsMenu
              onSelectAction={handleQuickAction}
              disabled={isLoading || isListening}
            />

            {/* Language Selector Trigger */}
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              disabled={isLoading || isListening}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Change recognition and response language"
            >
              <Globe size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>{currentLang.flag}</span>
              <span className="font-medium hidden sm:inline">{currentLang.name}</span>
            </button>

            {/* Voice Output (TTS) Toggle Button */}
            {onToggleVoiceOutput && (
              <button
                type="button"
                onClick={onToggleVoiceOutput}
                title={isVoiceOutputEnabled ? 'Voice output is ON (AI speaks responses)' : 'Voice output is OFF'}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                  isVoiceOutputEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {isVoiceOutputEnabled ? (
                  <Volume2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <VolumeX size={14} className="text-slate-400 dark:text-slate-500" />
                )}
                <span className="font-medium hidden md:inline">
                  {isVoiceOutputEnabled ? 'Voice: ON' : 'Voice: OFF'}
                </span>
              </button>
            )}
          </div>

          {/* Right Action Controls: Microphone + Live Voice + Send */}
          <div className="flex items-center gap-2">
            {/* Real Microphone Recognition Button */}
            <button
              type="button"
              onClick={handleToggleMic}
              title={
                isListening
                  ? 'Click to finish speaking and send'
                  : `Speak your question in ${currentLang.name}`
              }
              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              {isListening && <span className="text-xs font-semibold pr-1">Listening</span>}
            </button>

            {/* Gemini Live Real-time Session Modal Trigger */}
            {onOpenVoice && (
              <button
                type="button"
                onClick={onOpenVoice}
                title="Start Real-Time Streaming Audio Conversation"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/10 to-indigo-500/10 dark:from-rose-500/20 dark:to-indigo-500/20 hover:from-rose-500/20 hover:to-indigo-500/20 dark:hover:from-rose-500/30 dark:hover:to-indigo-500/30 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Radio size={14} className="text-rose-500 dark:text-rose-400 animate-pulse" />
                <span className="text-xs font-semibold hidden sm:inline">Live Voice</span>
              </button>
            )}

            {/* Send Message Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!text.trim() || isLoading || isListening}
              className={`p-2.5 rounded-xl font-medium transition-all duration-150 flex items-center justify-center ${
                text.trim() && !isLoading && !isListening
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

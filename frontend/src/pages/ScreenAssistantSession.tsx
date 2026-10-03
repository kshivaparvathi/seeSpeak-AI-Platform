import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { InterviewSoundBox } from '../components/InterviewSoundBox';
import { useScreenShare } from '../hooks/useScreenShare';
import { getFeatureConfig } from '../config/features';
import { Conversation, Message, ConversationFile, SupportedLanguage } from '../types';
import { speakText, stopSpeaking, detectLanguageFromText } from '../utils/speech';
import { 
  Monitor, 
  MonitorOff, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Send, 
  User, 
  Bot, 
  HelpCircle,
  AlertTriangle,
  Compass,
  CheckCircle,
  Eye,
  FileQuestion,
  Search,
  ExternalLink
} from 'lucide-react';

interface ScreenAssistantSessionProps {
  onBack: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage?: (lang: SupportedLanguage) => void;
  onSelectFeature?: (route: string) => void;
  onNewConversation?: () => void;
  conversationId?: string;
  onConversationCreated?: (conv: Conversation) => void;
  initialPrompt?: string;
}

export const ScreenAssistantSession: React.FC<ScreenAssistantSessionProps> = ({
  onBack,
  selectedLanguage,
  onSelectLanguage,
  onSelectFeature,
  onNewConversation,
  conversationId,
  onConversationCreated,
  initialPrompt,
}) => {
  const feature = getFeatureConfig('ai-screen-assistant');
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Audio / Speech State
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [autoTts, setAutoTts] = useState(true);
  const [typedInput, setTypedInput] = useState('');

  // Screen Sharing Hook
  const {
    isSharing,
    videoRef,
    startScreenShare,
    stopScreenShare,
    captureScreenFrame,
    error: screenShareError,
  } = useScreenShare();

  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Load existing Screen Assistant conversation
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data: Conversation = await res.json();
        const norm = (data.feature || '').toLowerCase().replace('feature/', '');
        if (norm !== 'ai-screen-assistant' && norm !== 'screen-assistant') {
          setConversation(null);
          setMessages([]);
          setActiveConvId(undefined);
          return;
        }
        setConversation(data);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load screen assistant conversation:', err);
    }
  }, []);

  useEffect(() => {
    setActiveConvId(conversationId);
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setConversation(null);
      setMessages([]);
    }
  }, [conversationId, loadConversation]);

  // Scroll transcript to bottom on message update
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Speak AI assistant response
  const playAssistantSpeech = useCallback(
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

  // Send inquiry with live screen frame capture
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setStreamingText('');

    // Capture screen frame if screen sharing is active
    const screenFrame = isSharing ? captureScreenFrame() : null;

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
            feature: 'ai-screen-assistant',
            language: selectedLanguage,
            title: `Screen: ${text.slice(0, 30)}`,
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
          feature: 'ai-screen-assistant',
          screen_image: screenFrame || undefined,
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

      if (accumulated) {
        playAssistantSpeech(accumulated);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Screen Assistant');
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

  // Quick Action Prompts
  const quickActions = [
    { label: 'Explain This Screen', prompt: 'Please explain what is currently displayed on my screen and its primary purpose.' },
    { label: 'What Should I Do Next?', prompt: 'Looking at my current screen, what step should I take next to proceed?' },
    { label: 'Find Missing Information', prompt: 'Check this form or page. Are there any required fields or errors that I missed?' },
    { label: 'Explain This Field', prompt: 'Can you explain what this input field or section requires in simple terms?' },
    { label: 'Explain This Error', prompt: 'I encountered an error or warning on this screen. What is causing it and how do I fix it?' },
    { label: 'Guide Step by Step', prompt: 'Please guide me step by step through completing the task visible on this screen.' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Top Header */}
      <ConversationHeader
        title="AI Screen Assistant"
        subtitle="Real-time visual navigation, form assistance & live error troubleshooting"
        onBack={onBack}
        onNewConversation={() => {
          stopSpeaking();
          setActiveConvId(undefined);
          setConversation(null);
          setMessages([]);
          if (onNewConversation) onNewConversation();
        }}
        language={selectedLanguage}
        activeFeatureId="ai-screen-assistant"
        onSelectFeature={onSelectFeature}
      />

      {/* Meta Ribbon */}
      <div className="bg-cyan-50 dark:bg-cyan-950/20 border-b border-cyan-200 dark:border-cyan-500/20 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-cyan-900 dark:text-cyan-200 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <Monitor size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="font-bold">Live Screen Context Mode</span>
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
            • AI analyzes your screen frames securely to guide you without remote mouse control
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Audio TTS Toggle */}
          <button
            onClick={() => {
              const next = !autoTts;
              setAutoTts(next);
              if (!next) stopSpeaking();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              autoTts
                ? 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-300 dark:border-cyan-700/50 text-cyan-700 dark:text-cyan-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
            title="Toggle automated speech response"
          >
            {autoTts ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span className="hidden md:inline">{autoTts ? 'Voice On' : 'Voice Off'}</span>
          </button>

          {/* Screen Share Action Button */}
          {!isSharing ? (
            <button
              onClick={startScreenShare}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/30 cursor-pointer active:scale-95"
            >
              <Monitor size={13} />
              <span>Share Screen</span>
            </button>
          ) : (
            <button
              onClick={stopScreenShare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/30 cursor-pointer active:scale-95 animate-pulse"
            >
              <MonitorOff size={13} />
              <span>Stop Sharing</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full space-y-5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        
        {/* SECTION 1: PROMINENT LIVE VIDEO STREAM DISPLAY */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden transition-all">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isSharing ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isSharing ? 'Live Screen Stream (AI Context Active)' : 'Screen Preview Display'}
              </h2>
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {isSharing ? 'Frame ready for capture' : 'No screen shared'}
            </div>
          </div>

          {/* Video Container or Empty Share Prompt */}
          {isSharing ? (
            <div className="p-3 bg-black flex flex-col items-center justify-center min-h-[260px] md:min-h-[380px] max-h-[500px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[460px] object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/30 dark:bg-slate-900/40">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-inner">
                <Monitor size={32} />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Share Your Screen for Real-Time AI Assistance
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Open any application, portal, scholarship form, or error console. Click the button below to share your tab or window. The AI will inspect the screen on every question.
                </p>
              </div>
              <button
                onClick={startScreenShare}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Monitor size={15} />
                <span>Select Window or Screen to Share</span>
              </button>
            </div>
          )}

          {screenShareError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{screenShareError}</span>
            </div>
          )}
        </div>

        {/* SECTION 2: DEDICATED SOUND BOX / VOICE INTERACTION */}
        <div className="w-full">
          <InterviewSoundBox
            onSpeechCaptured={(spoken) => handleSendMessage(spoken)}
            isProcessing={isLoading}
            isAiSpeaking={isAiSpeaking}
            selectedLanguage={selectedLanguage}
            title="● Screen Voice Assistant Ready"
            idlePlaceholder="Click [ START ] and speak your question while looking at your screen"
            startLabel="🎤 START VOICE INQUIRY"
            stopLabel="■ STOP & ASK AI"
            disabled={isLoading}
          />
        </div>

        {/* SECTION 3: QUICK ACTION GUIDANCE BUTTONS */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Quick Screen Actions (1-Click Diagnostics)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {quickActions.map((qa, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qa.prompt)}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-cyan-50 dark:bg-slate-800/60 dark:hover:bg-cyan-950/30 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 text-xs font-medium text-left transition-all cursor-pointer truncate disabled:opacity-50"
                title={qa.prompt}
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 4: CONVERSATIONAL GUIDANCE TRANSCRIPT */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Guidance Transcript ({messages.length} exchanges)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Live Diagnostic Advice
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
              No questions asked yet. Share your screen, then use the voice button or click a quick action above.
            </div>
          ) : (
            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || idx}
                    className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed flex items-start gap-3 ${
                      isUser
                        ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 border border-cyan-200 dark:border-cyan-500/20 ml-6'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 mr-6'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white ${
                        isUser ? 'bg-cyan-600' : 'bg-slate-700 dark:bg-slate-600'
                      }`}
                    >
                      {isUser ? <User size={14} /> : <Bot size={14} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] uppercase tracking-wider font-mono opacity-80">
                          {isUser ? 'You' : 'AI Screen Assistant'}
                        </span>
                        {!isUser && (
                          <button
                            onClick={() => playAssistantSpeech(msg.content)}
                            className="text-slate-400 hover:text-cyan-500 p-0.5 cursor-pointer"
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

              {streamingText && (
                <div className="p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed flex items-start gap-3 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 mr-6 animate-pulse">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-slate-700 text-white">
                    <Bot size={14} />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-[11px] uppercase tracking-wider font-mono opacity-80 mb-1 block">
                      AI Screen Assistant
                    </span>
                    <p className="whitespace-pre-wrap">{streamingText}</p>
                  </div>
                </div>
              )}
              <div ref={transcriptBottomRef} />
            </div>
          )}
        </div>

        {/* SECTION 5: FALLBACK TEXT INPUT */}
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
            placeholder="Ask a question about the active screen (e.g. 'Where do I enter my IFSC code?')..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-xs md:text-sm bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={isLoading || !typedInput.trim()}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Send inquiry"
          >
            <Send size={14} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default ScreenAssistantSession;

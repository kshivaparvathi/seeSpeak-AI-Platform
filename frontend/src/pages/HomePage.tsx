import React, { useState, useEffect, useCallback } from 'react';
import { FEATURES, MAIN_FEATURE } from '../config/features';
import { SupportedLanguage, Conversation, Message, ConversationFile } from '../types';
import { getLanguageInfo } from '../config/languages';
import { MultimodalChat } from '../components/MultimodalChat';
import { VoiceModal } from '../components/VoiceModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  Headphones, 
  Video, 
  BarChart3, 
  Sparkles, 
  Compass,
  ArrowRight,
  PlusCircle,
  Zap,
  Award,
  Monitor
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (route: string) => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onSelectPrompt?: (prompt: string, featureId: string) => void;
  onShowIntro?: () => void;
  conversationId?: string;
  onConversationCreated?: (conv: Conversation) => void;
  initialPrompt?: string;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  selectedLanguage,
  onSelectLanguage,
  onShowIntro,
  conversationId,
  onConversationCreated,
  initialPrompt,
}) => {
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ConversationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Load existing main conversation
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data: Conversation = await res.json();
        const norm = (data.feature || '').toLowerCase().replace('feature/', '');
        if (norm && norm !== 'main' && norm !== 'general' && norm !== 'home' && norm !== 'chat') {
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
      console.error('Failed to load home conversation:', err);
    }
  }, []);

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

  // Handle File Upload on Home Chatbot
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (activeConvId) {
        formData.append('conversation_id', activeConvId);
      }
      formData.append('feature', 'main');
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

  // Handle Send Message on Home Chatbot
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
            feature: 'main',
            language: selectedLanguage,
            title: text.slice(0, 40),
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
          feature: 'main',
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
      setError(err.message || 'Error processing request');
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

  const getFeatureIcon = (id: string) => {
    switch (id) {
      case 'document-analysis':
        return <FileText size={18} className="text-blue-400" />;
      case 'visual-intelligence':
        return <ImageIcon size={18} className="text-purple-400" />;
      case 'ai-interview':
        return <Mic size={18} className="text-rose-400" />;
      case 'customer-support':
        return <Headphones size={18} className="text-emerald-400" />;
      case 'video-audio-review':
        return <Video size={18} className="text-amber-400" />;
      case 'data-study':
        return <BarChart3 size={18} className="text-indigo-400" />;
      case 'ai-resume-builder':
        return <Award size={18} className="text-emerald-400" />;
      case 'ai-screen-assistant':
        return <Monitor size={18} className="text-cyan-400" />;
      default:
        return <Sparkles size={18} className="text-indigo-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Top Header Bar */}
      <header className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">seeSpeak AI</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono">
                Multimodal Assistant
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Intelligent conversational workspace with 8 specialized AI modules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Sun / Moon */}
          <ThemeToggle />

          {messages.length > 0 && (
            <button
              onClick={() => {
                setActiveConvId(undefined);
                setConversation(null);
                setMessages([]);
                setAttachedFiles([]);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Start a new clean chat"
            >
              <PlusCircle size={13} className="text-indigo-500 dark:text-indigo-400" />
              <span className="hidden md:inline">New Chat</span>
            </button>
          )}

          {onShowIntro && (
            <button
              onClick={onShowIntro}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Compass size={13} />
              <span className="hidden sm:inline">Intro</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Six Specialized Workspace Cards Grid — Always Prominently Displayed on Empty State */}
        {messages.length === 0 && !streamingText && (
          <div className="max-w-5xl mx-auto w-full px-4 pt-6 pb-2 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-indigo-400" />
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Specialized Workspaces
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Isolated context, files & models
              </span>
            </div>

            {/* Responsive 6-Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-2">
              {FEATURES.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => onNavigate(feature.route)}
                  className={`p-4 rounded-2xl bg-gradient-to-br ${feature.colorScheme.bg} bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:${feature.colorScheme.border} hover:border-indigo-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group flex flex-col justify-between text-left cursor-pointer shadow-sm dark:shadow-md`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2.5 w-full">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-inner group-hover:scale-105 transition-transform">
                        {getFeatureIcon(feature.id)}
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-white transition-all">
                        <ArrowRight size={12} />
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {feature.title}
                    </h3>
                    <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400/80 mb-1">
                      {feature.tagline}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      <span className="text-slate-600 dark:text-slate-400">Isolated Mode</span>
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform font-mono text-xs font-semibold">
                      Launch →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Ribbon if messages are active */}
        {messages.length > 0 && (
          <div className="px-4 py-2 bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/50 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 shrink-0">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono shrink-0 mr-1 hidden sm:inline">
              Jump To Workspace:
            </span>
            {FEATURES.map((feat) => (
              <button
                key={feat.id}
                onClick={() => onNavigate(feat.route)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-sm group"
              >
                {getFeatureIcon(feat.id)}
                <span className="font-medium">{feat.title}</span>
                <ArrowRight size={11} className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}

        {/* Main Chatbot Stage */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
          <MultimodalChat
            conversation={conversation}
            messages={messages}
            attachedFiles={attachedFiles}
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={onSelectLanguage}
            isLoading={isLoading}
            streamingText={streamingText}
            error={error}
            featureId={MAIN_FEATURE.id}
            featureTitle="General AI Chatbot"
            featureDescription="Type a question directly, speak via microphone, or upload documents to get grounded multimodal answers in any language."
            samplePrompts={MAIN_FEATURE.samplePrompts}
            onOpenVoice={() => setIsVoiceOpen(true)}
          />
        </div>
      </div>

      {/* Voice Modal */}
      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => {
          setIsVoiceOpen(false);
          if (activeConvId) {
            loadConversation(activeConvId);
          }
        }}
        featureId="main"
        featureTitle="seeSpeak AI Assistant"
        conversationId={activeConvId}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
};

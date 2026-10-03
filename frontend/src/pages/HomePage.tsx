import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FEATURES, MAIN_FEATURE } from '../config/features';
import { SupportedLanguage, Conversation, Message, ConversationFile } from '../types';
import { MultimodalChat } from '../components/MultimodalChat';
import { VoiceModal } from '../components/VoiceModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { ProfileSettingsModal } from '../components/ProfileSettingsModal';
import { useAuth } from '../context/AuthContext';
import { FeatureVisual } from '../components/FeatureVisual';
import { 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  Headphones, 
  Video, 
  BarChart3, 
  Sparkles, 
  ArrowRight,
  PlusCircle,
  Award,
  Monitor,
  Presentation,
  Search,
  Paperclip,
  CheckCircle2,
  Clock,
  Lightbulb,
  Bell,
  MoreVertical,
  Layers,
  ChevronDown
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
  conversations?: Conversation[];
  onSelectConversation?: (conv: Conversation) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  selectedLanguage,
  onSelectLanguage,
  conversationId,
  onConversationCreated,
  initialPrompt,
  conversations = [],
  onSelectConversation,
}) => {
  const { user } = useAuth();
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ConversationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Search in dashboard
  const [dashboardSearch, setDashboardSearch] = useState('');
  // Universal prompt input text
  const [promptText, setPromptText] = useState('');
  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  // View mode: 'overview' | 'chat'
  const [viewMode, setViewMode] = useState<'overview' | 'chat'>('overview');
  // Profile settings modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  // Notification popover
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  // Quick tips modal
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);

  // Dynamic time-aware greeting based on actual local time
  const greetingTime = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  })();

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
        if (data.messages && data.messages.length > 0) {
          setViewMode('chat');
        }
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
      setViewMode('overview');
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
      setViewMode('chat');
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Send Message on Home Chatbot
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);
    setStreamingText('');
    setViewMode('chat');
    setPromptText('');

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

  // Relative time helper for activity items
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMin = Math.floor((now - then) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Tailored, visually rich feature representations matching each feature's purpose
  const getFeatureIcon = (id: string, size: number = 38) => {
    return <FeatureVisual featureId={id} size={size} />;
  };

  // Group existing 9 tools into the 3 sections matching Reference Image 2
  const understandTools = FEATURES.filter((f) => 
    ['document-analysis', 'visual-intelligence', 'video-audio-review', 'data-study'].includes(f.id)
  );

  const createTools = FEATURES.filter((f) => 
    ['customer-support', 'ai-resume-builder', 'ai-presentation-maker'].includes(f.id)
  );

  const practiceTools = FEATURES.filter((f) => 
    ['ai-interview', 'ai-screen-assistant'].includes(f.id)
  );

  // Filter tools if dashboard search has query
  const matchesSearch = (title: string, desc: string) => {
    if (!dashboardSearch.trim()) return true;
    const q = dashboardSearch.toLowerCase();
    return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  };

  // Dynamic user name formatter (Title Case, fallback to 'K. Shivaparvathi')
  const displayName = useMemo(() => {
    const raw = user?.full_name?.trim() || user?.username?.trim();
    if (!raw) return 'K. Shivaparvathi';
    return raw
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }, [user]);

  // Dynamic user initial from real authenticated profile
  const userInitial = useMemo(() => {
    return displayName.charAt(0).toUpperCase() || 'K';
  }, [displayName]);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-gradient-to-br from-[#ebf2fc] via-[#f4f7fe] to-[#e8eefa] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* Hidden File Input for universal input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />

      {/* ========================================================
          CENTER / MAIN COLUMN: Dashboard Workspace
         ======================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* ========================================================
            TOP HEADER BAR (Exact Reference Image 2)
           ======================================================== */}
        <header className="px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shrink-0 z-10">
          {/* Universal Search Bar */}
          <div className="flex-1 max-w-lg relative">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search anything..."
              value={dashboardSearch}
              onChange={(e) => setDashboardSearch(e.target.value)}
              className="w-full h-9.5 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-full pl-9 pr-4 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Right Action Controls for smaller screens (xl:hidden) and active chat toggle */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => setViewMode(viewMode === 'chat' ? 'overview' : 'chat')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 text-xs font-semibold shadow-sm hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Layers size={13} />
                <span>{viewMode === 'chat' ? 'Dashboard Overview' : 'Active Conversation'}</span>
              </button>
            )}

            {/* Mobile / Laptop fallback controls when right panel is hidden */}
            <div className="flex items-center gap-2 xl:hidden">
              <ThemeToggle className="rounded-full shadow-sm" />
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm"
              >
                {userInitial}
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================
            CONTENT AREA: Switch between Overview & Active Chat
           ======================================================== */}
        {viewMode === 'chat' && messages.length > 0 ? (
          /* Active Chat View */
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="px-5 py-2 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => setViewMode('overview')}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                ← Back to Dashboard Overview
              </button>
              <button
                onClick={() => {
                  setActiveConvId(undefined);
                  setConversation(null);
                  setMessages([]);
                  setAttachedFiles([]);
                  setViewMode('overview');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <PlusCircle size={13} className="text-blue-600" />
                <span>New Chat</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
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
                featureTitle="seeSpeak AI Assistant"
                featureDescription="Type a question directly, speak via microphone, or upload documents to get grounded multimodal answers in any language."
                samplePrompts={MAIN_FEATURE.samplePrompts}
                onOpenVoice={() => setIsVoiceOpen(true)}
              />
            </div>
          </div>
        ) : (
          /* ========================================================
              DASHBOARD OVERVIEW (EXACT VISUAL RECREATION FROM REFERENCE IMAGE 2)
             ======================================================== */
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 flex flex-col space-y-7 scrollbar-thin">
            
            {/* ========================================================
                HERO SECTION: Greeting + 3D Mascot + Universal Input + Quick Actions
                Spacious, airy composition matching Reference Image 2
               ======================================================== */}
            <div className="w-full pt-1 pb-2 relative">
              
              {/* Soft ambient aura background */}
              <div className="absolute top-0 right-16 w-80 h-48 bg-blue-300/15 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Greeting Row + 3D Robot Mascot */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-3 relative z-10">
                {/* Left Side: Real Personalized Greeting */}
                <div className="max-w-lg pb-1">
                  <span className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                    {greetingTime}
                  </span>
                  <h1 className="text-[28px] sm:text-[34px] font-extrabold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <span>{displayName}</span>
                    <span className="text-2xl sm:text-3xl select-none">👋</span>
                  </h1>
                  <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Your AI companion for learning, creating and achieving more.
                  </p>
                </div>

                {/* Right Side: Seamless Floating 3D Mascot with Speech Bubble */}
                <div className="relative shrink-0 flex items-end justify-end select-none pr-1">
                  <img 
                    src="/hero_companion_retina.png" 
                    alt="seeSpeak AI 3D Companion" 
                    className="w-56 sm:w-64 md:w-72 h-auto object-contain select-none pointer-events-none hover:scale-102 transition-transform duration-300" 
                  />
                </div>
              </div>

              {/* ========================================================
                  UNIVERSAL AI INPUT BAR (Exact Reference Image 2)
                 ======================================================== */}
              <div className="w-full bg-white dark:bg-slate-800 rounded-[22px] border border-slate-200/90 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] p-2 sm:p-2.5 flex items-center gap-2.5 relative z-10">
                {/* AI Sparkle Icon in soft circle */}
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 ml-1">
                  <Sparkles size={18} />
                </div>

                {/* Main Text Input */}
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage(promptText);
                    }
                  }}
                  placeholder="Ask anything, upload a file, or start a task..."
                  className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none"
                />

                {/* Attachment Paperclip Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  title="Upload a file or document"
                >
                  <Paperclip size={18} />
                </button>

                {/* Microphone Voice Button */}
                <button
                  type="button"
                  onClick={() => setIsVoiceOpen(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                  title="Speak with Voice AI"
                >
                  <Mic size={18} />
                </button>

                {/* Solid Blue Circular Arrow Button */}
                <button
                  type="button"
                  onClick={() => handleSendMessage(promptText)}
                  disabled={!promptText.trim() && isLoading}
                  className="w-10 h-10 rounded-full bg-[#2563eb] hover:bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 mr-0.5"
                  title="Send prompt"
                >
                  <ArrowRight size={17} />
                </button>
              </div>

              {/* ========================================================
                  QUICK ACTION PILLS (Below Universal Input)
                 ======================================================== */}
              <div className="flex flex-wrap items-center gap-2 pt-3.5 relative z-10">
                <button
                  onClick={() => onNavigate('/document-analysis')}
                  className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <FileText size={13} className="text-blue-500" />
                  <span>Analyze a document</span>
                </button>

                <button
                  onClick={() => onNavigate('/visual-intelligence')}
                  className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <ImageIcon size={13} className="text-emerald-500" />
                  <span>Create an image</span>
                </button>

                <button
                  onClick={() => onNavigate('/ai-resume-builder')}
                  className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <Award size={13} className="text-teal-500" />
                  <span>Build a resume</span>
                </button>

                <button
                  onClick={() => onNavigate('/ai-interview')}
                  className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <Mic size={13} className="text-rose-500" />
                  <span>Practice an interview</span>
                </button>
              </div>
            </div>

            {/* ========================================================
                SECTION: EXPLORE YOUR AI TOOLS (Exact Reference Image 2)
               ======================================================== */}
            <div className="space-y-6 pt-1">
              
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Explore Your AI Tools
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-400">
                    Everything you need, in one place.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('/document-analysis')}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* ----------------------------------------------------
                  1. UNDERSTAND SECTION (Soft Blue Box + 3D Brain Icon)
                 ---------------------------------------------------- */}
              <div className="rounded-[24px] bg-[#f0f4fe] dark:bg-slate-900/90 border border-[#e1e9fb] dark:border-slate-800/90 p-5 sm:p-6 relative shadow-sm">
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Understand
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Make sense of your information.
                    </p>
                  </div>
                  {/* 3D Brain Icon in Top Right */}
                  <img 
                    src="/icon_3d_brain_clean.png" 
                    alt="Understand 3D" 
                    className="w-12 h-10 object-contain drop-shadow select-none pointer-events-none" 
                  />
                </div>

                {/* 4 Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {understandTools
                    .filter((f) => matchesSearch(f.title, f.description))
                    .map((feature) => (
                      <button
                        key={feature.id}
                        onClick={() => onNavigate(feature.route)}
                        className="bg-white dark:bg-slate-800 rounded-[20px] p-4 shadow-[0_4px_15px_-2px_rgba(0,0,0,0.04)] border border-slate-100/90 dark:border-slate-700/60 hover:shadow-lg dark:hover:shadow-slate-900/50 hover:border-blue-400/50 transition-all duration-200 hover:-translate-y-1 text-left flex flex-col justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="mb-3">
                            {getFeatureIcon(feature.id)}
                          </div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {feature.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {feature.id === 'document-analysis' && 'Analyze and understand your documents, PDFs and files.'}
                            {feature.id === 'visual-intelligence' && 'Understand and analyze images with AI.'}
                            {feature.id === 'video-audio-review' && 'Analyze and get insights from videos and audio files.'}
                            {feature.id === 'data-study' && 'Learn, analyze and get help with your data and study material.'}
                            {!['document-analysis', 'visual-intelligence', 'video-audio-review', 'data-study'].includes(feature.id) && feature.description}
                          </p>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-700/70 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* ----------------------------------------------------
                  2. CREATE SECTION (Soft Peach/Pink Box + 3D Palette Icon)
                 ---------------------------------------------------- */}
              <div className="rounded-[24px] bg-[#fef2f4] dark:bg-slate-900/90 border border-[#fce3e7] dark:border-slate-800/90 p-5 sm:p-6 relative shadow-sm">
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Create
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Turn your ideas into something useful.
                    </p>
                  </div>
                  {/* 3D Palette Icon in Top Right */}
                  <img 
                    src="/icon_3d_palette_clean.png" 
                    alt="Create 3D" 
                    className="w-12 h-10 object-contain drop-shadow select-none pointer-events-none" 
                  />
                </div>

                {/* 3 Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {createTools
                    .filter((f) => matchesSearch(f.title, f.description))
                    .map((feature) => (
                      <button
                        key={feature.id}
                        onClick={() => onNavigate(feature.route)}
                        className="bg-white dark:bg-slate-800 rounded-[20px] p-4 shadow-[0_4px_15px_-2px_rgba(0,0,0,0.04)] border border-slate-100/90 dark:border-slate-700/60 hover:shadow-lg dark:hover:shadow-slate-900/50 hover:border-rose-400/50 transition-all duration-200 hover:-translate-y-1 text-left flex flex-col justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="mb-3">
                            {getFeatureIcon(feature.id)}
                          </div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {feature.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {feature.id === 'customer-support' && 'Solve technical, billing, and product issues with AI.'}
                            {feature.id === 'ai-resume-builder' && 'Create professional resumes in minutes.'}
                            {feature.id === 'ai-presentation-maker' && 'Create stunning presentations with AI.'}
                            {!['customer-support', 'ai-resume-builder', 'ai-presentation-maker'].includes(feature.id) && feature.description}
                          </p>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-700/70 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* ----------------------------------------------------
                  3. PRACTICE & ASSIST SECTION (Soft Mint Box + 3D Target)
                 ---------------------------------------------------- */}
              <div className="rounded-[24px] bg-[#edfbf7] dark:bg-slate-900/90 border border-[#daf5ee] dark:border-slate-800/90 p-5 sm:p-6 relative shadow-sm">
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Practice & Assist
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Practice, prepare and get help.
                    </p>
                  </div>
                  {/* 3D Target Icon in Top Right */}
                  <img 
                    src="/icon_3d_target_clean.png" 
                    alt="Practice 3D" 
                    className="w-12 h-10 object-contain drop-shadow select-none pointer-events-none" 
                  />
                </div>

                {/* 2 Wide Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {practiceTools
                    .filter((f) => matchesSearch(f.title, f.description))
                    .map((feature) => (
                      <button
                        key={feature.id}
                        onClick={() => onNavigate(feature.route)}
                        className="bg-white dark:bg-slate-800 rounded-[20px] p-4 shadow-[0_4px_15px_-2px_rgba(0,0,0,0.04)] border border-slate-100/90 dark:border-slate-700/60 hover:shadow-lg dark:hover:shadow-slate-900/50 hover:border-emerald-400/50 transition-all duration-200 hover:-translate-y-1 text-left flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-3">
                          <div className="shrink-0">
                            {getFeatureIcon(feature.id)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {feature.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
                              {feature.id === 'ai-interview' && 'Practice interviews with personalized feedback.'}
                              {feature.id === 'ai-screen-assistant' && 'Understand and get help with your screen content.'}
                              {!['ai-interview', 'ai-screen-assistant'].includes(feature.id) && feature.description}
                            </p>
                          </div>
                        </div>

                        <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-700/70 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm shrink-0">
                          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          RIGHT SIDE AREA: Quick Tips + Recent Activity + Inspiration
          (Exact Reference Image 2 composition)
         ======================================================== */}
      {/* ========================================================
          RIGHT SIDE AREA: Top Controls + Quick Tips + Recent Activity + Inspiration
          (Exact Reference Image 2 composition)
         ======================================================== */}
      <aside className="w-76 xl:w-80 shrink-0 hidden xl:flex flex-col space-y-3.5 py-3.5 pr-6 pl-1 h-full overflow-y-auto pb-12 scrollbar-thin select-none">
        
        {/* Top Controls: Sun/Moon, Bell, User Pill matching Reference Image 2 */}
        <div className="flex items-center justify-between pb-1 px-0.5 shrink-0">
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <ThemeToggle className="rounded-full shadow-sm bg-white dark:bg-slate-800" />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer relative"
                title="Notifications"
              >
                <Bell size={15} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800" />
              </button>

              {isNotificationOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-50 animate-fadeIn text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-white">Notifications</span>
                      <span className="text-[10px] text-blue-600 font-medium">Mark all read</span>
                    </div>
                    <div className="py-2.5 space-y-2">
                      <div className="p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Welcome to seeSpeak AI</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Explore 9 specialized AI workspaces with multimodal understanding.</p>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Voice Assistant Ready</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Real-time voice input is enabled in 12 Indian & global languages.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Pill Button (Avatar Initial + Name + Chevron) */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer group"
            title="Profile & Settings"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {userInitial}
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors max-w-[110px] truncate">
              {displayName}
            </span>
            <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* ----------------------------------------------------
            CARD 1: QUICK TIPS (Exact from Image 2)
           ---------------------------------------------------- */}
        <div className="rounded-[22px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-4 shrink-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Lightbulb size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Quick Tips
              </h3>
              <p className="text-[11px] text-slate-400">
                Get the most out of seeSpeak AI
              </p>
            </div>
          </div>

          <div className="space-y-2 py-0.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
              <span>Use voice input for faster results</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
              <span>Upload files for better analysis</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
              <span>Explore all 9 AI tools</span>
            </div>
          </div>

          <button
            onClick={() => setIsTipsModalOpen(true)}
            className="mt-3 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View all tips</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* ----------------------------------------------------
            CARD 2: RECENT ACTIVITY (Real user history from Image 2)
           ---------------------------------------------------- */}
        <div className="rounded-[22px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-4 flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Activity
              </h3>
            </div>
            <button
              onClick={() => {
                if (conversations.length > 0 && onSelectConversation) {
                  onSelectConversation(conversations[0]);
                }
              }}
              className="text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer"
            >
              View all →
            </button>
          </div>

          {/* Activity items list */}
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-5 text-slate-400 text-xs">
                No recent activity yet. Start a session!
              </div>
            ) : (
              conversations.slice(0, 4).map((conv) => {
                const featConfig = FEATURES.find((f) => f.id === conv.feature || f.aliases.includes(conv.feature));
                return (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation?.(conv)}
                    className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 group-hover:text-blue-600 transition-colors">
                        {getFeatureIcon(conv.feature, 24)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          <span>{featConfig?.title || 'Assistant'}</span>
                          <span className="mx-1">•</span>
                          <span>{formatTimeAgo(conv.updated_at || conv.created_at)}</span>
                        </p>
                      </div>
                    </div>
                    <MoreVertical size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ----------------------------------------------------
            CARD 3: INSPIRATIONAL MOUNTAIN CARD (Exact Image 2)
           ---------------------------------------------------- */}
        <div className="rounded-[22px] overflow-hidden border border-[#1b274c] shadow-lg relative bg-gradient-to-r from-[#172244] via-[#1a264a] to-[#20315c] p-4.5 text-white shrink-0 min-h-[145px] flex items-center justify-between">
          {/* Left Side: Real Dynamic React Text */}
          <div className="relative z-10 max-w-[170px] space-y-1.5">
            <p className="text-xs sm:text-[13px] font-bold leading-snug tracking-tight text-white drop-shadow-sm">
              Small steps every day lead to big results.
            </p>
            <p className="text-[11px] text-slate-300/90 font-medium">
              Keep going, {displayName}!
            </p>
            <div className="text-xs pt-0.5 select-none">
              🤍
            </div>
          </div>

          {/* Right Side: Seamless Clean Mountain Peak Graphic */}
          <div className="absolute right-0 top-0 bottom-0 w-36 sm:w-40 flex items-center justify-end select-none pointer-events-none">
            <img 
              src="/mountain_clean_peak.png" 
              alt="Mountain peak inspiration" 
              className="h-full w-auto object-cover object-left rounded-r-[22px]" 
            />
          </div>
        </div>

      </aside>

      {/* Voice Assistant Modal */}
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

      {/* Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Quick Tips Modal */}
      {isTipsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-500" />
                <h3 className="font-bold text-sm">seeSpeak AI Pro Tips</h3>
              </div>
              <button
                onClick={() => setIsTipsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white block">1. Multimodal Grounding</span>
                Upload PDFs, diagrams, or spreadsheets to ask questions grounded directly in your uploaded material.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white block">2. Multilingual Fluency</span>
                Toggle seamlessly between English, Telugu, Hindi, Tamil, Kannada, Marathi, Bengali, and more.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white block">3. Isolated Workspaces</span>
                Each workspace maintains strict isolated context, prompt engineering, and session memory.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;

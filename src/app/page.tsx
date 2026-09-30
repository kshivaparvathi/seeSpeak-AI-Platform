'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { MessageCard } from '@/components/MessageCard';
import { InputComposer } from '@/components/InputComposer';
import { VoiceOverlay } from '@/components/VoiceOverlay';
import { CameraModal } from '@/components/CameraModal';
import { SettingsModal } from '@/components/SettingsModal';
import { DebugPanel } from '@/components/DebugPanel';
import { 
  AppSettings, 
  Conversation, 
  ExplanationStyle, 
  Message, 
  SupportedLanguage, 
  UploadedFile,
  AgentMode 
} from '@/lib/types';
import { 
  createNewConversation, 
  DEFAULT_SETTINGS, 
  loadConversations, 
  loadSettings, 
  saveConversations, 
  saveSettings 
} from '@/lib/storage';
import { globalSpeech } from '@/lib/providers/speechProvider';

const initialFallbackConv = createNewConversation('auto');

export default function Home() {
  // App state
  const [conversations, setConversations] = useState<Conversation[]>([initialFallbackConv]);
  const [activeId, setActiveId] = useState<string>(initialFallbackConv.id);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Input & staging state
  const [inputPrompt, setInputPrompt] = useState('');
  const [stagedFiles, setStagedFiles] = useState<UploadedFile[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStatusMessage, setCurrentStatusMessage] = useState<string>('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    inputType: string;
    modelUsed: string;
    detectedLanguage: SupportedLanguage;
  }>({
    inputType: 'text',
    modelUsed: 'gemini-flash-latest',
    detectedLanguage: 'en',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load persisted state on mount
  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    setTheme(loadedSettings.theme === 'light' ? 'light' : 'dark');

    const loadedConvs = loadConversations();
    if (loadedConvs && loadedConvs.length > 0) {
      setConversations(loadedConvs);
      setActiveId(loadedConvs[0].id);
    } else {
      const initial = createNewConversation(loadedSettings.selectedLanguage);
      setConversations([initial]);
      setActiveId(initial.id);
      saveConversations([initial]);
    }
  }, []);

  // Save conversations on change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  const activeConversation =
    conversations.find((c) => c.id === activeId) || conversations[0] || initialFallbackConv;

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isStreaming, currentStatusMessage]);

  // Handle new chat
  const handleNewChat = () => {
    globalSpeech.stopSpeech();
    const newConv = createNewConversation(settings.selectedLanguage);
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    setStagedFiles([]);
    setInputPrompt('');
  };

  // Handle rename chat
  const handleRenameChat = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Handle delete chat
  const handleDeleteChat = (id: string) => {
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewConversation(settings.selectedLanguage);
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(remaining);
      if (activeId === id) {
        setActiveId(remaining[0].id);
      }
    }
  };

  // Clear all chats
  const handleClearHistory = () => {
    const fresh = createNewConversation(settings.selectedLanguage);
    setConversations([fresh]);
    setActiveId(fresh.id);
    saveConversations([fresh]);
  };

  // File Upload Handler
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    // Create temporary optimistic items
    const tempFiles: UploadedFile[] = filesArray.map((f) => ({
      id: 'temp_' + Math.random().toString(36).substring(2, 9),
      name: f.name,
      size: f.size,
      type: f.name.endsWith('.pdf') ? 'pdf' : f.type.startsWith('image/') ? 'image' : 'document',
      mimeType: f.type,
      status: 'uploading',
      uploadProgress: 25,
    }));

    setStagedFiles((prev) => [...prev, ...tempFiles]);

    try {
      const formData = new FormData();
      for (const f of filesArray) {
        formData.append('files', f);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      const uploaded: UploadedFile[] = data.files || [];

      // Replace temp files with actual parsed files
      setStagedFiles((prev) => {
        const kept = prev.filter((p) => !tempFiles.some((t) => t.id === p.id));
        return [...kept, ...uploaded];
      });
    } catch (err) {
      console.error('File upload error:', err);
      setStagedFiles((prev) =>
        prev.map((f) =>
          tempFiles.some((t) => t.id === f.id)
            ? { ...f, status: 'error', errorMessage: 'Upload failed' }
            : f
        )
      );
    }
  };

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Send message flow
  const handleSendMessage = async (
    customPrompt?: string,
    overrideFiles?: UploadedFile[],
    explanationStyle?: ExplanationStyle
  ) => {
    const promptToSend = (customPrompt !== undefined ? customPrompt : inputPrompt).trim();
    const filesToSend = overrideFiles || stagedFiles;

    if (!promptToSend && filesToSend.length === 0) return;

    // Stop existing speech if any
    globalSpeech.stopSpeech();
    setSpeakingMessageId(null);

    // Create user message
    const userMessage: Message = {
      id: 'msg_user_' + Date.now().toString(36),
      role: 'user',
      content: promptToSend || (filesToSend.length > 0 ? `Analyze attached ${filesToSend.map((f) => f.name).join(', ')}` : ''),
      timestamp: Date.now(),
      files: [...filesToSend],
      explanationStyle,
    };

    // Assistant placeholder message
    const assistantMessageId = 'msg_ai_' + Date.now().toString(36);
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      responseLanguage: activeConversation.language,
      detectedMode: activeConversation.mode,
    };

    // Update conversation state with both messages & pin files into conversation memory
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversation.id) {
          const isFirstMessage = c.messages.length === 0;
          let newTitle = c.title;
          if (isFirstMessage) {
            newTitle = promptToSend.slice(0, 32) || (filesToSend[0] ? filesToSend[0].name.slice(0, 32) : 'Conversation');
          }

          // Combine pinned files for conversation memory
          const existingPinnedIds = new Set(c.pinnedFiles.map((pf) => pf.id));
          const newlyPinned = filesToSend.filter((f) => !existingPinnedIds.has(f.id));

          return {
            ...c,
            title: newTitle,
            updatedAt: Date.now(),
            pinnedFiles: [...c.pinnedFiles, ...newlyPinned],
            messages: [...c.messages, userMessage, assistantMessage],
          };
        }
        return c;
      })
    );

    // Reset input fields
    setInputPrompt('');
    setStagedFiles([]);
    setIsStreaming(true);
    setCurrentStatusMessage('Connecting to multimodal engine...');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Gather conversation history & all pinned files for memory context
      const currentConv = conversations.find((c) => c.id === activeConversation.id);
      const allContextFiles = [
        ...(currentConv?.pinnedFiles || []),
        ...filesToSend,
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { 'x-api-key': settings.apiKey } : {}),
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          files: allContextFiles,
          history: currentConv?.messages || [],
          selectedLanguage: activeConversation.language,
          currentMode: activeConversation.mode,
          learningMode: activeConversation.learningMode,
          explanationStyle,
          personality: settings.personality,
          provider: settings.provider,
          modelName: settings.modelName,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error('Agent service responded with an error');
      }

      if (!res.body) {
        throw new Error('No stream body returned');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let detectedMode: AgentMode = activeConversation.mode;
      let detectedLanguage: SupportedLanguage = activeConversation.language;
      let followUpSuggestions: string[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'status') {
                setCurrentStatusMessage(event.statusMessage || '');
              } else if (event.type === 'delta') {
                accumulatedText += event.content || '';
                // Update assistant message content in state
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id === activeConversation.id) {
                      return {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantMessageId ? { ...m, content: accumulatedText } : m
                        ),
                      };
                    }
                    return c;
                  })
                );
              } else if (event.type === 'complete') {
                accumulatedText = event.text || accumulatedText;
                detectedMode = event.detectedMode || detectedMode;
                detectedLanguage = event.effectiveLanguage || detectedLanguage;
                followUpSuggestions = event.followUpSuggestions || [];
                setDebugInfo({
                  inputType: event.inputType || 'text',
                  modelUsed: event.modelUsed || settings.modelName,
                  detectedLanguage: (event.effectiveLanguage as SupportedLanguage) || detectedLanguage,
                });
              } else if (event.type === 'error') {
                accumulatedText += `\n\n*Error: ${event.error}*`;
              }
            } catch (parseErr) {
              console.warn('Failed to parse SSE event:', parseErr);
            }
          }
        }
      }

      // Finalize message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            return {
              ...c,
              mode: detectedMode,
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: accumulatedText,
                      detectedMode,
                      responseLanguage: detectedLanguage,
                      followUpSuggestions,
                    }
                  : m
              ),
            };
          }
          return c;
        })
      );

      // Auto-play speech if enabled in settings
      if (settings.autoPlayVoice && accumulatedText) {
        handlePlaySpeech(accumulatedText, detectedLanguage, assistantMessageId);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Chat error:', err);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConversation.id) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content:
                          'Something went wrong while connecting to the AI service. Please verify your connection or try again.',
                      }
                    : m
                ),
              };
            }
            return c;
          })
        );
      }
    } finally {
      setIsStreaming(false);
      setCurrentStatusMessage('');
      abortControllerRef.current = null;
    }
  };

  // Stop current streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setCurrentStatusMessage('');
  };

  // Speech playback
  const handlePlaySpeech = (text: string, lang: SupportedLanguage, msgId: string) => {
    if (speakingMessageId === msgId) {
      globalSpeech.stopSpeech();
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId);
    globalSpeech.speak(text, lang, {
      rate: settings.voiceSpeed,
      pitch: settings.voicePitch,
      onStart: () => setSpeakingMessageId(msgId),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
    });
  };

  const handleStopSpeech = () => {
    globalSpeech.stopSpeech();
    setSpeakingMessageId(null);
  };

  // Voice Overlay utterance callback
  const handleVoiceUtterance = async (transcript: string): Promise<string | void> => {
    if (!transcript.trim()) return;

    // Send transcript directly to chat flow
    const userMessage: Message = {
      id: 'msg_user_' + Date.now().toString(36),
      role: 'user',
      content: transcript,
      timestamp: Date.now(),
      isVoiceInput: true,
      files: [...(activeConversation.pinnedFiles || [])],
    };

    const assistantMessageId = 'msg_ai_' + Date.now().toString(36);
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      responseLanguage: activeConversation.language,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, messages: [...c.messages, userMessage, assistantMessage] }
          : c
      )
    );

    // Call API and get full text
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { 'x-api-key': settings.apiKey } : {}),
        },
        body: JSON.stringify({
          prompt: transcript,
          files: activeConversation.pinnedFiles || [],
          history: activeConversation.messages || [],
          selectedLanguage: activeConversation.language,
          currentMode: activeConversation.mode,
          learningMode: activeConversation.learningMode,
          personality: settings.personality,
        }),
      });

      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let detectedLang = activeConversation.language;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'delta') {
                fullText += event.content || '';
              } else if (event.type === 'complete') {
                fullText = event.text || fullText;
                detectedLang = event.effectiveLanguage || detectedLang;
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

      // Update message in conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: fullText, responseLanguage: detectedLang } : m
                ),
              }
            : c
        )
      );

      return fullText;
    } catch (e) {
      console.error('Voice utterance error:', e);
    }
  };

  // Change conversation language
  const handleLanguageChange = (lang: SupportedLanguage) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, language: lang } : c))
    );
    setSettings((prev) => {
      const updated = { ...prev, selectedLanguage: lang };
      saveSettings(updated);
      return updated;
    });
  };

  // Toggle Learning Mode
  const handleToggleLearningMode = () => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id ? { ...c, learningMode: !c.learningMode } : c
      )
    );
  };

  // Explain Differently handler
  const handleExplainDifferently = (style: ExplanationStyle) => {
    const lastUserMsg = [...activeConversation.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, lastUserMsg.files, style);
    }
  };

  // Regenerate response
  const handleRegenerate = () => {
    const lastUserMsg = [...activeConversation.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, lastUserMsg.files);
    }
  };

  // Translate response
  const handleTranslateTo = (targetLang: SupportedLanguage) => {
    handleLanguageChange(targetLang);
    const lastAiMsg = [...activeConversation.messages].reverse().find((m) => m.role === 'assistant');
    if (lastAiMsg && lastAiMsg.content) {
      handleSendMessage(`Translate this complete previous response into ${targetLang}:\n\n${lastAiMsg.content}`);
    }
  };

  const voiceStatus = globalSpeech.isSpeaking()
    ? 'speaking'
    : voiceOverlayOpen
    ? 'listening'
    : 'idle';

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'dark bg-[#090d16]' : 'bg-slate-50'}`}>
      {/* Sidebar with Chat History */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => setActiveId(id)}
        onNewConversation={handleNewChat}
        onRenameConversation={handleRenameChat}
        onDeleteConversation={handleDeleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header */}
        <Header
          currentLanguage={activeConversation.language}
          onLanguageChange={handleLanguageChange}
          detectedMode={activeConversation.mode}
          learningMode={activeConversation.learningMode}
          onToggleLearningMode={handleToggleLearningMode}
          voiceStatus={voiceStatus}
          onNewChat={handleNewChat}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />

        {/* Chat / Welcome Area */}
        <main className="flex-1 overflow-y-auto px-3 md:px-6 py-4">
          {activeConversation.messages.length === 0 ? (
            <WelcomeScreen
              currentLanguage={activeConversation.language}
              onSelectPrompt={(p) => handleSendMessage(p)}
              onOpenVoice={() => setVoiceOverlayOpen(true)}
              onTriggerFileUpload={(type) => {
                const acceptMap: Record<string, string> = {
                  image: 'image/*',
                  pdf: 'application/pdf',
                  video: 'video/*',
                  data: '.csv,.xlsx,.xls',
                };
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = acceptMap[type] || '*/*';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files.length > 0) {
                    handleFilesSelected(files);
                  }
                };
                input.click();
              }}
            />
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {activeConversation.messages.map((msg, idx) => {
                const isLatestAi =
                  msg.role === 'assistant' && idx === activeConversation.messages.length - 1;

                return (
                  <MessageCard
                    key={msg.id}
                    message={msg}
                    isStreaming={isLatestAi && isStreaming}
                    statusMessage={currentStatusMessage}
                    onExplainDifferently={handleExplainDifferently}
                    onRegenerate={handleRegenerate}
                    onTranslateTo={handleTranslateTo}
                    onFollowUpClick={(q) => handleSendMessage(q)}
                    isSpeakingThis={speakingMessageId === msg.id}
                    onPlaySpeech={(text, lang) => handlePlaySpeech(text, lang, msg.id)}
                    onStopSpeech={handleStopSpeech}
                  />
                );
              })}
              <div ref={chatBottomRef} />
            </div>
          )}
        </main>

        {/* Input Composer */}
        <InputComposer
          inputPrompt={inputPrompt}
          setInputPrompt={setInputPrompt}
          stagedFiles={stagedFiles}
          onRemoveStagedFile={handleRemoveStagedFile}
          onFilesSelected={handleFilesSelected}
          onSendMessage={() => handleSendMessage()}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
          onOpenVoiceMode={() => setVoiceOverlayOpen(true)}
          onOpenCamera={() => setCameraModalOpen(true)}
        />
      </div>

      {/* Voice Overlay Modal */}
      <VoiceOverlay
        isOpen={voiceOverlayOpen}
        onClose={() => setVoiceOverlayOpen(false)}
        currentLanguage={activeConversation.language}
        onLanguageChange={handleLanguageChange}
        onUserSpoke={handleVoiceUtterance}
      />

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onPhotoCaptured={(file) => setStagedFiles((prev) => [...prev, file])}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
          if (newSettings.selectedLanguage !== activeConversation.language) {
            handleLanguageChange(newSettings.selectedLanguage);
          }
        }}
        onClearHistory={handleClearHistory}
        onClearCurrentFiles={() => setStagedFiles([])}
      />

      {/* Developer Debug Diagnostics Panel */}
      <DebugPanel
        inputType={debugInfo.inputType}
        selectedLanguage={activeConversation.language}
        detectedLanguage={debugInfo.detectedLanguage}
        activeModel={debugInfo.modelUsed}
        files={stagedFiles.length > 0 ? stagedFiles : activeConversation.pinnedFiles || []}
        detectedMode={activeConversation.mode}
        status={currentStatusMessage}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { MultimodalChat } from '../components/MultimodalChat';
import { VoiceModal } from '../components/VoiceModal';
import { DocumentWorkspaceView } from '../components/workspaces/DocumentWorkspaceView';
import { VisionWorkspaceView } from '../components/workspaces/VisionWorkspaceView';
import { MediaWorkspaceView } from '../components/workspaces/MediaWorkspaceView';
import { DataStudyWorkspaceView } from '../components/workspaces/DataStudyWorkspaceView';
import { getFeatureConfig } from '../config/features';
import { Conversation, Message, ConversationFile, SupportedLanguage } from '../types';

interface FeatureWorkspaceProps {
  featureId: string;
  conversationId?: string;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onBack: () => void;
  onNewConversation: () => void;
  onSelectFeature?: (route: string) => void;
  onOpenVoice?: () => void;
  onConversationCreated?: (conv: Conversation) => void;
  initialPrompt?: string;
}

export const FeatureWorkspace: React.FC<FeatureWorkspaceProps> = ({
  featureId,
  conversationId,
  selectedLanguage,
  onSelectLanguage,
  onBack,
  onNewConversation,
  onSelectFeature,
  onOpenVoice,
  onConversationCreated,
  initialPrompt,
}) => {
  const feature = getFeatureConfig(featureId);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ConversationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const prevFeatureRef = useRef<string>(featureId);

  // Load existing conversation data strictly scoped to this feature
  const loadConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conversations/${id}`);
        if (res.ok) {
          const data: Conversation = await res.json();
          // STRICT CONTEXT ISOLATION CHECK:
          // Ensure conversation belongs to this feature or alias
          const normDataFeat = data.feature.toLowerCase().replace('feature/', '');
          const normCurrentFeat = feature.id.toLowerCase().replace('feature/', '');

          if (normDataFeat !== normCurrentFeat && !feature.aliases?.includes(normDataFeat)) {
            // Context mismatch detected! Reset to clean state for this feature
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
        console.error('Failed to load conversation:', err);
      }
    },
    [feature]
  );

  // When featureId changes or conversationId changes:
  useEffect(() => {
    // If feature changed, completely clear previous messages & files
    if (prevFeatureRef.current !== featureId) {
      prevFeatureRef.current = featureId;
      setConversation(null);
      setMessages([]);
      setAttachedFiles([]);
      setStreamingText('');
      setError(null);
    }

    setActiveConvId(conversationId);
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setConversation(null);
      setMessages([]);
      setAttachedFiles([]);
    }
  }, [featureId, conversationId, loadConversation]);

  // Handle File Upload strictly attached to THIS feature & conversation
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (activeConvId) {
        formData.append('conversation_id', activeConvId);
      }
      formData.append('feature', feature.id);
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

      // Refresh files for this conversation
      if (convId) {
        await loadConversation(convId);
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Send Message with strict feature scope
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    setError(null);
    setStreamingText('');

    // Optimistically add user message
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
      // If no conversation exists yet for this feature, create one now
      if (!currentId) {
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature: feature.id,
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

      // Stream response strictly from backend with feature scope
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentId,
          message: text,
          language: selectedLanguage,
          feature: feature.id,
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

      // Reload updated messages from database
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

  // If initialPrompt provided from Quick Starters, execute once
  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isLoading) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      <ConversationHeader
        title={feature.title}
        subtitle={conversation?.title || feature.tagline}
        onBack={onBack}
        onNewConversation={onNewConversation}
        language={selectedLanguage}
        activeFeatureId={feature.id}
        onSelectFeature={onSelectFeature}
      />

      {(() => {
        const normId = feature.id.toLowerCase().replace('feature/', '');
        if (normId === 'document-analysis') {
          return (
            <DocumentWorkspaceView
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
              onOpenVoice={() => setIsVoiceOpen(true)}
            />
          );
        }

        if (normId === 'visual-intelligence') {
          return (
            <VisionWorkspaceView
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
              onOpenVoice={() => setIsVoiceOpen(true)}
            />
          );
        }

        if (normId === 'video-audio-review') {
          return (
            <MediaWorkspaceView
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
              onOpenVoice={() => setIsVoiceOpen(true)}
            />
          );
        }

        if (normId === 'data-study') {
          return (
            <DataStudyWorkspaceView
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
              onOpenVoice={() => setIsVoiceOpen(true)}
            />
          );
        }

        return (
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
            featureId={feature.id}
            featureTitle={feature.title}
            featureDescription={feature.description}
            samplePrompts={feature.samplePrompts}
            onOpenVoice={() => setIsVoiceOpen(true)}
          />
        );
      })()}

      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => {
          setIsVoiceOpen(false);
          if (activeConvId) {
            loadConversation(activeConvId);
          }
        }}
        featureId={feature.id}
        featureTitle={feature.title}
        conversationId={activeConvId}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
};

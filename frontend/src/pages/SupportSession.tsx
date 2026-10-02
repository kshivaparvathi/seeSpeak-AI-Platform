import React, { useState, useEffect, useCallback } from 'react';
import { ConversationHeader } from '../components/ConversationHeader';
import { MultimodalChat } from '../components/MultimodalChat';
import { VoiceModal } from '../components/VoiceModal';
import { getFeatureConfig } from '../config/features';
import { Conversation, Message, ConversationFile, SupportedLanguage } from '../types';
import { Headphones, ShieldCheck, LifeBuoy } from 'lucide-react';

interface SupportSessionProps {
  onBack: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage?: (lang: SupportedLanguage) => void;
  onSelectFeature?: (route: string) => void;
  onNewConversation?: () => void;
  conversationId?: string;
  onConversationCreated?: (conv: Conversation) => void;
  initialPrompt?: string;
}

export const SupportSession: React.FC<SupportSessionProps> = ({
  onBack,
  selectedLanguage,
  onSelectLanguage,
  onSelectFeature,
  onNewConversation,
  conversationId,
  onConversationCreated,
  initialPrompt,
}) => {
  const feature = getFeatureConfig('customer-support');
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ConversationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Load existing support conversation data strictly isolated
  const loadConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conversations/${id}`);
        if (res.ok) {
          const data: Conversation = await res.json();
          const norm = (data.feature || '').toLowerCase().replace('feature/', '');
          if (norm !== 'customer-support' && norm !== 'support') {
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
        console.error('Failed to load support conversation:', err);
      }
    },
    []
  );

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

  // Handle Error Screenshot / Invoice / File Upload
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (activeConvId) {
        formData.append('conversation_id', activeConvId);
      }
      formData.append('feature', 'customer-support');
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
      setError(err.message || 'Error uploading support attachment');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Send Support Inquiry
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    setError(null);
    setStreamingText('');

    // Optimistically add customer's complete question
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
            feature: 'customer-support',
            language: selectedLanguage,
            title: `Support: ${text.slice(0, 35)}`,
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
          feature: 'customer-support',
        }),
      });

      if (!res.ok) {
        throw new Error(`Support chat error: ${res.statusText}`);
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
      setError(err.message || 'Error processing support inquiry');
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      <ConversationHeader
        title="Customer Support Agent"
        subtitle={conversation?.title || "Empathetic Technical & Account Care • Step-by-Step Resolution"}
        onBack={onBack}
        onNewConversation={onNewConversation}
        language={selectedLanguage}
        activeFeatureId="customer-support"
        onSelectFeature={onSelectFeature}
      />

      {/* Support Status Banner */}
      <div className="bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs text-emerald-200">
        <div className="flex items-center gap-2">
          <LifeBuoy size={15} className="text-emerald-400" />
          <span className="font-semibold">Dedicated Care Agent:</span>
          <span className="text-slate-400 hidden sm:inline">
            Attach error screenshots, invoices, or logs for instant troubleshooting.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
          <ShieldCheck size={13} />
          <span>Priority Support Active</span>
        </div>
      </div>

      <MultimodalChat
        conversation={conversation}
        messages={messages}
        attachedFiles={attachedFiles}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={onSelectLanguage || (() => {})}
        isLoading={isLoading}
        streamingText={streamingText}
        error={error}
        featureId="customer-support"
        featureTitle="Customer Support & Diagnostic Care"
        featureDescription="How can we assist you today? Describe your issue, attach relevant screenshots or invoices, or speak your inquiry via microphone."
        samplePrompts={feature.samplePrompts}
        onOpenVoice={() => setIsVoiceOpen(true)}
        autoSpeakDefault={true}
      />

      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => {
          setIsVoiceOpen(false);
          if (activeConvId) {
            loadConversation(activeConvId);
          }
        }}
        featureId="customer-support"
        featureTitle="Customer Support Agent (Live Spoken Session)"
        conversationId={activeConvId}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
};

import React from 'react';
import { VoiceOrb } from '../components/VoiceOrb';
import { TranscriptPanel } from '../components/TranscriptPanel';
import { LatencyBadge } from '../components/LatencyBadge';
import { ConversationHeader } from '../components/ConversationHeader';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { Play, Square, AlertTriangle } from 'lucide-react';
import { SupportedLanguage } from '../types';

interface InterviewSessionProps {
  onBack: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectFeature?: (route: string) => void;
  onNewConversation?: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({
  onBack,
  selectedLanguage,
  onSelectFeature,
  onNewConversation,
}) => {
  const {
    voiceState,
    latencyMs,
    voiceMode,
    transcripts,
    audioLevel,
    errorMessage,
    isConnected,
    isRecording,
    startSession,
    stopSession,
  } = useVoiceSession({ mode: 'ai-interview', language: selectedLanguage });

  const isActive = voiceState !== 'idle' && voiceState !== 'error';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      <ConversationHeader
        title="AI Interview Practice"
        subtitle="Real-time conversational mock interview"
        onBack={onBack}
        language={selectedLanguage}
        showHeadphoneBanner={true}
        activeFeatureId="ai-interview"
        onSelectFeature={onSelectFeature}
        onNewConversation={onNewConversation}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full flex flex-col items-center justify-between">
        {/* Top Status & Latency Badge */}
        <div className="flex items-center justify-between w-full mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="font-semibold uppercase tracking-wider">Interviewer Persona</span>
          </div>

          <LatencyBadge
            latencyMs={latencyMs}
            isConnected={isConnected}
            voiceMode={voiceMode}
          />
        </div>

        {/* Central Voice Orb */}
        <div className="my-auto flex flex-col items-center">
          <VoiceOrb
            state={voiceState}
            audioLevel={audioLevel}
            onClick={isActive ? stopSession : startSession}
          />

          {/* Start/Stop Button */}
          <button
            onClick={isActive ? stopSession : startSession}
            className={`mt-4 px-6 py-2.5 rounded-full font-semibold text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {isActive ? (
              <>
                <Square size={16} /> End Interview
              </>
            ) : (
              <>
                <Play size={16} /> Start Microphone
              </>
            )}
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="w-full max-w-md my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Spoken Transcript Panel */}
        <div className="w-full mt-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Live Dialogue Transcript</span>
            <span className="text-[11px] text-slate-500 font-normal">Streaming via Gemini Live</span>
          </div>
          <TranscriptPanel
            transcripts={transcripts}
            emptyMessage="Click 'Start Microphone' and introduce yourself. The interviewer will respond conversationally."
          />
        </div>
      </div>
    </div>
  );
};

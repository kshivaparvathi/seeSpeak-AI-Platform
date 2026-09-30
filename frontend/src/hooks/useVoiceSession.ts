import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { useMicrophone } from './useMicrophone';
import { useAudioPlayback } from './useAudioPlayback';
import { VoiceSessionMode, VoiceState, RealtimeServerEvent, SupportedLanguage } from '../types';

export interface TranscriptItem {
  id: string;
  role: 'user' | 'agent';
  text: string;
  isFinal: boolean;
  timestamp: Date;
}

interface UseVoiceSessionOptions {
  mode: VoiceSessionMode | string;
  conversationId?: string;
  language?: SupportedLanguage;
}

export function useVoiceSession({ mode, conversationId, language = 'en' }: UseVoiceSessionOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [voiceMode, setVoiceMode] = useState<string>('gemini');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Playback Hook
  const { isPlaying, playChunk, stop: stopAudioPlayback, setSampleRate } = useAudioPlayback(24000);

  // WebSocket Hook
  const ws = useWebSocket({
    onOpen: () => {
      // Handshake: Send session_start event with mode, conv_id, and language
      ws.sendJson({
        type: 'session_start',
        mode: mode,
        feature_id: mode,
        conversation_id: conversationId,
        language: language,
      });
      setVoiceState('connecting');
    },
    onClose: () => {
      setVoiceState('idle');
    },
    onError: () => {
      setErrorMessage('Connection lost. Please check if the backend server is running on port 8000.');
      setVoiceState('error');
    },
    onJsonMessage: (event: RealtimeServerEvent) => {
      switch (event.type) {
        case 'session_ready':
          if (event.sample_rate) {
            setSampleRate(event.sample_rate);
          }
          if (event.voice_mode) {
            setVoiceMode(event.voice_mode);
          }
          setVoiceState('listening');
          break;

        case 'user_speaking':
          setVoiceState('listening');
          break;

        case 'agent_speaking':
          setVoiceState('speaking');
          if (event.latency !== undefined && event.latency !== null) {
            setLatencyMs(event.latency);
          }
          break;

        case 'turn_complete':
          setVoiceState('listening');
          break;

        case 'interrupt':
          // Critical Barge-In: immediately cease playback
          stopAudioPlayback();
          setVoiceState('interrupted');
          setTimeout(() => {
            setVoiceState('listening');
          }, 300);
          break;

        case 'latency':
          if (event.latency_ms !== undefined) {
            setLatencyMs(event.latency_ms);
          }
          break;

        case 'transcript':
          if (event.role && event.text) {
            setTranscripts((prev) => {
              // Update last if non-final of same role, else append
              const last = prev[prev.length - 1];
              if (last && last.role === event.role && !last.isFinal) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...last,
                  text: event.text || '',
                  isFinal: !!event.is_final,
                };
                return updated;
              } else {
                return [
                  ...prev,
                  {
                    id: Math.random().toString(36).substring(7),
                    role: event.role as 'user' | 'agent',
                    text: event.text || '',
                    isFinal: !!event.is_final,
                    timestamp: new Date(),
                  },
                ];
              }
            });
          }
          break;

        case 'error':
          setErrorMessage(event.message || 'Voice service error encountered.');
          setVoiceState('error');
          break;
      }
    },
    onBinaryMessage: (data: ArrayBuffer) => {
      // Received 24kHz PCM16 audio chunk from agent
      playChunk(data);
    },
  });

  // Forward microphone PCM16 chunks via WebSocket directly
  const handleMicrophoneChunk = useCallback(
    (chunk: ArrayBuffer) => {
      ws.sendBinary(chunk);
    },
    [ws]
  );

  // Microphone Hook
  const mic = useMicrophone({
    onAudioChunk: handleMicrophoneChunk,
    targetSampleRate: 16000,
  });

  // Track mic errors
  useEffect(() => {
    if (mic.error) {
      setErrorMessage(mic.error);
      setVoiceState('error');
    }
  }, [mic.error]);

  const startSession = useCallback(async () => {
    setErrorMessage(null);
    setLatencyMs(null);
    setVoiceState('connecting');
    // 1. Connect WebSocket
    ws.connect();
    // 2. Start microphone to capture audio
    await mic.start();
  }, [mic, ws]);

  const stopSession = useCallback(() => {
    mic.stop();
    stopAudioPlayback();
    ws.disconnect();
    setVoiceState('idle');
  }, [mic, stopAudioPlayback, ws]);

  return {
    voiceState,
    latencyMs,
    voiceMode,
    transcripts,
    audioLevel: mic.audioLevel,
    errorMessage,
    isConnected: ws.isConnected,
    isRecording: mic.isRecording,
    isPlaying,
    startSession,
    stopSession,
  };
}

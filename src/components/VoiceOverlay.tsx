'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Radio, 
  Check, 
  RefreshCw,
  Globe2
} from 'lucide-react';
import { SupportedLanguage } from '@/lib/types';
import { getLanguageInfo, SUPPORTED_LANGUAGES } from '@/lib/languages';
import { globalSpeech } from '@/lib/providers/speechProvider';

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onUserSpoke: (transcript: string) => Promise<string | void>; // returns AI response text to speak
}

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onLanguageChange,
  onUserSpoke,
}) => {
  const [state, setState] = useState<VoiceState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const langInfo = getLanguageInfo(currentLanguage);

  // Initialize voice session when overlay opens
  useEffect(() => {
    if (isOpen) {
      startVoiceSession();
    } else {
      cleanupVoiceSession();
    }

    return () => {
      cleanupVoiceSession();
    };
  }, [isOpen, currentLanguage]);

  const cleanupVoiceSession = () => {
    globalSpeech.stopListening();
    globalSpeech.stopSpeech();
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setState('idle');
    setLiveTranscript('');
    setAiResponseText('');
    setRecordingSeconds(0);
  };

  const startVoiceSession = async () => {
    setState('listening');
    setRecordingSeconds(0);

    // Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // Start listening with SpeechRecognition + Web Audio volume analyzer
    await globalSpeech.startListening(currentLanguage, {
      onInterimResult: (interim) => {
        // Interruption Check (Barge-In): If AI was speaking and user started talking, stop AI speech!
        if (globalSpeech.isSpeaking()) {
          globalSpeech.stopSpeech();
          setState('listening');
        }
        setLiveTranscript(interim);
      },
      onFinalResult: async (final) => {
        if (!final.trim()) return;
        setLiveTranscript(final);
        await processUserUtterance(final);
      },
      onVolumeChange: (vol) => {
        setVolumeLevel(vol);
      },
      onError: (err) => {
        console.warn('Voice overlay speech error:', err);
      },
      onEnd: () => {
        // Recognition cycle ended; if still listening mode and open, restart
        if (isOpen && state === 'listening' && !isMuted) {
          // auto restart listening if continuous
        }
      },
    });
  };

  const processUserUtterance = async (transcript: string) => {
    setState('thinking');
    globalSpeech.stopListening();

    try {
      const response = await onUserSpoke(transcript);
      if (response && isOpen) {
        setAiResponseText(response);
        setState('speaking');

        // Speak the response using SpeechSynthesis with target language
        globalSpeech.speak(response, currentLanguage, {
          onStart: () => {
            setState('speaking');
          },
          onEnd: () => {
            if (isOpen) {
              // Return to listening mode seamlessly
              startVoiceSession();
            }
          },
          onError: () => {
            if (isOpen) {
              startVoiceSession();
            }
          },
        });
      } else {
        if (isOpen) startVoiceSession();
      }
    } catch (e) {
      console.error('Failed to process utterance:', e);
      if (isOpen) startVoiceSession();
    }
  };

  const handleManualStop = () => {
    if (state === 'listening' && liveTranscript.trim()) {
      processUserUtterance(liveTranscript);
    } else if (state === 'speaking') {
      globalSpeech.stopSpeech();
      startVoiceSession();
    }
  };

  // Canvas Orb Visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 75;

      // React to volume level or pulsating sine
      const boost = state === 'listening' 
        ? volumeLevel * 80 
        : state === 'speaking' 
        ? Math.sin(angle * 3) * 15 + 25 
        : state === 'thinking' 
        ? Math.sin(angle * 4) * 8 + 10 
        : 5;

      const currentRadius = baseRadius + boost;

      // Color scheme based on state
      let gradStart = '#6366f1'; // Indigo (listening)
      let gradEnd = '#ec4899';   // Pink
      if (state === 'thinking') {
        gradStart = '#f59e0b';   // Amber
        gradEnd = '#8b5cf6';     // Violet
      } else if (state === 'speaking') {
        gradStart = '#10b981';   // Emerald
        gradEnd = '#3b82f6';     // Blue
      }

      // Outer glowing blur rings
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.5,
        centerX,
        centerY,
        currentRadius * 1.5
      );
      glowGrad.addColorStop(0, gradStart + '88');
      glowGrad.addColorStop(0.7, gradEnd + '33');
      glowGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Fluid wavy border
      ctx.beginPath();
      const points = 18;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const wave = Math.sin(theta * 3 + angle * 2) * (boost * 0.4);
        const r = currentRadius + wave;
        const x = centerX + Math.cos(theta) * r;
        const y = centerY + Math.sin(theta) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      const orbGrad = ctx.createLinearGradient(
        centerX - currentRadius,
        centerY - currentRadius,
        centerX + currentRadius,
        centerY + currentRadius
      );
      orbGrad.addColorStop(0, gradStart);
      orbGrad.addColorStop(1, gradEnd);

      ctx.fillStyle = orbGrad;
      ctx.shadowColor = gradStart;
      ctx.shadowBlur = 35;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner soft highlight
      ctx.beginPath();
      ctx.arc(centerX - 25, centerY - 25, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();

      angle += 0.04;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, state, volumeLevel]);

  if (!isOpen) return null;

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/95 backdrop-blur-xl p-4 md:p-8 animate-fadeIn select-none">
      {/* Top Header in Voice Mode */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="font-extrabold tracking-wider text-sm uppercase text-slate-300">
            AURA Real-Time Voice
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {formatTimer(recordingSeconds)}
          </span>
        </div>

        {/* Language switch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs text-slate-200">
            <Globe2 size={13} className="text-indigo-400" />
            <span>{langInfo.flag} {langInfo.name}</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Center Animated Interactive Orb */}
      <div className="flex flex-col items-center justify-center my-auto relative">
        <canvas
          ref={canvasRef}
          width={340}
          height={340}
          className="transition-transform duration-300"
        />

        {/* State label */}
        <div className="mt-6 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            {state === 'listening' ? (
              <span className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-pink-300 to-white animate-pulse">
                Listening...
              </span>
            ) : state === 'thinking' ? (
              <span className="text-xl md:text-2xl font-bold text-amber-300 animate-pulse">
                Thinking & Synthesizing...
              </span>
            ) : state === 'speaking' ? (
              <span className="text-xl md:text-2xl font-bold text-emerald-300 flex items-center gap-2">
                <span>Speaking</span>
                <span className="flex gap-1">
                  <span className="w-1 h-3 bg-emerald-400 animate-wave" />
                  <span className="w-1 h-5 bg-emerald-400 animate-wave [animation-delay:0.1s]" />
                  <span className="w-1 h-3 bg-emerald-400 animate-wave [animation-delay:0.2s]" />
                </span>
              </span>
            ) : (
              <span className="text-xl text-slate-400">Ready</span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            {state === 'speaking'
              ? 'Interrupt anytime by speaking aloud.'
              : 'Speak clearly in your preferred language.'}
          </p>
        </div>

        {/* Live Transcription card */}
        {(liveTranscript || aiResponseText) && (
          <div className="mt-6 max-w-xl w-full px-5 py-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl text-center text-sm md:text-base leading-relaxed text-slate-200">
            {state === 'speaking' ? (
              <p className="text-emerald-200 line-clamp-4">{aiResponseText}</p>
            ) : (
              <p className="italic text-indigo-200">"{liveTranscript || '...'}"</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-md flex items-center justify-center gap-6 pb-4">
        {/* Mute button */}
        <button
          onClick={() => {
            setIsMuted(!isMuted);
            if (!isMuted) {
              globalSpeech.stopListening();
            } else {
              startVoiceSession();
            }
          }}
          className={`p-4 rounded-2xl border transition-all ${
            isMuted
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-500/10'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Stop / Process button */}
        <button
          onClick={handleManualStop}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
        >
          {state === 'speaking' ? 'Stop Speaking' : 'Send & Answer'}
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-4 rounded-2xl bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
          title="Exit voice mode"
        >
          <X size={22} />
        </button>
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { isSpeechRecognitionSupported, stopSpeaking } from '../utils/speech';
import { SupportedLanguage } from '../types';
import { getLanguageInfo } from '../config/languages';

interface InterviewSoundBoxProps {
  onSpeechCaptured: (text: string) => void;
  isProcessing: boolean;
  isAiSpeaking: boolean;
  selectedLanguage: SupportedLanguage;
  currentQuestion?: string;
  disabled?: boolean;
  title?: string;
  idlePlaceholder?: string;
  startLabel?: string;
  stopLabel?: string;
}

export type SoundBoxState = 'idle' | 'listening' | 'processing' | 'ai_speaking' | 'error';

export const InterviewSoundBox: React.FC<InterviewSoundBoxProps> = ({
  onSpeechCaptured,
  isProcessing,
  isAiSpeaking,
  selectedLanguage,
  currentQuestion,
  disabled = false,
  title,
  idlePlaceholder = 'Click [ START ] to speak',
  startLabel = '▶ START RECORDING',
  stopLabel = '■ STOP & SUBMIT',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>('');

  const langInfo = getLanguageInfo(selectedLanguage);

  // Compute overall visual state
  const state: SoundBoxState = errorMessage
    ? 'error'
    : isProcessing
    ? 'processing'
    : isAiSpeaking
    ? 'ai_speaking'
    : isRecording
    ? 'listening'
    : 'idle';

  // Format recording duration timer (e.g. 00:15)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up all audio analysis and microphone resources
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Draw smooth live waveform reacting directly to microphone frequency & volume
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const analyser = analyserRef.current;

    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      if (analyser && isRecording) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Idle ambient data
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = 10;
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Determine bar color based on active state
      const isDark = document.documentElement.classList.contains('dark');
      const barCount = 36;
      const barWidth = Math.floor(width / barCount) - 3;
      const step = Math.floor(bufferLength / barCount) || 1;

      for (let i = 0; i < barCount; i++) {
        let value = dataArray[i * step] || 0;
        if (!isRecording) {
          // Gentle ambient breathing idle motion
          value = Math.sin((Date.now() / 400) + (i * 0.3)) * 8 + 12;
        }

        const percent = value / 255;
        const barHeight = Math.max(4, Math.floor(percent * (height - 8)));
        const x = i * (barWidth + 3) + 2;
        const y = Math.floor((height - barHeight) / 2);

        // Gradient based on state
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (state === 'listening') {
          gradient.addColorStop(0, '#f43f5e'); // Rose 500
          gradient.addColorStop(0.5, '#ec4899'); // Pink 500
          gradient.addColorStop(1, '#8b5cf6'); // Purple 500
        } else if (state === 'ai_speaking') {
          gradient.addColorStop(0, '#38bdf8'); // Sky 400
          gradient.addColorStop(1, '#6366f1'); // Indigo 500
        } else if (state === 'processing') {
          gradient.addColorStop(0, '#eab308'); // Amber 500
          gradient.addColorStop(1, '#f97316'); // Orange 500
        } else {
          gradient.addColorStop(0, isDark ? '#334155' : '#cbd5e1');
          gradient.addColorStop(1, isDark ? '#1e293b' : '#94a3b8');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    };

    render();
  }, [isRecording, state]);

  // Start real microphone recording & recognition
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setInterimText('');
    accumulatedTranscriptRef.current = '';

    // Stop TTS speaking if interviewer was talking
    stopSpeaking();

    if (!isSpeechRecognitionSupported()) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      // 1. Get real microphone audio stream for the AnalyserNode
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // 2. Start Speech Recognition
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = langInfo.speechCode || 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setDuration(0);
        // Start duration counter
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += (finalChunk ? ' ' : '') + res[0].transcript.trim();
          } else {
            interim += res[0].transcript;
          }
        }

        accumulatedTranscriptRef.current = finalChunk;
        setInterimText((finalChunk + (interim ? ' ' + interim : '')).trim());
      };

      rec.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
          setErrorMessage(`Mic error: ${event.error}`);
        }
      };

      rec.onend = () => {
        // Recognition completed or stopped
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission blocked. Please allow microphone access in your browser.');
      } else {
        setErrorMessage(err.message || 'Could not start microphone.');
      }
      setIsRecording(false);
      cleanupAudio();
    }
  };

  // Stop recording, gather speech, and send to AI
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    cleanupAudio();
    setIsRecording(false);

    const fullSpoken = (accumulatedTranscriptRef.current || interimText).trim();
    setInterimText('');
    accumulatedTranscriptRef.current = '';

    if (fullSpoken) {
      onSpeechCaptured(fullSpoken);
    } else {
      setErrorMessage('No speech detected. Please speak clearly into your microphone.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Run waveform canvas animation
  useEffect(() => {
    drawWaveform();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawWaveform]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [cleanupAudio]);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl p-5 md:p-6 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl transition-all duration-200">
      {/* Sound Box Top Bar: Status & Duration */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          {/* Animated Status Indicator Dot */}
          <span className="relative flex h-3 w-3">
            {state === 'listening' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            )}
            {state === 'ai_speaking' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                state === 'listening'
                  ? 'bg-rose-500'
                  : state === 'ai_speaking'
                  ? 'bg-sky-500'
                  : state === 'processing'
                  ? 'bg-amber-500'
                  : state === 'error'
                  ? 'bg-rose-600'
                  : 'bg-emerald-500'
              }`}
            />
          </span>

          <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-800 dark:text-slate-200">
            {state === 'listening'
              ? '● Listening...'
              : state === 'processing'
              ? '⚡ Analyzing input...'
              : state === 'ai_speaking'
              ? '🔊 AI Speaking...'
              : state === 'error'
              ? '⚠ Microphone alert'
              : (title || '● Voice Box Ready')}
          </span>
        </div>

        {/* Live Timer or Language Pill */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold animate-pulse">
              ⏱ {formatTimer(duration)}
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {langInfo.flag} {langInfo.name}
            </span>
          )}
        </div>
      </div>

      {/* Central Audio Waveform Canvas */}
      <div className="relative w-full h-24 sm:h-28 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-center overflow-hidden mb-4 shadow-inner">
        <canvas
          ref={canvasRef}
          width={480}
          height={96}
          className="w-full h-full object-contain"
        />

        {/* Overlay pulse ring when recording */}
        {isRecording && (
          <div className="absolute inset-0 pointer-events-none border-2 border-rose-500/40 rounded-2xl animate-pulse" />
        )}

        {/* Centered state message if not recording */}
        {!isRecording && !isProcessing && !isAiSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-slate-900/10 dark:bg-slate-950/20 backdrop-blur-[1px]">
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
              {idlePlaceholder}
            </span>
          </div>
        )}
      </div>

      {/* Live Interim Transcript or Error Prompt */}
      {interimText && (
        <div className="mb-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 text-xs text-indigo-900 dark:text-indigo-200 font-medium animate-fadeIn">
          <span className="block font-mono text-[10px] text-indigo-500 dark:text-indigo-400 uppercase mb-0.5">
            🎙 Spoken Transcript:
          </span>
          <p className="italic">"{interimText}"</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={15} className="shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Prominent Large START & STOP Buttons */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={disabled || isProcessing}
            type="button"
            className="flex-1 max-w-xs flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={17} className="fill-white" />
            <span>{startLabel}</span>
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            type="button"
            className="flex-1 max-w-xs flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-600/40 hover:shadow-rose-600/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer animate-pulse"
          >
            <Square size={16} className="fill-white" />
            <span>{stopLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};

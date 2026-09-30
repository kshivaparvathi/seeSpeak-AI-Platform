import { useRef, useCallback, useState, useEffect } from 'react';

export function useAudioPlayback(initialSampleRate: number = 24000) {
  const [isPlaying, setIsPlaying] = useState(false);
  const sampleRateRef = useRef<number>(initialSampleRate);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const getAudioContext = useCallback(() => {
    // Create AudioContext at device hardware rate (do not lock context rate to 24000)
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtxClass();
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  const setSampleRate = useCallback((rate: number) => {
    if (rate && rate > 0) {
      sampleRateRef.current = rate;
    }
  }, []);

  const stop = useCallback(() => {
    // Immediately halt all currently active and scheduled audio nodes
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    });
    activeSourcesRef.current = [];

    if (audioContextRef.current) {
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
    setIsPlaying(false);
  }, []);

  const playChunk = useCallback(
    (pcmData: ArrayBuffer) => {
      try {
        if (!pcmData || pcmData.byteLength === 0) return;

        const audioCtx = getAudioContext();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }

        const int16Array = new Int16Array(pcmData);
        if (int16Array.length === 0) return;

        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        // Web Audio natively resamples the buffer from sampleRateRef.current (24000) to hardware context rate
        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRateRef.current);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        const currentTime = audioCtx.currentTime;
        const startTime = Math.max(currentTime, nextPlayTimeRef.current);
        source.start(startTime);
        nextPlayTimeRef.current = startTime + audioBuffer.duration;

        activeSourcesRef.current.push(source);
        setIsPlaying(true);

        source.onended = () => {
          activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
          if (activeSourcesRef.current.length === 0) {
            setIsPlaying(false);
          }
        };
      } catch (e) {
        console.error('Error during audio chunk playback:', e);
      }
    },
    [getAudioContext]
  );

  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stop]);

  return {
    isPlaying,
    playChunk,
    stop,
    setSampleRate,
  };
}

import { SupportedLanguage } from '../types';
import { getLanguageInfo } from '../languages';

// Clean markdown for text-to-speech so it speaks fluently
export function cleanTextForSpeech(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, ' [code block omitted] ') // don't read raw code blocks
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/>\s+/g, '')
    .replace(/[-*+]\s+/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();
}

export class SpeechController {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognition: any = null;
  private isListening: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
    }
  }

  // Get best matching voice for language with graceful fallback
  public getVoiceForLanguage(language: SupportedLanguage): {
    voice: SpeechSynthesisVoice | null;
    isNative: boolean;
    localeUsed: string;
  } {
    if (!this.synth) {
      return { voice: null, isNative: false, localeUsed: 'en-US' };
    }

    const langInfo = getLanguageInfo(language);
    const targetLocale = langInfo.speechCode || 'en-US';
    const targetPrefix = targetLocale.split('-')[0].toLowerCase();

    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) {
      return { voice: null, isNative: false, localeUsed: targetLocale };
    }

    // 1. Exact match e.g. 'kn-IN', 'mr-IN', 'te-IN'
    const exactMatch = voices.find((v) => v.lang.toLowerCase() === targetLocale.toLowerCase());
    if (exactMatch) {
      return { voice: exactMatch, isNative: true, localeUsed: exactMatch.lang };
    }

    // 2. Prefix match e.g. 'kn', 'mr', 'te'
    const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
    if (prefixMatch) {
      return { voice: prefixMatch, isNative: true, localeUsed: prefixMatch.lang };
    }

    // 3. Indian English / Global English fallback if Indian language voice is absent in browser
    const indianEnglish = voices.find((v) => v.lang.toLowerCase() === 'en-in');
    if (indianEnglish) {
      return { voice: indianEnglish, isNative: false, localeUsed: 'en-IN' };
    }

    // 4. Default system voice
    const defaultVoice = voices.find((v) => v.default) || voices[0] || null;
    return { voice: defaultVoice, isNative: false, localeUsed: defaultVoice?.lang || 'en-US' };
  }

  // Speak text with target language
  public speak(
    text: string,
    language: SupportedLanguage,
    options: {
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: unknown) => void;
    } = {}
  ): void {
    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    // Stop any existing speech first
    this.stopSpeech();

    const clean = cleanTextForSpeech(text);
    if (!clean) {
      options.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    const voiceResolution = this.getVoiceForLanguage(language);

    utterance.lang = voiceResolution.localeUsed;
    if (voiceResolution.voice) {
      utterance.voice = voiceResolution.voice;
    }
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      options.onError?.(e);
      options.onEnd?.();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  // Interruption handling: Immediately stop speaking (barge-in)
  public stopSpeech(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    return Boolean(this.synth && this.synth.speaking);
  }

  // Real-time Speech Recognition
  public async startListening(
    language: SupportedLanguage,
    callbacks: {
      onInterimResult: (transcript: string) => void;
      onFinalResult: (transcript: string) => void;
      onError: (err: string) => void;
      onEnd: () => void;
      onVolumeChange?: (volume: number) => void;
    }
  ): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Interruption check: If AI is currently speaking, stop it immediately!
    this.stopSpeech();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      callbacks.onError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      const langInfo = getLanguageInfo(language);
      this.recognition.lang = langInfo.speechCode || 'en-US';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      // Start AudioContext for volume analyser
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaStream = stream;
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const pollVolume = () => {
          if (!this.isListening || !this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          callbacks.onVolumeChange?.(avg / 255); // normalize 0-1
          requestAnimationFrame(pollVolume);
        };
        requestAnimationFrame(pollVolume);
      } catch (micErr) {
        console.warn('Microphone audio analyser unavailable:', micErr);
      }

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          callbacks.onInterimResult(interim);
        }
        if (final) {
          callbacks.onFinalResult(final);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          callbacks.onError(`Speech recognition error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.cleanupAudio();
        callbacks.onEnd();
      };

      this.isListening = true;
      this.recognition.start();
      return true;
    } catch (err: any) {
      callbacks.onError(err.message || 'Could not start speech recognition');
      return false;
    }
  }

  public stopListening(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.cleanupAudio();
  }

  private cleanupAudio(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
  }
}

export const globalSpeech = new SpeechController();

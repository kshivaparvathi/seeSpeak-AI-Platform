import { SUPPORTED_LANGUAGES, getLanguageInfo } from '../config/languages';

/**
 * Strips markdown formatting, code blocks, URLs, and symbols so TTS reads clean, natural speech.
 */
export function cleanMarkdownForSpeech(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Remove code blocks (```...```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' Code block omitted. ');

  // Remove inline code (`...`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove images and links [text](url) -> text
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // Remove headers (# Header)
  cleaned = cleaned.replace(/#{1,6}\s+([^\n]+)/g, '$1. ');

  // Remove bold / italics
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');

  // Remove bullet points and numbered list markers at line start
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');

  // Remove blockquotes (> quote)
  cleaned = cleaned.replace(/^\s*>\s+/gm, '');

  // Remove markdown horizontal rules
  cleaned = cleaned.replace(/^---+$/gm, '');

  // Remove table row markup
  cleaned = cleaned.replace(/\|/g, ' ');

  // Clean excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Detect language from text using Unicode script detection, matching the backend priority.
 */
export function detectLanguageFromText(text: string, fallbackLang: string = 'en'): string {
  if (!text) return fallbackLang;
  const tLower = text.toLowerCase();

  // Explicit user keywords
  if (tLower.includes('in telugu') || tLower.includes('telugu lo') || tLower.includes('తెలుగు')) return 'te';
  if (tLower.includes('in hindi') || tLower.includes('hindi me') || tLower.includes('हिंदी') || tLower.includes('हिन्दी')) return 'hi';
  if (tLower.includes('in kannada') || tLower.includes('kannada dalli') || tLower.includes('ಕನ್ನಡ')) return 'kn';
  if (tLower.includes('in marathi') || tLower.includes('marathi madhye') || tLower.includes('मराठी')) return 'mr';
  if (tLower.includes('in tamil') || tLower.includes('tamilil') || tLower.includes('தமிழ்')) return 'ta';
  if (tLower.includes('in malayalam') || tLower.includes('മലയാളം')) return 'ml';
  if (tLower.includes('in bengali') || tLower.includes('in bangla') || tLower.includes('বাংলা')) return 'bn';
  if (tLower.includes('in gujarati') || tLower.includes('ગુજરાતી')) return 'gu';
  if (tLower.includes('in punjabi') || tLower.includes('ਪੰਜਾਬੀ')) return 'pa';
  if (tLower.includes('in urdu') || tLower.includes('اردو')) return 'ur';
  if (tLower.includes('in english') || tLower.includes('english lo') || tLower.includes('english me')) return 'en';

  // Unicode script ranges
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
  if (/[\u0600-\u06FF]/.test(text)) return 'ur'; // Urdu
  if (/[\u0900-\u097F]/.test(text)) {
    // Marathi hints
    if (/[ळ]/.test(text) || /(आहे|नाही|कसे|काय|करावे|माहिती|सांगा)/.test(text)) {
      return 'mr';
    }
    return 'hi'; // Hindi
  }

  // If text contains Latin alphabet and no explicit request, it is English
  if (/[a-zA-Z]/.test(text)) return 'en';

  return fallbackLang;
}

/**
 * Check if browser supports Web Speech Synthesis
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Check if browser supports Web Speech Recognition
 */
export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

/**
 * Find the best available voice for a language code.
 */
export function getBestVoice(langCode: string): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const info = getLanguageInfo(langCode);
  const targetTag = (info.speechCode || 'en-US').toLowerCase();
  const prefix = langCode.toLowerCase();

  // 1. Exact BCP-47 match (e.g. te-IN, hi-IN)
  let voice = voices.find((v) => v.lang.toLowerCase() === targetTag || v.lang.toLowerCase().replace('_', '-') === targetTag);
  if (voice) return voice;

  // 2. Starts with targetTag
  voice = voices.find((v) => v.lang.toLowerCase().startsWith(targetTag));
  if (voice) return voice;

  // 3. Starts with 2-letter language code (e.g. "te", "hi")
  voice = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (voice) return voice;

  // 4. Default voice or English voice as fallback
  voice = voices.find((v) => v.lang.toLowerCase().startsWith('en')) || voices[0] || null;
  return voice;
}

// Ensure voices are loaded asynchronously in Chrome/Edge
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    // Warm up voice list
    window.speechSynthesis.getVoices();
  };
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Stops any active speech synthesis immediately.
 */
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
  currentUtterance = null;
}

/**
 * Checks if speech is currently actively playing.
 */
export function isSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  return window.speechSynthesis.speaking;
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  rate?: number;
  pitch?: number;
}

/**
 * Speaks text using the matching voice for the detected or provided language.
 */
export function speakText(
  text: string,
  langCode: string = 'en',
  options: SpeakOptions = {}
): void {
  if (!isSpeechSynthesisSupported()) {
    options.onError?.(new Error('SpeechSynthesis not supported'));
    return;
  }

  // Cancel any prior speech first (supports natural barge-in / interruption)
  stopSpeaking();

  const clean = cleanMarkdownForSpeech(text);
  if (!clean.trim()) {
    options.onEnd?.();
    return;
  }

  // Detect real language of text if langCode is general
  const detectedLang = detectLanguageFromText(clean, langCode);
  const info = getLanguageInfo(detectedLang);

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = info.speechCode || 'en-US';
  utterance.rate = options.rate ?? 1.02;
  utterance.pitch = options.pitch ?? 1.0;

  const voice = getBestVoice(detectedLang);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => {
    options.onStart?.();
  };

  utterance.onend = () => {
    currentUtterance = null;
    options.onEnd?.();
  };

  utterance.onerror = (e) => {
    currentUtterance = null;
    // Don't report cancelled as an error
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      options.onError?.(e);
    } else {
      options.onEnd?.();
    }
  };

  currentUtterance = utterance;

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    options.onError?.(err);
  }
}

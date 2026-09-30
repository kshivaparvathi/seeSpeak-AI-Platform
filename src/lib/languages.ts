import { SupportedLanguage } from './types';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string; // BCP 47 code for SpeechSynthesis & SpeechRecognition
  direction?: 'ltr' | 'rtl';
  promptInstruction: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'auto',
    name: 'Auto Detect',
    nativeName: 'Auto Detect',
    flag: '🌐',
    speechCode: 'en-US',
    promptInstruction: 'Detect the language of the user input automatically and respond in that exact language naturally.',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    speechCode: 'en-US',
    promptInstruction: 'Respond in clear, natural, modern English.',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    speechCode: 'te-IN',
    promptInstruction: 'Respond naturally in fluent Telugu (తెలుగు). Use Telugu script. Keep code, programming syntax, proper nouns, file names, and technical terms in English (or transliterated English where natural) while explaining concepts in clear Telugu. Avoid robotic mechanical word-for-word translation; make it sound like a friendly native Telugu expert.',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    speechCode: 'hi-IN',
    promptInstruction: 'Respond naturally in fluent Hindi (हिन्दी). Use Devanagari script. Keep programming syntax, variables, and technical jargon in English, explaining concepts conversationally in Hindi.',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    speechCode: 'kn-IN',
    promptInstruction: 'Respond naturally in Kannada (ಕನ್ನಡ). Use Kannada script. Do not translate the response into English unless the user asks. Preserve technical terms when translating them would reduce clarity. If the user asks for code, keep code unchanged and explain it in Kannada.',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    speechCode: 'mr-IN',
    promptInstruction: 'Respond naturally in Marathi (मराठी). Use Devanagari script. Do not default to Hindi or English. Preserve technical terminology where appropriate. If code is present, do not translate code.',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    speechCode: 'ta-IN',
    promptInstruction: 'Respond naturally in fluent Tamil (தமிழ்). Use Tamil script. Keep code, technical terminology, and file names intact while giving explanations in clear Tamil.',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    speechCode: 'ml-IN',
    promptInstruction: 'Respond naturally in fluent Malayalam (മലയാളം). Use Malayalam script. Preserve programming code and technical terms in English while explaining thoroughly in Malayalam.',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    speechCode: 'bn-IN',
    promptInstruction: 'Respond naturally in fluent Bengali (বাংলা). Use Bengali script. Retain code and technical terms in English while explaining in warm, articulate Bengali.',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    speechCode: 'gu-IN',
    promptInstruction: 'Respond naturally in fluent Gujarati (ગુજરાતી). Use Gujarati script. Keep technical terms and code in English while giving explanations in clear Gujarati.',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    speechCode: 'pa-IN',
    promptInstruction: 'Respond naturally in fluent Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script. Retain technical terms in English, explaining concepts in lively Punjabi.',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    speechCode: 'ur-IN',
    direction: 'rtl',
    promptInstruction: 'Respond naturally in fluent Urdu (اردو). Use Urdu script. Keep code, technical terminology, and file names in English while providing lucid Urdu explanations.',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    speechCode: 'es-ES',
    promptInstruction: 'Respond in natural, modern, standard Spanish (Español). Maintain technical terms and code appropriately.',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    speechCode: 'fr-FR',
    promptInstruction: 'Respond in natural, fluent French (Français). Maintain programming syntax and standard technical expressions.',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    speechCode: 'de-DE',
    promptInstruction: 'Respond in precise, natural German (Deutsch). Preserve code and technical identifiers.',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    speechCode: 'ja-JP',
    promptInstruction: 'Respond in natural, polite Japanese (日本語 - desu/masu style). Keep code and English technical keywords intact where standard in Japanese tech literature.',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    speechCode: 'ko-KR',
    promptInstruction: 'Respond in natural Korean (한국어 - haeyoche or hapsyoche). Keep code and technical jargon in English where appropriate.',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文 (简体)',
    flag: '🇨🇳',
    speechCode: 'zh-CN',
    promptInstruction: 'Respond in fluent Simplified Chinese (简体中文). Keep code and standard programming vocabulary intact.',
  },
];

export function getLanguageInfo(code: SupportedLanguage): LanguageInfo {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return found || SUPPORTED_LANGUAGES[0];
}

export function detectLanguageFromText(text: string): SupportedLanguage {
  if (!text || text.trim() === '') return 'en';

  // 1. Kannada Unicode range: \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn';
  }

  // 2. Telugu Unicode range: \u0C00-\u0C7F
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te';
  }

  // 3. Tamil: \u0B80-\u0BFF
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta';
  }

  // 4. Malayalam: \u0D00-\u0D7F
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return 'ml';
  }

  // 5. Bengali: \u0980-\u09FF
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn';
  }

  // 6. Gujarati: \u0A80-\u0AFF
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'gu';
  }

  // 7. Gurmukhi (Punjabi): \u0A00-\u0A7F
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return 'pa';
  }

  // 8. Urdu / Arabic: \u0600-\u06FF
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ur';
  }

  // 9. Devanagari range: \u0900-\u097F (Check Marathi vs Hindi)
  if (/[\u0900-\u097F]/.test(text)) {
    // Specific Marathi letter ळ (\u0933), ऱ (\u095F) or common Marathi vocabulary
    const marathiPattern = /[\u0933\u095F]|(\b(आहे|नाही|करा|सांगा|काय|कसे|झाले|पाहिजे|म्हणून|आणि|मध्ये|सोप्या|भाषेत|समजावून|प्रकाशसंश्लेषण|విವರ|कसं|कसा)\b)/i;
    if (marathiPattern.test(text)) {
      return 'mr';
    }
    return 'hi';
  }

  // 10. Japanese: \u3040-\u30FF, \u4E00-\u9FAF
  if (/[\u3040-\u30FF]/.test(text)) {
    return 'ja';
  }

  // 11. Korean (Hangul): \uAC00-\uD7AF, \u1100-\u11FF
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return 'ko';
  }

  // 12. Chinese: \u4E00-\u9FFF
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh';
  }

  // Transliterated checks
  if (/\b(kannada|namaskara|hege|yenu|yelli|madu|heli|beku|tumba)\b/i.test(text)) return 'kn';
  if (/\b(marathi|namaskar|ahe|nahi|sanga|kiti|kasa|kashi|kay)\b/i.test(text)) return 'mr';
  if (/\b(telugu|namaskaram|cheyyi|chey|ela|enti|naku|cheppu|chudu|undi|unte)\b/i.test(text)) return 'te';
  if (/\b(hindi|namaste|batao|karo|kaise|kya|mujhe|samjhao|hai|hota|karna)\b/i.test(text)) return 'hi';

  return 'en';
}

export function resolveEffectiveLanguage(
  explicitSelection: SupportedLanguage,
  userInputText: string
): SupportedLanguage {
  // Priority: Explicit User Selection > Auto-detect > Default ('en')
  if (explicitSelection && explicitSelection !== 'auto') {
    return explicitSelection;
  }
  return detectLanguageFromText(userInputText);
}

import { LanguageInfo, SupportedLanguage } from '../types';

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
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
    promptInstruction: 'Respond naturally in fluent Telugu (తెలుగు). Use Telugu script. Keep code and technical terms in English while explaining thoroughly in Telugu.',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    speechCode: 'hi-IN',
    promptInstruction: 'Respond naturally in fluent Hindi (हिन्दी). Use Devanagari script. Keep programming syntax and technical jargon in English, explaining concepts conversationally in Hindi.',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    speechCode: 'kn-IN',
    promptInstruction: 'Respond naturally in Kannada (ಕನ್ನಡ). Use Kannada script. Do not translate into English or Hindi unless explicitly requested. Preserve code and technical terms.',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    speechCode: 'mr-IN',
    promptInstruction: 'Respond naturally in Marathi (मराठी). Use Devanagari script. Do not default to Hindi or English. Preserve code and technical terms.',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    speechCode: 'ta-IN',
    promptInstruction: 'Respond naturally in fluent Tamil (தமிழ்). Use Tamil script. Keep code and technical terms in English while explaining concepts in Tamil.',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    speechCode: 'ml-IN',
    promptInstruction: 'Respond naturally in fluent Malayalam (മലയാളം). Use Malayalam script. Preserve code and technical terms in English while explaining in Malayalam.',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    speechCode: 'bn-IN',
    promptInstruction: 'Respond naturally in fluent Bengali (বাংলা). Use Bengali script. Retain code and technical terms in English while explaining in Bengali.',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    speechCode: 'gu-IN',
    promptInstruction: 'Respond naturally in fluent Gujarati (ગુજરાતી). Use Gujarati script. Keep technical terms and code in English while explaining in Gujarati.',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    speechCode: 'pa-IN',
    promptInstruction: 'Respond naturally in fluent Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script. Retain technical terms in English, explaining concepts in Punjabi.',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    speechCode: 'ur-IN',
    promptInstruction: 'Respond naturally in fluent Urdu (اردو). Use Urdu script. Keep technical terms and code in English while providing Urdu explanations.',
  },
];

export function getLanguageInfo(code: string): LanguageInfo {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code) || SUPPORTED_LANGUAGES[0];
}

export type SupportedLanguage = 
  | 'auto'
  | 'en'
  | 'te'
  | 'hi'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'pa'
  | 'ur'
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'ko'
  | 'zh';

export type AgentMode = 
  | 'general'
  | 'study'
  | 'developer'
  | 'document'
  | 'vision'
  | 'meeting'
  | 'research';

export type ExplanationStyle = 
  | 'simple'
  | 'detailed'
  | 'beginner'
  | 'technical'
  | 'exam_ready'
  | 'with_examples'
  | 'step_by_step';

export type PersonalityMode = 'concise' | 'balanced' | 'detailed';

export type FileType = 'image' | 'pdf' | 'document' | 'audio' | 'video' | 'data';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: FileType;
  mimeType: string;
  base64Data?: string; // Data URL or base64
  extractedText?: string;
  metadata?: {
    pageCount?: number;
    dimensions?: { width: number; height: number };
    duration?: number;
    rowCount?: number;
    summary?: string;
    topics?: string[];
  };
  uploadProgress?: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: UploadedFile[];
  detectedLanguage?: string;
  responseLanguage?: SupportedLanguage;
  detectedMode?: AgentMode;
  audioUrl?: string; // Voice memo if user spoke
  isVoiceInput?: boolean;
  followUpSuggestions?: string[];
  explanationStyle?: ExplanationStyle;
  visualDiagram?: string; // Mermaid or SVG representation
  smartSections?: {
    summary?: string;
    importantPoints?: string[];
    detailedExplanation?: string;
    questionsToAsk?: string[];
    concept?: string;
    example?: string;
    examTip?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  language: SupportedLanguage;
  mode: AgentMode;
  learningMode: boolean;
  pinnedFiles: UploadedFile[];
}

export interface AppSettings {
  apiKey?: string;
  provider: 'gemini' | 'openai' | 'groq' | 'builtin';
  modelName: string;
  selectedLanguage: SupportedLanguage;
  voiceSpeed: number; // 0.8 - 1.5
  voicePitch: number; // 0.8 - 1.2
  voiceURI?: string;
  autoPlayVoice: boolean;
  personality: PersonalityMode;
  theme: 'dark' | 'light' | 'system';
  learningModeDefault: boolean;
}

export interface StreamEvent {
  type: 'status' | 'delta' | 'complete' | 'error' | 'mode' | 'suggestions';
  statusMessage?: string;
  content?: string;
  mode?: AgentMode;
  suggestions?: string[];
  error?: string;
}

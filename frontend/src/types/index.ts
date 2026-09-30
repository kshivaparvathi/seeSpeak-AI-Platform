export type SupportedLanguage = 
  | 'auto' 
  | 'en' 
  | 'te' 
  | 'hi' 
  | 'kn' 
  | 'mr' 
  | 'ta' 
  | 'ml' 
  | 'bn' 
  | 'gu' 
  | 'pa' 
  | 'ur';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string;
  promptInstruction: string;
}

export interface ConversationFile {
  id: string;
  conversation_id: string;
  filename: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  feature: string;
  mode: string;
  language: SupportedLanguage;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  files?: ConversationFile[];
  file_count?: number;
}

export type VoiceSessionMode = 'interviewer' | 'customer_service';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'interrupted' | 'error';

export interface RealtimeServerEvent {
  type: 
    | 'session_ready' 
    | 'user_speaking' 
    | 'agent_speaking' 
    | 'turn_complete' 
    | 'interrupt' 
    | 'latency' 
    | 'transcript' 
    | 'error';
  session_id?: string;
  mode?: string;
  sample_rate?: number;
  voice_mode?: string;
  latency?: number;
  latency_ms?: number;
  role?: 'user' | 'agent';
  text?: string;
  is_final?: boolean;
  message?: string;
}

export interface FeatureConfig {
  id: string;
  title: string;
  tagline: string;
  description: string;
  route: string;
  aliases?: string[];
  iconName: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    glow: string;
    accent: string;
  };
  supportedMimeTypes: string[];
  samplePrompts: { text: string; langHint: string }[];
}

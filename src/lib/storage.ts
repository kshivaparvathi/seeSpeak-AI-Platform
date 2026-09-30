import { AppSettings, Conversation, Message, SupportedLanguage, UploadedFile } from './types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'aura_conversations_v1',
  ACTIVE_ID: 'aura_active_id_v1',
  SETTINGS: 'aura_settings_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  modelName: 'gemini-flash-latest',
  selectedLanguage: 'auto',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  autoPlayVoice: false,
  personality: 'balanced',
  theme: 'dark',
  learningModeDefault: false,
};

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to parse settings, using defaults', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load conversations', e);
    return [];
  }
}

export function saveConversations(convs: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Avoid saving enormous base64 data to localStorage to prevent quota exceeded errors
    const sanitized = convs.map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        files: m.files?.map((f) => ({
          ...f,
          base64Data: f.base64Data && f.base64Data.length > 50000 ? undefined : f.base64Data,
        })),
      })),
      pinnedFiles: c.pinnedFiles.map((f) => ({
        ...f,
        base64Data: f.base64Data && f.base64Data.length > 50000 ? undefined : f.base64Data,
      })),
    }));
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('Failed to persist conversations to localStorage', e);
  }
}

export function createNewConversation(language: SupportedLanguage = 'auto'): Conversation {
  return {
    id: 'conv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    title: 'New Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    language,
    mode: 'general',
    learningMode: false,
    pinnedFiles: [],
  };
}

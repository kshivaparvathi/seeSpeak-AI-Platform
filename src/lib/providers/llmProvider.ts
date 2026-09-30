import { AgentMode, Message, SupportedLanguage, UploadedFile, ExplanationStyle, PersonalityMode } from '../types';
import { executeGeminiMultimodalRequest } from '@/services/gemini/geminiMultimodal';

export interface GenerationOptions {
  prompt: string;
  history: Message[];
  currentFiles: UploadedFile[];
  language: SupportedLanguage;
  mode: AgentMode;
  learningMode: boolean;
  explanationStyle?: ExplanationStyle;
  personality: PersonalityMode;
  apiKey?: string;
  provider?: 'gemini' | 'openai' | 'builtin';
  modelName?: string;
  onChunk: (text: string) => void;
  onStatus: (status: string) => void;
}

export interface GenerationResult {
  fullText: string;
  detectedMode: AgentMode;
  detectedLanguage: string;
  followUpSuggestions: string[];
}

// Real Gemini generator - NO generic 3-step fallbacks or hardcoded mocks!
export async function generateMultimodalResponse(options: GenerationOptions): Promise<GenerationResult> {
  const result = await executeGeminiMultimodalRequest({
    prompt: options.prompt,
    inputType: options.currentFiles.length > 0 ? 'multimodal' : 'text',
    files: options.currentFiles,
    history: options.history,
    language: options.language,
    explanationStyle: options.explanationStyle,
    personality: options.personality,
    learningMode: options.learningMode,
    apiKey: options.apiKey,
    modelName: options.modelName,
    onChunk: options.onChunk,
    onStatus: options.onStatus,
  });

  return {
    fullText: result.text,
    detectedMode: options.mode,
    detectedLanguage: options.language,
    followUpSuggestions: result.followUpSuggestions,
  };
}

import { 
  AgentMode, 
  ExplanationStyle, 
  Message, 
  PersonalityMode, 
  SupportedLanguage, 
  UploadedFile 
} from './types';
import { resolveEffectiveLanguage } from './languages';
import { hydrateFiles } from '@/services/gemini/geminiFileRegistry';
import { executeGeminiMultimodalRequest } from '@/services/gemini/geminiMultimodal';

export interface ProcessUserInputParams {
  prompt: string;
  files?: UploadedFile[];
  history: Message[];
  selectedLanguage: SupportedLanguage;
  currentMode?: AgentMode;
  learningMode?: boolean;
  explanationStyle?: ExplanationStyle;
  personality?: PersonalityMode;
  apiKey?: string;
  provider?: 'gemini' | 'openai' | 'builtin';
  modelName?: string;
  onStatusChange?: (status: string) => void;
  onChunk?: (text: string) => void;
}

export interface AgentProcessResult {
  text: string;
  detectedMode: AgentMode;
  effectiveLanguage: SupportedLanguage;
  inputType: string;
  modelUsed: string;
  followUpSuggestions: string[];
}

// Section 5: Real Input Router determining exact input pipeline
export function determineInputType(prompt: string, files: UploadedFile[] = []): {
  inputType: string;
  detectedMode: AgentMode;
} {
  const hasText = Boolean(prompt && prompt.trim().length > 0);
  const imageFiles = files.filter((f) => f.type === 'image');
  const pdfFiles = files.filter((f) => f.type === 'pdf');
  const docFiles = files.filter((f) => f.type === 'document' || f.type === 'data');
  const audioFiles = files.filter((f) => f.type === 'audio');
  const videoFiles = files.filter((f) => f.type === 'video');

  const totalFiles = files.length;

  if (totalFiles > 1) {
    return {
      inputType: 'multimodal_reasoning',
      detectedMode: 'research',
    };
  }

  if (imageFiles.length === 1) {
    return {
      inputType: hasText ? 'multimodal_vision' : 'vision',
      detectedMode: 'vision',
    };
  }

  if (pdfFiles.length === 1) {
    return {
      inputType: hasText ? 'multimodal_document' : 'document',
      detectedMode: 'document',
    };
  }

  if (docFiles.length === 1) {
    return {
      inputType: hasText ? 'multimodal_document' : 'document',
      detectedMode: 'document',
    };
  }

  if (audioFiles.length === 1) {
    return {
      inputType: hasText ? 'multimodal_audio' : 'audio',
      detectedMode: 'meeting',
    };
  }

  if (videoFiles.length === 1) {
    return {
      inputType: hasText ? 'multimodal_video' : 'video',
      detectedMode: 'study',
    };
  }

  // Text only - check intent
  const p = prompt.toLowerCase();
  let mode: AgentMode = 'general';
  if (p.includes('error') || p.includes('code') || p.includes('bug') || p.includes('python') || p.includes('javascript') || p.includes('fix')) {
    mode = 'developer';
  } else if (p.includes('study') || p.includes('exam') || p.includes('quiz') || p.includes('notes') || p.includes('learn') || p.includes('photosynthesis')) {
    mode = 'study';
  } else if (p.includes('meeting') || p.includes('action items') || p.includes('minutes')) {
    mode = 'meeting';
  }

  return {
    inputType: 'text',
    detectedMode: mode,
  };
}

// Section 5: Central processUserInput() function
export async function processUserInput(params: ProcessUserInputParams): Promise<AgentProcessResult> {
  const {
    prompt,
    files = [],
    history = [],
    selectedLanguage,
    currentMode,
    learningMode = false,
    explanationStyle,
    personality = 'balanced',
    apiKey,
    modelName = 'gemini-flash-latest',
    onStatusChange = () => {},
    onChunk = () => {},
  } = params;

  // 1. Language Resolution (Priority: Explicit selection > Auto-detected > Default)
  const effectiveLanguage = resolveEffectiveLanguage(selectedLanguage, prompt);

  // 2. Hydrate files from server memory cache so previous files have full base64Data
  const hydratedFiles = hydrateFiles(files);

  // 3. Determine exact input type and pipeline
  const { inputType, detectedMode: autoMode } = determineInputType(prompt, hydratedFiles);
  const activeMode = currentMode || autoMode;

  // 4. Update status indicator (purely for UI, not for AI answer!)
  if (inputType === 'multimodal_vision' || inputType === 'vision') {
    onStatusChange('Inspecting visual details with Gemini Vision...');
  } else if (inputType === 'multimodal_document' || inputType === 'document') {
    onStatusChange('Analyzing document contents with Gemini...');
  } else if (inputType === 'multimodal_reasoning') {
    onStatusChange(`Comparing ${hydratedFiles.length} files with Gemini Multimodal...`);
  } else {
    onStatusChange('Synthesizing answer with Gemini...');
  }

  // 5. Execute Gemini Multimodal Request
  const result = await executeGeminiMultimodalRequest({
    prompt,
    inputType,
    files: hydratedFiles,
    history,
    language: effectiveLanguage,
    explanationStyle,
    personality,
    learningMode,
    apiKey,
    modelName,
    onChunk,
    onStatus: onStatusChange,
  });

  return {
    text: result.text,
    detectedMode: activeMode,
    effectiveLanguage,
    inputType,
    modelUsed: result.modelUsed,
    followUpSuggestions: result.followUpSuggestions,
  };
}

// Alias for backward compatibility
export const orchestrateAgentRequest = processUserInput;

import { Message, SupportedLanguage, UploadedFile, ExplanationStyle, PersonalityMode } from '@/lib/types';
import { createGeminiClient, GEMINI_CANDIDATE_MODELS, getGeminiApiKey } from './geminiClient';
import { buildGeminiSystemInstruction } from './geminiPromptBuilder';
import { prepareGeminiInlinePart } from '@/lib/providers/visionProcessor';

export interface ExecuteMultimodalParams {
  prompt: string;
  inputType: string;
  files: UploadedFile[];
  history: Message[];
  language: SupportedLanguage;
  explanationStyle?: ExplanationStyle;
  personality?: PersonalityMode;
  learningMode?: boolean;
  apiKey?: string;
  modelName?: string;
  onChunk: (chunk: string) => void;
  onStatus: (status: string) => void;
}

export interface MultimodalExecutionResult {
  text: string;
  modelUsed: string;
  followUpSuggestions: string[];
}

export async function executeGeminiMultimodalRequest(
  params: ExecuteMultimodalParams
): Promise<MultimodalExecutionResult> {
  const {
    prompt,
    inputType,
    files = [],
    history = [],
    language,
    explanationStyle,
    personality,
    learningMode,
    apiKey,
    modelName,
    onChunk,
    onStatus,
  } = params;

  const validKey = getGeminiApiKey(apiKey);
  const genAI = createGeminiClient(validKey);

  // 1. Build system instruction
  const systemInstruction = buildGeminiSystemInstruction({
    prompt,
    inputType,
    files,
    language,
    explanationStyle,
    personality,
    learningMode,
  });

  // 2. Build contents parts array
  const contentsParts: Array<string | { inlineData: { mimeType: string; data: string } }> = [];

  // Add system instruction as prefix context
  contentsParts.push(`SYSTEM INSTRUCTIONS:\n${systemInstruction}\n\n`);

  // Include recent conversation context (last 6 messages)
  if (history && history.length > 0) {
    const recentHistory = history.slice(-6);
    contentsParts.push('PRIOR CONVERSATION CONTEXT:\n');
    for (const msg of recentHistory) {
      if (msg.content) {
        contentsParts.push(`${msg.role.toUpperCase()}: ${msg.content}\n`);
      }
    }
    contentsParts.push('\n');
  }

  // Attach multimodal file parts
  if (files.length > 0) {
    onStatus(`Attaching ${files.length} multimodal file(s)...`);
    for (const file of files) {
      // 1. Raw Base64 for Image, PDF, Audio, Video
      if (file.base64Data) {
        let mime = file.mimeType || 'application/octet-stream';
        if (file.type === 'pdf') mime = 'application/pdf';
        else if (file.type === 'image' && !mime.startsWith('image/')) mime = 'image/jpeg';
        else if (file.type === 'audio' && !mime.startsWith('audio/')) mime = 'audio/mp3';
        else if (file.type === 'video' && !mime.startsWith('video/')) mime = 'video/mp4';

        const inlinePart = prepareGeminiInlinePart({
          ...file,
          mimeType: mime,
        });

        if (inlinePart) {
          contentsParts.push(inlinePart);
          contentsParts.push(`[Attached ${file.type.toUpperCase()}: "${file.name}"]\n`);
        }
      }

      // 2. Extracted text for Spreadsheets (CSV, XLSX) or Word docs (DOCX, TXT)
      if (file.extractedText) {
        contentsParts.push(
          `\n--- FILE DATA: "${file.name}" (${file.type}) ---\n${file.extractedText.slice(0, 70000)}\n--- END FILE DATA ---\n\n`
        );
      }
    }
  }

  // Append user's exact question
  const userQuery = prompt.trim() || (files.length > 0 ? `Analyze the attached ${files.map((f) => f.name).join(', ')} and provide a clear, comprehensive explanation.` : 'Hello!');
  contentsParts.push(`USER QUESTION: ${userQuery}`);

  // Candidate models: user-requested first, then fallback list
  const candidates = modelName
    ? [modelName, ...GEMINI_CANDIDATE_MODELS.filter((m) => m !== modelName)]
    : GEMINI_CANDIDATE_MODELS;

  let fullResponseText = '';
  let successfulModel = '';

  for (const candidateModel of candidates) {
    try {
      onStatus(`Connecting to Gemini (${candidateModel})...`);
      const model = genAI.getGenerativeModel({ model: candidateModel });

      // Try streaming first
      try {
        const streamResult = await model.generateContentStream(contentsParts);
        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text();
          fullResponseText += chunkText;
          onChunk(chunkText);
        }
      } catch (streamErr: unknown) {
        // If stream throws 503 high demand or SSE failure, fall back to generateContent batch
        const errObj = streamErr as { status?: number; message?: string };
        if (errObj?.status === 503 || errObj?.status === 429 || errObj?.message?.includes('503') || errObj?.message?.includes('429')) {
          onStatus(`Generating with ${candidateModel}...`);
          const batchResult = await model.generateContent(contentsParts);
          const completeText = batchResult.response.text();
          fullResponseText = completeText;

          // Stream words smoothly to client
          const words = completeText.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(' ') + ' ';
            onChunk(chunk);
            await new Promise((r) => setTimeout(r, 20));
          }
        } else {
          throw streamErr;
        }
      }

      if (fullResponseText.trim().length > 0) {
        successfulModel = candidateModel;
        break;
      }
    } catch (err: unknown) {
      const errObj = err as { status?: number; message?: string };
      console.warn(`Model ${candidateModel} failed (${errObj?.status || errObj?.message}), trying next candidate...`);
      if (errObj?.status === 429 || errObj?.message?.includes('429')) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  if (!fullResponseText || fullResponseText.trim().length === 0) {
    throw new Error('All Gemini model candidates failed to generate a response. Please check your network or try again.');
  }

  // Parse smart follow-up suggestions
  let followUpSuggestions: string[] = [];
  if (fullResponseText.includes('[SUGGESTIONS]:')) {
    const parts = fullResponseText.split('[SUGGESTIONS]:');
    fullResponseText = parts[0].trim();
    if (parts[1]) {
      followUpSuggestions = parts[1]
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.includes('[SUGGESTIONS]'));
    }
  }

  return {
    text: fullResponseText,
    modelUsed: successfulModel,
    followUpSuggestions,
  };
}

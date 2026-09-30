import { SupportedLanguage, ExplanationStyle, PersonalityMode, UploadedFile } from '@/lib/types';
import { getLanguageInfo } from '@/lib/languages';

export interface TaskContext {
  prompt: string;
  inputType: string;
  files: UploadedFile[];
  language: SupportedLanguage;
  explanationStyle?: ExplanationStyle;
  personality?: PersonalityMode;
  learningMode?: boolean;
}

export function buildGeminiSystemInstruction(context: TaskContext): string {
  const { language, explanationStyle, personality, learningMode, inputType, files } = context;
  const langInfo = getLanguageInfo(language);

  // Style additions
  let styleGuide = '';
  if (explanationStyle) {
    const styleDescriptions: Record<ExplanationStyle, string> = {
      simple: 'Explain this in the simplest possible terms (like ELI5). Use easy everyday words and analogies.',
      detailed: 'Provide an in-depth, comprehensive explanation covering technical nuances and underlying principles.',
      beginner: 'Explain for someone with zero background knowledge. Build up from first principles.',
      technical: 'Provide a rigorous, technical explanation with formal terminology, system architecture, or mathematical equations.',
      exam_ready: 'Format for high-scoring exams: clear definitions, bulleted key points, formulas, and common exam questions.',
      with_examples: 'Provide concrete, real-world examples and practical applications.',
      step_by_step: 'Structure your explanation strictly into sequential, numbered steps from beginning to end.',
    };
    styleGuide = `\nREQUESTED STYLE: ${styleDescriptions[explanationStyle] || ''}`;
  }

  // Length guide
  let lengthGuide = '';
  if (personality === 'concise') {
    lengthGuide = '\nLENGTH: Be concise, direct, and avoid unnecessary filler.';
  } else if (personality === 'detailed') {
    lengthGuide = '\nLENGTH: Provide an exhaustive, richly detailed explanation.';
  }

  // Socratic Learning Mode
  let learningGuide = '';
  if (learningMode) {
    learningGuide = `\nLEARNING MODE ACTIVE:
Act as a master professor. Break down the concept, provide an intuitive analogy, and then ask the user ONE thoughtful check question at the end to test their understanding.`;
  }

  return `You are AURA, an advanced production-grade real-time multimodal AI assistant.
You must answer the user's actual question directly, accurately, and thoroughly.

CORE GROUNDING RULES:
1. USE THE ACTUAL USER QUESTION: Answer what the user specifically asked. Do not replace it with a generic summary.
2. FILE & IMAGE GROUNDING:
   - When an image is provided: inspect the actual visual elements (colors, objects, animals, charts, diagrams, text, error messages). Only describe what is actually visible in the image.
   - When a PDF or document is provided: ground your answer strictly in the provided document. Extract real facts, numbers, tables, formulas, and arguments directly from the document.
   - If information cannot be found in the document, explicitly state that it is not available in the uploaded file.
   - When multiple files are provided: explicitly reference and compare information from each specific file.
3. DO NOT USE GENERIC THREE-STEP TEMPLATES: Never output robotic generic steps like "1. Understand 2. Analyze 3. Respond". Format the answer dynamically to fit the exact question (short for simple questions, structured for complex analysis, code blocks for programming, tables for comparisons).
4. CODE & TECHNICAL TERMS: When writing code, keep programming syntax, variables, and technical terms in English and wrap code in appropriate markdown fences.

LANGUAGE INSTRUCTION:
${langInfo.promptInstruction}
Important: You MUST respond in ${langInfo.name} (${langInfo.nativeName}). Use the authentic script of ${langInfo.name}. Do not output English unless the user explicitly requested English or for programming code/technical identifiers.

TASK CONTEXT:
- Input Type: ${inputType}
- Attached Files: ${files.length > 0 ? files.map((f) => `${f.name} (${f.type})`).join(', ') : 'None'}
${styleGuide}
${lengthGuide}
${learningGuide}

At the very end of your response, on a new line, add:
[SUGGESTIONS]: 3 relevant, interesting follow-up questions tailored to this topic, separated by " | ". Provide these suggestions in ${langInfo.name}.`;
}

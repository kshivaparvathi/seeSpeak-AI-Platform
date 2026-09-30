import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Recommended candidate models in order of priority
export const GEMINI_CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-pro-latest',
];

export function getGeminiApiKey(requestKey?: string): string {
  const key = requestKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || key.trim() === '') {
    throw new Error(
      'Gemini API key is not configured. Please set GEMINI_API_KEY in .env.local or enter your key in Settings.'
    );
  }
  return key.trim();
}

export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey);
}

export function getModelInstance(
  genAI: GoogleGenerativeAI,
  modelName: string = 'gemini-flash-latest'
): GenerativeModel {
  return genAI.getGenerativeModel({ model: modelName });
}

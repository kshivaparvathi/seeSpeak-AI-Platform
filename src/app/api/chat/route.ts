import { NextRequest } from 'next/server';
import { orchestrateAgentRequest } from '@/lib/agentOrchestrator';
import { AgentMode, ExplanationStyle, Message, PersonalityMode, SupportedLanguage, UploadedFile } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      files = [],
      history = [],
      selectedLanguage = 'auto',
      currentMode,
      learningMode = false,
      explanationStyle,
      personality = 'balanced',
      provider = 'gemini',
      modelName,
    } = body as {
      prompt: string;
      files: UploadedFile[];
      history: Message[];
      selectedLanguage: SupportedLanguage;
      currentMode?: AgentMode;
      learningMode?: boolean;
      explanationStyle?: ExplanationStyle;
      personality?: PersonalityMode;
      provider?: 'gemini' | 'openai' | 'builtin';
      modelName?: string;
    };

    // Check user-provided API key from header or body or process.env
    const headerApiKey = req.headers.get('x-api-key');
    const apiKey = headerApiKey || body.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Create a streaming SSE response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (data: Record<string, unknown>) => {
      const payload = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    };

    // Run orchestrator asynchronously while streaming events
    (async () => {
      try {
        const result = await orchestrateAgentRequest({
          prompt,
          files,
          history,
          selectedLanguage,
          currentMode,
          learningMode,
          explanationStyle,
          personality,
          apiKey,
          provider,
          modelName,
          onStatusChange: async (status: string) => {
            await sendEvent({ type: 'status', statusMessage: status });
          },
          onChunk: async (chunk: string) => {
            await sendEvent({ type: 'delta', content: chunk });
          },
        });

        await sendEvent({
          type: 'complete',
          text: result.text,
          detectedMode: result.detectedMode,
          effectiveLanguage: result.effectiveLanguage,
          followUpSuggestions: result.followUpSuggestions,
          inputType: result.inputType,
          modelUsed: result.modelUsed,
        });
      } catch (err: unknown) {
        console.error('Streaming error in chat route:', err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'The AI service is temporarily unavailable. Please try again.';
        await sendEvent({
          type: 'error',
          error: errorMsg,
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Chat endpoint setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to initialize agent request.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

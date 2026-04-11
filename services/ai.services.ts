import {
  CLOUDFLARE_AI_GATEWAY_API_KEY,
  CLOUDFLARE_AI_GATEWAY_ENDPOINT,
} from '@/lib/env';
import { toolDefinitions } from '@/services/tool.services';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import {
  TOKEN_LIMIT_THRESHOLD,
  CHAT_MODEL_ID,
  IMAGE_MODEL_ID,
  TTS_MODEL_ID,
  ASR_MODEL_ID,
  STT_MODEL_ID,
} from '@/lib/constants';
// Integrated s3Service for centralized media storage
import { s3Service } from '@/services/s3.services';

export interface AiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | unknown;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
  reasoning?: string;
}

export interface StreamOptions {
  isVoiceMode?: boolean;
}

class AiService {
  private readonly gatewayEndpoint: string;
  private readonly gatewayKey: string;

  constructor() {
    this.gatewayEndpoint = CLOUDFLARE_AI_GATEWAY_ENDPOINT || '';
    this.gatewayKey = CLOUDFLARE_AI_GATEWAY_API_KEY || '';

    if (!this.gatewayEndpoint || !this.gatewayKey) {
      console.warn(
        '[AiService] Warning: Cloudflare AI Gateway configuration is missing.',
      );
    }
  }

  /**
   * Roughly estimates the number of tokens in a string or object.
   * This internal heuristic ensures we stay within context limits without external dependencies.
   */
  private estimateTokens(text: string | unknown[]): number {
    if (typeof text !== 'string') {
      return Math.ceil(JSON.stringify(text).length / 2);
    }
    // Safe, conservative estimate (2 chars per token)
    return Math.ceil(text.length / 2);
  }

  /**
   * Estimates the total token count for a list of conversation messages.
   */
  private estimateMessageTokens(messages: AiMessage[]): number {
    return messages.reduce((acc, msg) => {
      let count = this.estimateTokens((msg.content as string) || '');
      if (msg.tool_calls) count += this.estimateTokens(msg.tool_calls);
      return acc + count;
    }, 0);
  }

  /**
   * Transforms the Gateway endpoint into a WebSocket URL for Deepgram Flux STT.
   * Includes the model=flux parameter in the query string.
   */
  public getFluxWorkerUrl(token: string): string {
    const wsBaseUrl = this.gatewayEndpoint.replace(/^http/, 'ws');
    return `${wsBaseUrl}?model=${STT_MODEL_ID}&token=${token}&encoding=linear16&sample_rate=16000`;
  }

  /**
   * Fetches a short-lived signed token from the AI Gateway for secure WebSocket auth.
   */
  public async getShortLivedToken(): Promise<string> {
    const response = await fetch(`${this.gatewayEndpoint}/short-lived-token`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.gatewayKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch short-lived token: ${response.status}`);
    }

    const { token } = await response.json();
    return token;
  }

  /**
   * Private helper to manage context window.
   */
  private manageContext(messages: AiMessage[]): AiMessage[] {
    const systemMsg = messages.find((m) => m.role === 'system');
    const otherMsgs = messages.filter((m) => m.role !== 'system');

    while (
      this.estimateMessageTokens(
        [systemMsg, ...otherMsgs].filter((m): m is AiMessage => !!m),
      ) > TOKEN_LIMIT_THRESHOLD &&
      otherMsgs.length > 0
    ) {
      otherMsgs.shift();
    }

    return [systemMsg, ...otherMsgs].filter(
      (m): m is AiMessage => m !== undefined,
    );
  }

  /**
   * Streams text data from the AI model (Kimi K2.5) in SSE format.
   */
  public async streamText(messages: AiMessage[], options?: StreamOptions) {
    const encoder = new TextEncoder();

    return new ReadableStream({
      start: async (controller) => {
        const sendChunk = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        let systemPrompt = SYSTEM_PROMPT;
        if (options?.isVoiceMode) {
          systemPrompt += `\n\n[VOICE MODE] Respond in plain text only. No markdown.`;
        }

        const currentMessages = this.manageContext([
          { role: 'system', content: systemPrompt },
          ...messages,
        ] as AiMessage[]);

        const formattedTools = Object.entries(toolDefinitions).map(
          ([name, tool]) => ({
            type: 'function',
            function: {
              name,
              description: tool.description,
              parameters: tool.parameters,
            },
          }),
        );

        try {
          const response = await fetch(this.gatewayEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.gatewayKey}`,
            },
            body: JSON.stringify({
              model: CHAT_MODEL_ID,
              messages: currentMessages,
              tools: formattedTools,
              stream: true,
              temperature: 0.7,
            }),
          });

          if (!response.ok) throw new Error(`Gateway Error: ${response.status}`);

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader available');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
              if (trimmedLine.startsWith('data: ')) {
                const data = JSON.parse(trimmedLine.slice(6));
                const delta = data.choices[0].delta;

                if (delta.content) {
                  sendChunk({ type: 'content', delta: delta.content });
                }
                if (delta.tool_calls) {
                  sendChunk({
                    type: 'tool_call_delta',
                    delta: delta.tool_calls,
                  });
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  /**
   * Generates a non-streaming text response from Kimi K2.5.
   */
  public async generateText(messages: AiMessage[]) {
    const response = await fetch(this.gatewayEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.gatewayKey}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL_ID,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error('Text generation failed');
    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Generates high-quality images via the FLUX.1 [schnell] model.
   */
  public async generateImage(prompt: string, width = 1024, height = 1024) {
    const response = await fetch(this.gatewayEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.gatewayKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL_ID,
        prompt,
        width,
        height,
        num_inference_steps: 4, // Optimized for flux-1-schnell
      }),
    });

    if (!response.ok) throw new Error('Image generation failed');
    return response.json();
  }

  /**
   * Converts text to speech using Aura-2 and persists to S3/R2 storage.
   */
  public async textToSpeech(text: string, speaker = 'luna') {
    const response = await fetch(this.gatewayEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.gatewayKey}`,
      },
      body: JSON.stringify({
        model: TTS_MODEL_ID,
        text,
        speaker,
      }),
    });

    if (!response.ok) throw new Error('TTS failed');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Persist and get a secure URL from our primary storage (S3/R2)
    const timestamp = Date.now();
    const key = `audio/speech-${timestamp}.mp3`;
    const audioUrl = await s3Service.uploadFile(buffer, key, 'audio/mpeg');

    return {
      success: true,
      audioUrl,
      text,
    };
  }

  /**
   * Transcribes audio data to text using Whisper Large v3 Turbo.
   */
  public async transcribeAudio(audioBuffer: Buffer) {
    const response = await fetch(this.gatewayEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.gatewayKey}`,
      },
      body: JSON.stringify({
        model: ASR_MODEL_ID,
        audio: {
          body: audioBuffer.toString('base64'),
          contentType: 'audio/mpeg',
        },
        language: 'en',
      }),
    });

    if (!response.ok) throw new Error('Transcription failed');
    const data = (await response.json()) as { text: string };
    return data.text;
  }
}

export const aiService = new AiService();

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
import { s3Service } from '@/services/s3.services';
import { nanoid } from 'nanoid';
import { fetchWithRetry } from '@/lib/utils';

export type AiMessageContent =
  | string
  | (
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    )[];

export interface AiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: AiMessageContent;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
  reasoning?: string;
}

export interface StreamOptions {
  isVoiceMode?: boolean;
  sessionId?: string;
  onFinish?: (result: {
    content: string;
    reasoning?: string;
    toolInvocations: any[];
  }) => Promise<void>;
  abortSignal?: AbortSignal;
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
   * Transforms the Gateway endpoint into a WebSocket URL for Deepgram Flux STT.
   */
  public getFluxWorkerUrl(token: string): string {
    const wsBaseUrl = this.gatewayEndpoint.replace(/^http/, 'ws');
    return `${wsBaseUrl}?model=${STT_MODEL_ID}&token=${token}&encoding=linear16&sample_rate=16000`;
  }

  /**
   * Fetches a short-lived signed token from the AI Gateway.
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
   * Advanced Vision Pre-processing
   * Automatically converts external URLs to Base64 and S3 keys to signed URLs.
   * Enforces a 2-image limit for efficiency.
   */
  public async processMessages(messages: AiMessage[]): Promise<AiMessage[]> {
    return Promise.all(
      messages.map(async (msg) => {
        if (typeof msg.content === 'string') return msg;
        if (!Array.isArray(msg.content)) return msg;

        let imageCount = 0;
        const processedContent = await Promise.all(
          msg.content.map(async (part) => {
            if (part.type === 'text') return part;
            if (part.type === 'image_url') {
              const url = part.image_url.url;
              if (!url || url.startsWith('data:')) return part;

              if (imageCount >= 2) return null; // Enforce limit
              imageCount++;

              try {
                if (url.startsWith('http')) {
                  console.log(`[AiService] Proxying image to Base64 (Robust): ${url.slice(0, 50)}...`);
                  const imageRes = await fetchWithRetry(url);
                  if (!imageRes.ok) throw new Error(`HTTP ${imageRes.status}`);
                  const buffer = Buffer.from(await imageRes.arrayBuffer());
                  const base64 = buffer.toString('base64');
                  const pathname = new URL(url).pathname;
                  const ext = pathname.split('.').pop()?.toLowerCase() || 'png';
                  const mimeType =
                    ext === 'jpg' || ext === 'jpeg'
                      ? 'image/jpeg'
                      : `image/${ext}`;
                  return {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${base64}` },
                  };
                } else {
                  // Project Path: Generate a signed URL for AI access
                  const signedUrl = await s3Service.getSignedUrl(url);
                  return {
                    type: 'image_url',
                    image_url: { url: signedUrl },
                  };
                }
              } catch (e) {
                return null;
              }
            }
            return part;
          }),
        );

        let finalContent = processedContent.filter((p): p is any => {
          if (p === null) return false;
          // Use type assertion to satisfy TS that text exists when type is 'text'
          if (p.type === 'text' && !(p as { text: string }).text.trim()) return false; 
          return true;
        });

        // Safety: 'not enough values to unpack' often happens if content is empty or malformed.
        // If content is empty or only has images with no text, add a placeholder prompt.
        const hasText = finalContent.some(p => p.type === 'text');
        const hasImage = finalContent.some(p => p.type === 'image_url');
        
        if (!hasText && hasImage) {
          finalContent.unshift({ type: 'text', text: 'Please analyze this image.' });
        } else if (finalContent.length === 0) {
          finalContent.push({ type: 'text', text: '...' });
        }

        // Strict Filtering: Only include recognized properties to avoid 'unpacking' errors in the Gateway
        const sanitizedMsg: any = {
          role: msg.role,
          content: finalContent,
        };

        if (msg.name) sanitizedMsg.name = msg.name;
        if (msg.tool_call_id) sanitizedMsg.tool_call_id = msg.tool_call_id;
        if (msg.tool_calls) sanitizedMsg.tool_calls = msg.tool_calls;

        return sanitizedMsg as AiMessage;
      }),
    );
  }

  /**
   * Streams text data from the AI model (Kimi K2.5) with multi-turn tool calling support.
   */
  public async streamText(messages: AiMessage[], options?: StreamOptions) {
    const { sessionId, onFinish, abortSignal } = options || {};
    const encoder = new TextEncoder();

    return new ReadableStream({
      start: async (controller) => {
        const sendChunk = (data: Record<string, any>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        let systemPrompt = SYSTEM_PROMPT;
        if (options?.isVoiceMode) {
          systemPrompt += `\n\n[VOICE MODE] Respond in plain text only. No markdown.`;
        }

        // Process messages to handle vision stability (Base64 conversion)
        const processedHistory = await this.processMessages(messages);
        const currentMessages = this.manageContext([
          { role: 'system', content: systemPrompt },
          ...processedHistory,
        ] as AiMessage[]);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.gatewayKey}`,
        };

        if (sessionId) {
          headers['x-session-affinity'] = sessionId;
        }

        let finalContent = '';
        let finalReasoning = '';
        const finalToolInvocations: any[] = [];

        try {
          let toolCallsAttempt = 0;
          const contextHistory: any[] = [...currentMessages];

          while (toolCallsAttempt < 5) {
            // Limited to 5 tool call rounds for safety
            if (abortSignal?.aborted) break;

            const formattedTools = Object.entries(toolDefinitions).map(([name, tool]) => {
              const cleanParams = JSON.parse(JSON.stringify(tool.parameters));
              if (cleanParams.properties) {
                Object.keys(cleanParams.properties).forEach(key => {
                  delete cleanParams.properties[key].default;
                });
              }
              return {
                type: 'function',
                function: {
                  name,
                  description: tool.description,
                  parameters: cleanParams,
                },
              };
            });

            const payload = {
              model: CHAT_MODEL_ID,
              messages: contextHistory,
              tools: formattedTools.length > 0 ? formattedTools : undefined,
              stream: true,
              temperature: 0.7,
            };

            const response = await fetch(this.gatewayEndpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
              signal: abortSignal,
            });

            if (!response.ok) {
              const errorBody = await response.text();
              throw new Error(`Gateway Error: ${response.status} - ${errorBody.slice(0, 100)}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            const textDecoder = new TextDecoder();
            let buffer = '';
            let assistantContent = '';
            let toolCalls: any[] = [];

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += textDecoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                if (trimmedLine.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(trimmedLine.slice(6));
                    const delta = data.choices?.[0]?.delta;

                    if (delta) {
                      if (delta.reasoning_content) {
                        finalReasoning += delta.reasoning_content;
                        sendChunk({
                          type: 'reasoning',
                          delta: delta.reasoning_content,
                        });
                      }
                      if (delta.content) {
                        assistantContent += delta.content;
                        finalContent += delta.content;
                        sendChunk({ type: 'content', delta: delta.content });
                      }
                      if (delta.tool_calls) {
                        delta.tool_calls.forEach((tc: any) => {
                          const idx = tc.index;
                          if (!toolCalls[idx]) {
                            toolCalls[idx] = {
                              id: tc.id,
                              type: 'function',
                              function: {
                                name: tc.function.name,
                                arguments: '',
                              },
                            };
                          }
                          if (tc.function.arguments) {
                            toolCalls[idx].function.arguments +=
                              tc.function.arguments;
                          }
                        });
                      }
                    }
                  } catch (e) {
                    continue; // Skip invalid JSON
                  }
                }
              }
            }

            toolCalls = toolCalls.filter(Boolean);
            contextHistory.push({
              role: 'assistant',
              content: assistantContent || '', // Ensure empty string instead of null/undefined
              tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            });

            if (toolCalls.length > 0) {
              toolCallsAttempt++;
              for (const tc of toolCalls) {
                const toolName = tc.function.name;
                const tool = (toolDefinitions as any)[toolName];
                let args = {};
                try {
                  args = JSON.parse(tc.function.arguments || '{}');
                } catch (e) {}

                sendChunk({ type: 'tool_call', id: tc.id, name: toolName, args: tc.function.arguments });

                  if (tool) {
                    try {
                      const result = await tool.execute(args);
                      sendChunk({ type: 'tool_result', id: tc.id, name: toolName, result });
                      finalToolInvocations.push({
                        toolCallId: tc.id,
                        toolName,
                        args,
                        result,
                      });
                    contextHistory.push({
                      role: 'tool',
                      tool_call_id: tc.id,
                      name: toolName,
                      content:
                        typeof result === 'string'
                          ? result
                          : JSON.stringify(result),
                    });
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`[AiService] Tool execution failed (${toolName}):`, err);
                    sendChunk({ type: 'tool_result', id: tc.id, name: toolName, error: msg });
                    contextHistory.push({
                      role: 'tool',
                      tool_call_id: tc.id,
                      name: toolName,
                      content: `Error: ${msg}`,
                    });
                  }
                } else {
                  sendChunk({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: 'Error: Tool not found',
                  });
                }
              }
            } else {
              break; // No more tool calls, finish the interaction
            }
          }

          if (onFinish) {
            await onFinish({
              content: finalContent,
              reasoning: finalReasoning || undefined,
              toolInvocations: finalToolInvocations,
            });
          }

          controller.close();
        } catch (error) {
          console.error('[AiService] Streaming error:', error);
          controller.error(error);
        }
      },
    });
  }

  /**
   * Generates a non-streaming text response.
   */
  public async generateText(messages: AiMessage[], sessionId?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.gatewayKey}`,
    };

    if (sessionId) {
      headers['x-session-affinity'] = sessionId;
    }

    const processedMessages = await this.processMessages(messages);

    const response = await fetch(this.gatewayEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: CHAT_MODEL_ID,
        messages: processedMessages,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error('Text generation failed');
    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Structured JSON Generation
   */
  public async generateObject<T>(
    messages: AiMessage[],
    options?: { sessionId?: string },
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.gatewayKey}`,
    };

    if (options?.sessionId) {
      headers['x-session-affinity'] = options.sessionId;
    }

    const processedMessages = await this.processMessages(messages);

    const response = await fetch(this.gatewayEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: CHAT_MODEL_ID,
        messages: processedMessages,
        response_format: { type: 'json_object' },
        stream: false,
      }),
    });

    if (!response.ok) throw new Error('Object generation failed');

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in JSON response');

    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('[AiService] JSON Parse Error. Content:', content);
      throw new Error(`Model returned invalid JSON: ${content.slice(0, 100)}`);
    }
  }

  /**
   * Helper to manage context window.
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

  private estimateTokens(content: AiMessageContent): number {
    if (typeof content === 'string') return Math.ceil(content.length / 4);
    if (Array.isArray(content)) {
      return content.reduce((acc, part) => {
        if (part.type === 'text') return acc + Math.ceil(part.text.length / 4);
        if (part.type === 'image_url') return acc + 1000;
        return acc;
      }, 0);
    }
    return 0;
  }

  private estimateMessageTokens(messages: AiMessage[]): number {
    return messages.reduce((acc, msg) => {
      let count = this.estimateTokens(msg.content);
      if (msg.tool_calls)
        count += Math.ceil(JSON.stringify(msg.tool_calls).length / 4);
      return acc + count;
    }, 0);
  }

  /**
   * Transcribes audio using Whisper.
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

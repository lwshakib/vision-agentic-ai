import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  GOOGLE_API_KEY,
} from '@/lib/env';
import { toolDefinitions } from '@/services/tool.services';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import {
  TOKEN_LIMIT_THRESHOLD,
  CHAT_MODEL_ID,
} from '@/lib/constants';
import { s3Service } from '@/services/s3.services';
import { fetchWithRetry } from '@/lib/utils';
import { nanoid } from 'nanoid';

export type AiMessageContent =
  | string
  | (
      | { type: 'text'; text: string }
      | { type: 'file'; file: { mimeType?: string; data?: string }; url?: string }
    )[];

export interface AiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: AiMessageContent;
  name?: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
  reasoning?: string;
}

export interface StreamOptions {
  isVoiceMode?: boolean;
  sessionId?: string;
  onFinish?: (result: {
    content: string;
    reasoning?: string;
    toolInvocations: Record<string, unknown>[];
  }) => Promise<void>;
  abortSignal?: AbortSignal;
}

class AiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    if (!GOOGLE_API_KEY) {
      console.warn(
        '[AiService] Warning: GOOGLE_API_KEY is missing.',
      );
    }
    this.ai = new GoogleGenAI({
      apiKey: GOOGLE_API_KEY || '',
    });
  }

  /**
   * Translates local AiMessage to Gemini content format.
   */
  private async formatToGemini(messages: AiMessage[]): Promise<any[]> {
    const geminiMsgs: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue; // Handled in config

      const parts: any[] = [];

      // 1. Handle Content (Text or Multimodal)
      if (typeof msg.content === 'string' && msg.content.trim()) {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text' && part.text.trim()) {
            parts.push({ text: part.text });
          } else if (part.type === 'file') {
            const fileData = part.file;
            if (fileData.data) {
              // Case 1: Direct base64 data provided
              parts.push({
                inlineData: {
                  mimeType: fileData.mimeType,
                  data: fileData.data,
                },
              });
            } else {
              const url = part.url;
              if (url) {
                // Case 2: Remote URL provided (e.g. from S3)
                try {
                  const res = await fetchWithRetry(url);
                  if (!res.ok) throw new Error(`Failed to fetch file from URL: ${url}`);
                  const buffer = Buffer.from(await res.arrayBuffer());
                  const contentType = res.headers.get('content-type') || fileData.mimeType || 'application/octet-stream';
                  parts.push({
                    inlineData: {
                      mimeType: contentType,
                      data: buffer.toString('base64'),
                    },
                  });
                } catch (e) {
                  console.error(`[AiService] Failed to fetch remote file:`, e);
                }
              }
            }
          }
        }
      }

      // 2. Handle Tool Calls (Assistant's side)
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        msg.tool_calls.forEach((tc) => {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments || '{}'),
              id: tc.id,
            },
          });
        });
      }

      // 3. Handle Tool Responses (User's side)
      if (msg.role === 'tool') {
        parts.push({
          functionResponse: {
            name: msg.name,
            response: { result: msg.content },
            id: msg.tool_call_id,
          },
        });
      }

      // 🛡️ Safety: Skip if no valid parts were generated for this turn
      if (parts.length === 0) continue;

      const role = msg.role === 'assistant' ? 'model' : 'user';
      const lastMsg = geminiMsgs[geminiMsgs.length - 1];

      // 🔄 Group consecutive roles to satisfy Gemini's alternating roles requirement
      if (lastMsg && lastMsg.role === role) {
        lastMsg.parts.push(...parts);
      } else {
        geminiMsgs.push({ role, parts });
      }
    }

    return geminiMsgs;
  }

  /**
   * Helper to map ToolDefinition to Gemini functionDeclarations.
   */
  private getTools() {
    const functionDeclarations = Object.entries(toolDefinitions).map(([name, tool]) => {
      return {
        name,
        description: tool.description,
        parametersJsonSchema: zodToJsonSchema(tool.schema as any),
      };
    });

    return [{ functionDeclarations }];
  }

  /**
   * Streams text data from the AI model (Gemini) with multi-turn tool calling support.
   */
  public async streamText(messages: AiMessage[], options?: StreamOptions) {
    const { onFinish, abortSignal } = options || {};
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
          systemPrompt += `\n\n[VOICE MODE ACTIVE] CRITICAL SYSTEM INSTRUCTION: You are currently speaking through a Text-To-Speech engine. You MUST format your ENTIRE response as plain spoken text natively readable by humans. DO NOT use ANY Markdown formatting whatsoever. Respond naturally as if you are speaking.`;
        }

        const contents = await this.formatToGemini(messages);
        if (contents.length === 0) {
          throw new Error('[AiService] No valid message content to send to Gemini.');
        }

        const tools = this.getTools();

        // Separate the last message from history for the chat API
        const history = contents.slice(0, -1);
        const lastMessage = contents[contents.length - 1];

        let finalContent = '';
        let finalReasoning = '';
        const finalToolInvocations: Record<string, unknown>[] = [];

        try {
          // Initialize Chat Session
          const chat = this.ai.chats.create({
            model: CHAT_MODEL_ID,
            history: history,
            config: {
              systemInstruction: systemPrompt,
              tools,
              thinkingConfig: {
                includeThoughts: true,
                thinkingLevel: ThinkingLevel.LOW,
              }
            },
          });

          let toolCallsAttempt = 0;
          let currentInput = lastMessage;

          while (toolCallsAttempt < 5) {
            if (abortSignal?.aborted) break;

            // 🚀 Use sendMessageStream for a better real-time experience
            const partsToSend = ((currentInput as any).parts || (Array.isArray(currentInput) ? currentInput : [currentInput])).filter(Boolean);
            if (partsToSend.length === 0) break;
            
            const stream = await chat.sendMessageStream({
              message: partsToSend as any
            });

            let turnToolCalls: any[] = [];

            for await (const chunk of stream) {
              if (abortSignal?.aborted) break;

              // 1. Stream regular text content using the SDK helper
              if (chunk.text) {
                finalContent += chunk.text;
                sendChunk({ type: 'content', delta: chunk.text });
              }

              // 2. Handle Thoughts (Reasoning) explicitly
              const candidate = chunk.candidates?.[0];
              if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                  if (part.thought && part.text) {
                    finalReasoning += part.text;
                    sendChunk({ type: 'reasoning', delta: part.text });
                  }
                }
              }

              // 3. Accumulate tool calls for the next turn
              if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                turnToolCalls.push(...chunk.functionCalls);
              }
            }

            if (abortSignal?.aborted) break;

            if (turnToolCalls.length === 0) {
              break;
            }

            // Execute collected tool calls in parallel
            toolCallsAttempt++;
            const functionResponseParts: any[] = [];
            for (const fc of turnToolCalls) {
              const { name, args, id } = fc;
              
              if (!name) {
                functionResponseParts.push({
                  functionResponse: {
                    name: 'unknown',
                    response: { error: 'Missing function name' },
                    id: id || '',
                  },
                });
                continue;
              }

              const tool = (toolDefinitions as any)[name];

              sendChunk({
                type: 'tool_call',
                id: id || `call_${nanoid()}`,
                name,
                args: JSON.stringify(args),
              });

              if (tool) {
                  try {
                    const result = await tool.execute(args);
                    sendChunk({
                      type: 'tool_result',
                      id: id,
                      name,
                      result,
                    });
                    finalToolInvocations.push({
                      toolCallId: id,
                      toolName: name,
                      args,
                      result,
                    });
                    functionResponseParts.push({
                      functionResponse: {
                        name: name || 'unknown',
                        response: { result },
                        id: id || '',
                      },
                    });
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    sendChunk({
                      type: 'tool_result',
                      id: id,
                      name,
                      error: msg,
                    });
                    functionResponseParts.push({
                      functionResponse: {
                        name,
                        response: { error: msg },
                        id,
                      },
                    });
                  }
                } else {
                  functionResponseParts.push({
                    functionResponse: {
                      name,
                      response: { error: 'Tool not found' },
                      id,
                    },
                  });
                }
              }

              // Set the tool responses as the input for the next round
              currentInput = {
                role: 'user',
                parts: functionResponseParts,
              };
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
          console.error('[AiService] Gemini error:', error);
          controller.error(error);
        }
      },
    });
  }

  /**
   * Generates a non-streaming text response.
   */
  public async generateText(messages: AiMessage[]) {
    const contents = await this.formatToGemini(messages);
    const history = contents.slice(0, -1);
    const lastMessage = contents[contents.length - 1];

    const tools = this.getTools();

    const chat = this.ai.chats.create({
      model: CHAT_MODEL_ID,
      history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools,
      },
    });

    const partsToSend = ((lastMessage as any).parts || [lastMessage]).filter(Boolean);
    if (partsToSend.length === 0) throw new Error('No content to send');

    const response = await chat.sendMessage({
      message: partsToSend as any
    });
    return response.text;
  }

  /**
   * Structured JSON Generation
   */
  public async generateObject<T>(
    messages: AiMessage[],
    options?: { schema?: any },
  ): Promise<T> {
    const contents = await this.formatToGemini(messages);
    const history = contents.slice(0, -1);
    const lastMessage = contents[contents.length - 1];

    const config: any = {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      tools: this.getTools(),
    };

    if (options?.schema) {
      if (options.schema instanceof z.ZodType) {
        // Use standard JSON Schema for Zod
        config.responseJsonSchema = zodToJsonSchema(options.schema as any);
      } else {
        // Use Gemini-specific schema format
        config.responseSchema = options.schema;
      }
    }

    const chat = this.ai.chats.create({
      model: CHAT_MODEL_ID,
      history,
      config,
    });

    const partsToSend = ((lastMessage as any).parts || [lastMessage]).filter(Boolean);
    if (partsToSend.length === 0) throw new Error('No content to send');

    const response = await chat.sendMessage({
      message: partsToSend as any
    });
    const content = response.text;
    if (!content) throw new Error('No content in JSON response');

    try {
      return JSON.parse(content);
    } catch {
      throw new Error(`Model returned invalid JSON: ${content.slice(0, 100)}`);
    }
  }

  /**
   * Transcribes audio using Gemini (Multimodal).
   * Note: Gemini can handle audio directly in generateContent.
   */
  public async transcribeAudio(audioBuffer: Buffer) {
    const response = await this.ai.models.generateContent({
      model: CHAT_MODEL_ID,
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Transcribe this audio exactly as spoken.' },
            {
              inlineData: {
                mimeType: 'audio/mpeg',
                data: audioBuffer.toString('base64'),
              },
            },
          ],
        },
      ],
    });

    return response.text;
  }
}

export const aiService = new AiService();

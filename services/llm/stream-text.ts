import { ThinkingLevel } from '@google/genai';
import { nanoid } from 'nanoid';
import { CHAT_MODEL_ID } from '@/lib/constants';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { toolDefinitions } from '@/services/tools';
import { googleGenAi } from './client';
import { formatToGemini, getTools } from './utils';
import { AiMessage, StreamOptions } from './types';

/**
 * Streams text data from the AI model (Gemini) with multi-turn tool calling support.
 */
export async function streamText(messages: AiMessage[], options?: StreamOptions) {
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

      const contents = await formatToGemini(messages);
      if (contents.length === 0) {
        throw new Error('[llm] No valid message content to send to Gemini.');
      }

      const tools = getTools();

      // Separate the last message from history for the chat API
      const history = contents.slice(0, -1);
      const lastMessage = contents[contents.length - 1];

      let finalContent = '';
      let finalReasoning = '';
      const finalToolInvocations: Record<string, unknown>[] = [];

      try {
        // Initialize Chat Session
        const chat = googleGenAi.chats.create({
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
        console.error('[llm] Gemini error:', error);
        controller.error(error);
      }
    },
  });
}

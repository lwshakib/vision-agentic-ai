import { ThinkingLevel, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { nanoid } from 'nanoid';
import { CHAT_MODEL_ID } from './constants';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { toolDefinitions } from './tools';
import { googleGenAi } from './client';
import { formatToGemini, getTools } from './utils';
import { AiMessage, StreamOptions } from './types';

/**
 * Streams text data from the AI model (Gemini) with multi-turn tool calling support.
 */
export async function streamText(
  messages: AiMessage[],
  options?: StreamOptions,
) {
  const { onFinish, abortSignal } = options || {};
  const encoder = new TextEncoder();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const sendChunk = (data: Record<string, unknown>) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (e) {
      console.error('[llm] Failed to write chunk:', e);
    }
  };

  // ⚡ Background process
  (async () => {
    try {
      // 🚀 Force-flush prelude: Some proxies/browsers buffer until ~1KB is received.
      // We send a tiny invisible comment and 1KB of whitespace to wake up the stream.
      writer.write(encoder.encode(`: flush\n${' '.repeat(1024)}\n\n`));

      const contents = await formatToGemini(messages);
      const tools = getTools();
      const history = contents.slice(0, -1);
      const lastMessage = contents[contents.length - 1];

      const chat = googleGenAi.chats.create({
        model: CHAT_MODEL_ID,
        history,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools,
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: ThinkingLevel.LOW,
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
          ],
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      });

      let finalContent = '';
      let finalReasoning = '';
      let finalThoughtSignature: string | undefined = undefined;
      const finalToolInvocations: Record<string, unknown>[] = [];
      let toolCallsAttempt = 0;
      let currentInput = lastMessage;

      const TURN_MESSAGES = [
        'Searching for information...',
        'Analyzing results...',
        'Refining response...',
        'Finalizing details...',
        'Polishing answer...',
      ];

      while (toolCallsAttempt < 5) {
        if (abortSignal?.aborted) break;
        const partsToSend = (
          (currentInput as any).parts || [currentInput]
        ).filter(Boolean);

        if (toolCallsAttempt > 0) {
          const msg =
            TURN_MESSAGES[Math.min(toolCallsAttempt, TURN_MESSAGES.length - 1)];
          sendChunk({ type: 'status', message: msg });
        }

        const stream = await chat.sendMessageStream({
          message: partsToSend as any,
        });
        const turnToolCalls: any[] = [];

        for await (const chunk of stream) {
          if (abortSignal?.aborted) break;

          const candidate = chunk.candidates?.[0];
          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              // 1. Handle Thoughts / Reasoning
              if (part.thought) {
                const delta = part.text || '';
                if (delta) {
                  finalReasoning += delta;
                  sendChunk({ type: 'reasoning', delta });
                }
              }

              // 2. Handle Text (excluding thoughts)
              if (part.text && !part.thought) {
                const delta = part.text;
                finalContent += delta;
                sendChunk({ type: 'content', delta });
              }

              // 3. Handle Tool Calls
              if (part.functionCall) {
                const fc = part.functionCall;
                // Only notify once per tool call ID
                if (
                  !finalToolInvocations.some((ti) => ti.toolCallId === fc.id)
                ) {
                  sendChunk({
                    type: 'tool_call',
                    id: fc.id,
                    name: fc.name,
                    args: JSON.stringify(fc.args),
                  });
                }
              }

              // 4. Handle Thought Signature
              if (part.thoughtSignature) {
                finalThoughtSignature = part.thoughtSignature;
                sendChunk({
                  type: 'thought_signature',
                  delta: part.thoughtSignature,
                });
              }
            }
          }

          // Accumulate function calls for execution at the end of the turn
          if (chunk.functionCalls) {
            for (const fc of chunk.functionCalls) {
              if (!turnToolCalls.find((tc) => tc.id === fc.id)) {
                turnToolCalls.push(fc);
              }
            }
          }
        }

        if (abortSignal?.aborted || turnToolCalls.length === 0) break;

        toolCallsAttempt++;
        const turnResults = await Promise.all(
          turnToolCalls.map(async (fc) => {
            const { name, args, id } = fc;
            const callId = id || `call_${nanoid()}`;

            // Re-send tool_call chunk to ensure UI has it (in case stream didn't provide part.call)
            sendChunk({
              type: 'tool_call',
              id: callId,
              name,
              args: JSON.stringify(args),
            });

            const tool = (toolDefinitions as any)[name];
            if (tool) {
              try {
                const result = await tool.execute(args);
                sendChunk({ type: 'tool_result', id: callId, name, result });
                finalToolInvocations.push({
                  toolCallId: callId,
                  toolName: name,
                  args,
                  result,
                });

                const modelResponse = { ...result };
                if (modelResponse.data) delete modelResponse.data;

                const parts: any[] = [
                  {
                    functionResponse: {
                      name,
                      response: modelResponse,
                      id: callId,
                    },
                  },
                ];
                if (name === 'readImageUrl' && result.success && result.data) {
                  parts.push({
                    inlineData: {
                      mimeType: result.mimeType || 'image/jpeg',
                      data: result.data,
                    },
                  });
                }
                return parts;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                sendChunk({
                  type: 'tool_result',
                  id: callId,
                  name,
                  error: msg,
                });
                return {
                  functionResponse: {
                    name,
                    response: { error: msg },
                    id: callId,
                  },
                };
              }
            }
            return {
              functionResponse: {
                name,
                response: { error: 'Tool not found' },
                id: callId,
              },
            };
          }),
        );

        currentInput = { role: 'user', parts: turnResults.flat() };
      }

      if (onFinish && !abortSignal?.aborted) {
        await onFinish({
          content: finalContent,
          reasoning: finalReasoning || undefined,
          thought_signature: finalThoughtSignature,
          toolInvocations: finalToolInvocations,
        });
      }
      writer.close();
    } catch (error) {
      console.error('[llm] streamText error:', error);
      sendChunk({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      writer.close();
    }
  })();

  return readable;
}

import { CLOUDFLARE_API_KEY, GLM_WORKER_URL } from '@/lib/env';
import { tools } from './tools';
import { SYSTEM_PROMPT } from './prompts';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TOKEN_LIMIT_THRESHOLD } from '@/lib/constants';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | unknown;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
  reasoning?: string;
}

/**
 * Executes the tool calling loop and streams results.
 */
export async function streamText(
  messages: Message[],
  options?: { isVoiceMode?: boolean },
) {
  if (!GLM_WORKER_URL || !CLOUDFLARE_API_KEY) {
    throw new Error('Missing GLM configuration');
  }

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      // Helper to send JSON chunks through the stream in SSE format
      const sendChunk = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Manage context window by removing oldest messages if token limit is exceeded
      const { estimateMessageTokens } = await import('./token-utils');

      const manageContext = (msgs: Message[]) => {
        const systemMsg = msgs.find((m) => m.role === 'system');
        const otherMsgs = msgs.filter((m) => m.role !== 'system');

        // Loop to remove the oldest non-system messages until within threshold
        while (
          estimateMessageTokens(
            [systemMsg, ...otherMsgs].filter((m): m is Message => !!m),
          ) > TOKEN_LIMIT_THRESHOLD &&
          otherMsgs.length > 0
        ) {
          otherMsgs.shift(); // Remove the oldest message (FIFO)
        }

        return [systemMsg, ...otherMsgs].filter((m): m is Message => !!m);
      };

      let systemPrompt = SYSTEM_PROMPT;

      // Inject voice mode instructions if requested (strips markdown for TTS compatibility)
      if (options?.isVoiceMode) {
        systemPrompt = `${SYSTEM_PROMPT}

[CRITICAL VOICE MODE OVERRIDE]
YOU ARE CURRENTLY IN A SPOKEN CONVERSATION. ALL PRIOR INSTRUCTIONS REGARDING MARKDOWN FORMATTING (BOLDING, TABLES, HEADERS, BULLET POINTS) ARE NOW SUSPENDED.
- RESPOND IN PLAIN TEXT ONLY.
- ABSOLUTELY NO MARKDOWN CHARACTERS (No **, #, -, \`, etc.).
- DO NOT USE TABLES.
- DO NOT BOLD OR ITALICIZE ANY TEXT.
- Use natural, spoken paragraphs only.
- If you need to list items, say "first," "second," etc., as part of a sentence.
- Speak exactly like a human talking to a friend.`;
      }

      let currentMessages = manageContext([
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
          name: m.name,
        })),
      ]);

      // Maps internal tool definitions to the format expected by the GLM API (OpenAI-compatible)
      const formattedTools = Object.entries(tools).map(([name, tool]) => ({
        type: 'function',
        function: {
          name,
          description: tool.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parameters: zodToJsonSchema(tool.inputSchema as any),
        },
      }));

      const MAX_STEPS = 10;
      let stepCount = 0;

      try {
        while (stepCount < MAX_STEPS) {
          stepCount++;

          // Real-time context pruning before each LLM call to prevent context overflow errors
          currentMessages = manageContext(currentMessages);

          // Call the LLM with streaming enabled
          const response = await fetch(GLM_WORKER_URL!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
            },
            body: JSON.stringify({
              messages: currentMessages,
              tools: formattedTools,
              stream: true,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const err = await response.text();
            throw new Error(`GLM API Error: ${err}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('Failed to get stream reader');

          let assistantContent = '';
          const toolCalls: Array<{
            id?: string;
            type: string;
            function: { name: string; arguments: string };
          }> = [];
          let reasoningContent = '';

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            // Split chunks by newline (SSE standard)
            const lines = buffer.split('\n');
            // Keep the last partial line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine === '' || trimmedLine === 'data: [DONE]')
                continue;
              if (trimmedLine.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmedLine.slice(6));
                  const delta = data.choices[0].delta;

                  // 1. Handle Assistant Content
                  if (delta.content) {
                    assistantContent += delta.content;
                    sendChunk({ type: 'content', delta: delta.content });
                  }

                  // 2. Handle Reasoning/Thoughts (for models like GLM and DeepSeek)
                  if (delta.reasoning_content) {
                    reasoningContent += delta.reasoning_content;
                    sendChunk({
                      type: 'reasoning',
                      delta: delta.reasoning_content,
                    });
                  } else if (delta.thought) {
                    reasoningContent += delta.thought;
                    sendChunk({ type: 'reasoning', delta: delta.thought });
                  }

                  // 3. Handle Tool Calls Aggregation (multiple calls can be streamed in parallel)
                  if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      if (!toolCalls[tc.index]) {
                        toolCalls[tc.index] = {
                          id: tc.id,
                          type: 'function',
                          function: { name: '', arguments: '' },
                        };
                      }
                      if (tc.id) toolCalls[tc.index].id = tc.id;
                      if (tc.function?.name)
                        toolCalls[tc.index].function.name += tc.function.name;
                      if (tc.function?.arguments)
                        toolCalls[tc.index].function.arguments +=
                          tc.function.arguments;
                    }
                  }
                } catch {
                  // Ignore parse errors from heartbeat or malformed chunks
                }
              }
            }
          }

          // If no tool calls, we are done
          const cleanToolCalls = toolCalls.filter(Boolean);
          if (cleanToolCalls.length === 0) {
            controller.close();
            return;
          }

          // Add assistant message with tool calls to history
          const assistantMsg: Message = {
            role: 'assistant',
            content: assistantContent,
            tool_calls: cleanToolCalls,
            reasoning: reasoningContent,
          };
          currentMessages.push(assistantMsg);

          // Execute tools and send results back to the client and history
          for (const tc of cleanToolCalls) {
            const tool = tools[tc.function.name];
            if (tool) {
              // Notify the client that a tool call is starting
              sendChunk({
                type: 'tool_call',
                id: tc.id,
                name: tc.function.name,
                args: tc.function.arguments,
              });
              try {
                // Parse arguments and execute the tool function
                const args = JSON.parse(tc.function.arguments);
                const result = await tool.execute(args);

                // Success: Send result to client and add to message history
                sendChunk({
                  type: 'tool_result',
                  id: tc.id,
                  name: tc.function.name,
                  result,
                });
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: tc.function.name,
                  content: JSON.stringify(result),
                });
              } catch (e) {
                // Error: Notify client and add error message to history so LLM can see what failed
                const errorMsg =
                  e instanceof Error ? e.message : 'Unknown error';
                sendChunk({
                  type: 'tool_result',
                  id: tc.id,
                  name: tc.function.name,
                  error: errorMsg,
                });
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: tc.function.name,
                  content: `Error: ${errorMsg}`,
                });
              }
            }
          }
          // Continue loop for next step
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

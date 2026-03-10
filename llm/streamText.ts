import { CLOUDFLARE_API_KEY, GLM_WORKER_URL } from '@/lib/env';
import { tools } from './tools';
import { SYSTEM_PROMPT } from './prompts';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TOKEN_LIMIT_THRESHOLD } from '@/lib/constants';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

/**
 * Executes the tool calling loop and streams results.
 */
export async function streamText(messages: Message[]) {
  if (!GLM_WORKER_URL || !CLOUDFLARE_API_KEY) {
    throw new Error('Missing GLM configuration');
  }

  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      const sendChunk = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Manage context window by removing oldest messages if limit is exceeded
      const { estimateMessageTokens } = await import('./token-utils');
      
      const manageContext = (msgs: any[]) => {
        const systemMsg = msgs.find(m => m.role === 'system');
        let otherMsgs = msgs.filter(m => m.role !== 'system');
        
        while (estimateMessageTokens([systemMsg, ...otherMsgs]) > TOKEN_LIMIT_THRESHOLD && otherMsgs.length > 0) {
          otherMsgs.shift(); // Remove oldest message
        }
        
        return [systemMsg, ...otherMsgs].filter(Boolean);
      };

      let currentMessages = manageContext([
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
          name: m.name
        }))
      ]);

      const formattedTools = Object.entries(tools).map(([name, tool]) => ({
        type: 'function',
        function: {
          name,
          description: tool.description,
          parameters: zodToJsonSchema(tool.inputSchema)
        }
      }));

      const MAX_STEPS = 10;
      let stepCount = 0;

      try {
        while (stepCount < MAX_STEPS) {
          stepCount++;
          
          // Real-time context pruning before each LLM call
          currentMessages = manageContext(currentMessages);

          const response = await fetch(GLM_WORKER_URL!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`
            },
            body: JSON.stringify({
              messages: currentMessages,
              tools: formattedTools,
              stream: true,
              temperature: 0.7
            })
          });

          if (!response.ok) {
            const err = await response.text();
            throw new Error(`GLM API Error: ${err}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('Failed to get stream reader');

          let assistantContent = '';
          let toolCalls: any[] = [];
          let reasoningContent = '';

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
              if (trimmedLine === '' || trimmedLine === 'data: [DONE]') continue;
              if (trimmedLine.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmedLine.slice(6));
                  const delta = data.choices[0].delta;

                  // Handle Content
                  if (delta.content) {
                    assistantContent += delta.content;
                    sendChunk({ type: 'content', delta: delta.content });
                  }

                  // Handle Reasoning (assuming GLM returns it in reasoning_content or similar)
                  if (delta.reasoning_content) {
                    reasoningContent += delta.reasoning_content;
                    sendChunk({ type: 'reasoning', delta: delta.reasoning_content });
                  } else if (delta.thought) {
                    reasoningContent += delta.thought;
                    sendChunk({ type: 'reasoning', delta: delta.thought });
                  }

                  // Handle Tool Calls
                  if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      if (!toolCalls[tc.index]) {
                        toolCalls[tc.index] = {
                          id: tc.id,
                          type: 'function',
                          function: { name: '', arguments: '' }
                        };
                      }
                      if (tc.id) toolCalls[tc.index].id = tc.id;
                      if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                      if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                    }
                  }
                } catch (e) {
                  // Ignore parse errors from malformed chunks
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
          const assistantMsg = {
            role: 'assistant',
            content: assistantContent,
            tool_calls: cleanToolCalls
          };
          currentMessages.push(assistantMsg);

          // Execute tools and send results
          for (const tc of cleanToolCalls) {
            const tool = tools[tc.function.name];
            if (tool) {
              sendChunk({ type: 'tool_call', name: tc.function.name, args: tc.function.arguments });
              try {
                const args = JSON.parse(tc.function.arguments);
                const result = await tool.execute(args);
                sendChunk({ type: 'tool_result', name: tc.function.name, result });
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: tc.function.name,
                  content: JSON.stringify(result)
                });
              } catch (e) {
                const errorMsg = e instanceof Error ? e.message : 'Unknown error';
                sendChunk({ type: 'tool_result', name: tc.function.name, error: errorMsg });
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: tc.function.name,
                  content: `Error: ${errorMsg}`
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
    }
  });
}

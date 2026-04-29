import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolDefinitions } from '@/services/tools';
import { fetchWithRetry } from '@/lib/utils';
import { AiMessage } from './types';

/**
 * Translates local AiMessage to Gemini content format.
 */
export async function formatToGemini(messages: AiMessage[]): Promise<any[]> {
  const geminiMsgs: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;
    const parts: any[] = [];

    // 1. Handle Reasoning/Thinking (Assistant side)
    if (msg.role === 'assistant' && msg.reasoning) {
      parts.push({ text: msg.reasoning, thought: true });
    }

    let effectiveSignature = msg.thought_signature;

    // 2. Handle Content (Text or Multimodal)
    if (typeof msg.content === 'string' && msg.content.trim()) {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'text' && part.text.trim()) {
          parts.push({ text: part.text });
        } else if ((part as any).type === 'thought_signature') {
          effectiveSignature = (part as any).text || (part as any).thought_signature;
        } else if (part.type === 'file') {
          const fileData = part.file;
          if (fileData.data) {
            parts.push({
              inlineData: {
                mimeType: fileData.mimeType,
                data: fileData.data,
              },
            });
          } else if (part.url) {
            try {
              const res = await fetchWithRetry(part.url);
              if (!res.ok) throw new Error(`Failed to fetch file: ${part.url}`);
              const buffer = Buffer.from(await res.arrayBuffer());
              const contentType = res.headers.get('content-type') || fileData.mimeType || 'application/octet-stream';
              parts.push({
                inlineData: {
                  mimeType: contentType,
                  data: buffer.toString('base64'),
                },
              });
            } catch (e) {
              console.error(`[llm] Failed to fetch remote file:`, e);
            }
          }
        }
      }
    }

    // 3. Handle Tool Calls (Assistant side)
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      msg.tool_calls.forEach((tc) => {
        parts.push({
          functionCall: {
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments || '{}'),
            id: tc.id,
          },
          // CRITICAL: Gemini 3 requires signature to be in the SAME part as functionCall
          thoughtSignature: effectiveSignature,
        });
      });
    }

    // 4. Handle Tool Responses (User side)
    if (msg.role === 'tool') {
      parts.push({
        functionResponse: {
          name: msg.name || 'unknown',
          response: { result: msg.content },
          id: msg.tool_call_id || '',
        },
      });
    }

    if (parts.length === 0) continue;

    const role = msg.role === 'assistant' ? 'model' : 'user';
    const lastMsg = geminiMsgs[geminiMsgs.length - 1];

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
export function getTools() {
  const functionDeclarations = Object.entries(toolDefinitions).map(([name, tool]) => {
    return {
      name,
      description: tool.description,
      parametersJsonSchema: zodToJsonSchema(tool.schema as any),
    };
  });

  return [{ functionDeclarations }];
}

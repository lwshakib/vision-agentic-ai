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
    if (msg.role === 'system') continue; // Handled in config
    let geminiThoughtSignature: string | undefined = undefined;
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
                console.error(`[llm] Failed to fetch remote file:`, e);
              }
            }
          }
          }
        } else if ((part as any).type === 'thought_signature') {
          geminiThoughtSignature = (part as any).text || (part as any).thought_signature;
        }
      }
    }

    // Capture thought_signature if it was on the message object or found in parts
    const finalThoughtSignature = msg.thought_signature || geminiThoughtSignature;

    // 2. Handle Tool Calls (Assistant's side)
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      // If we have a thought signature, include it in its own part at the beginning
      if (finalThoughtSignature) {
        parts.push({ thoughtSignature: finalThoughtSignature });
      }

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

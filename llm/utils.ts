import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolDefinitions } from './tools';
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
      // 🚀 Process multimodal parts in parallel for this message
      const partResults = await Promise.all(
        msg.content.map(async (part) => {
          if (part.type === 'text' && part.text.trim()) {
            return { text: part.text };
          } else if ((part as any).type === 'thought_signature') {
            effectiveSignature =
              (part as any).text || (part as any).thought_signature;
            return null;
          } else if (part.type === 'file' || part.type === 'image_url') {
            const url =
              part.type === 'image_url' ? part.image_url.url : part.url;
            const fileData = part.type === 'file' ? part.file : undefined;

            if (fileData?.data) {
              return {
                inlineData: {
                  mimeType: fileData.mimeType,
                  data: fileData.data,
                },
              };
            } else if (url) {
              try {
                const res = await fetchWithRetry(url);
                if (!res.ok) throw new Error(`Failed to fetch file: ${url}`);
                const buffer = Buffer.from(await res.arrayBuffer());
                const contentType =
                  res.headers.get('content-type') ||
                  fileData?.mimeType ||
                  'application/octet-stream';
                return {
                  inlineData: {
                    mimeType: contentType,
                    data: buffer.toString('base64'),
                  },
                };
              } catch (e) {
                console.error(`[llm] Failed to fetch remote file:`, e);
                return null;
              }
            }
          }
          return null;
        }),
      );
      parts.push(...partResults.filter(Boolean));
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
  const functionDeclarations = Object.entries(toolDefinitions).map(
    ([name, tool]) => {
      return {
        name,
        description: tool.description,
        parametersJsonSchema: zodToJsonSchema(tool.schema as any),
      };
    },
  );

  return [
    { functionDeclarations },
    // { googleSearch: {} },
    // { googleMaps: {} },
    // { codeExecution: {} },
    // { urlContext: {} }
  ];
}

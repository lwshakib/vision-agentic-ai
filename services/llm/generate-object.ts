import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CHAT_MODEL_ID } from './constants';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { googleGenAi } from './client';
import { formatToGemini, getTools } from './utils';
import { AiMessage } from './types';

/**
 * Structured JSON Generation
 */
export async function generateObject<T>(
  messages: AiMessage[],
  options?: { schema?: any },
): Promise<T> {
  const contents = await formatToGemini(messages);
  const history = contents.slice(0, -1);
  const lastMessage = contents[contents.length - 1];

  const config: any = {
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: 'application/json',
    tools: getTools(),
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

  const chat = googleGenAi.chats.create({
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

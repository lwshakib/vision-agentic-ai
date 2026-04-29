import { CHAT_MODEL_ID } from './constants';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { googleGenAi } from './client';
import { formatToGemini, getTools } from './utils';
import { AiMessage } from './types';

/**
 * Generates a non-streaming text response.
 */
export async function generateText(messages: AiMessage[], _options?: any): Promise<string> {
  const contents = await formatToGemini(messages);
  const history = contents.slice(0, -1);
  const lastMessage = contents[contents.length - 1];

  const tools = getTools();

  const chat = googleGenAi.chats.create({
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
  return response.text || '';
}

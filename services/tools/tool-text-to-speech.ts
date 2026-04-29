import { z } from 'zod';
import { textToSpeech } from '@/services/llm';
import { ToolDefinition } from './types';

/**
 * tool: textToSpeech
 */
export const textToSpeechTool: ToolDefinition = {
  description: 'Convert text to speech using Gemini Native Audio Generation (TTS). Supports controllable style, tone, and emotional delivery through natural language prompts or audio tags like [whispers] or [excitedly].',
  schema: z.object({
    text: z.string().describe('The text to convert to speech. You can include performance directions like "Say in a spooky voice: Hello there" or use tags like [laughs] or [gasp].'),
    voice: z.string()
      .default('Kore')
      .describe('The voice name to use. Popular: Zephyr (Bright), Puck (Upbeat), Kore (Firm), Fenrir (Excitable), Leda (Youthful), Enceladus (Breathy).'),
  }),
  execute: async ({ text, voice = 'Kore' }) => {
    return textToSpeech(text, voice);
  },
};

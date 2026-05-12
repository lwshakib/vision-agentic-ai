import { z } from 'zod';
import { textToSpeech } from '@/llm';
import { ToolDefinition } from './types';

/**
 * tool: textToSpeech
 * Uses high-fidelity Vision Text-to-Speech Voices across multiple languages.
 */
export const textToSpeechTool: ToolDefinition = {
  description:
    'Convert text to spoken audio (TTS). Supports 90+ high-fidelity voices across English, Spanish, Dutch, French, German, Italian, and Japanese.',
  schema: z.object({
    text: z.string().describe('The text to convert to speech.'),
    voice: z
      .string()
      .default('aura-2-orpheus-en')
      .describe(
        "The model ID of the voice to use (e.g., 'aura-2-thalia-en' for English, 'aura-2-celeste-es' for Spanish). If not specified, 'aura-2-orpheus-en' will be used.",
      ),
  }),
  execute: async ({ text, voice = 'aura-2-orpheus-en' }) => {
    return textToSpeech(text, voice);
  },
};

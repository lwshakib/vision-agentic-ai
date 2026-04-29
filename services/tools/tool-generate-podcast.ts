import { z } from 'zod';
import { generatePodcast } from '@/services/llm';
import { ToolDefinition } from './types';

/**
 * tool: generatePodcast
 * Uses Gemini TTS for multi-speaker audio generation.
 */
export const generatePodcastTool: ToolDefinition = {
  description:
    'Generate a multi-speaker podcast audio from a transcript. Supports up to 2 speakers with distinct Gemini voices. The transcript must include speaker names (e.g., "Joe: ...", "Jane: ...").',
  schema: z.object({
    transcript: z
      .string()
      .describe(
        'The full transcript of the podcast. Use speaker names followed by colons. You can use style tags like [whispers] or [excitedly] within the text.'
      ),
    speakers: z
      .array(
        z.object({
          speaker: z
            .string()
            .describe(
              'The name of the speaker as written in the transcript (e.g., "Joe").'
            ),
          voice: z
            .string()
            .describe(
              'The Gemini voice name (e.g., "Kore", "Puck", "Zephyr").'
            ),
        })
      )
      .max(2)
      .describe('Mapping of speaker names to Gemini voices. Max 2 speakers.'),
  }),
  execute: async ({ transcript, speakers }) => {
    return generatePodcast(transcript, speakers);
  },
};

import { z } from 'zod';
import { auraSpeakers, geminiVoices } from '@/lib/characters';
import { ToolDefinition } from './types';

/**
 * tool: listAvailableVoices
 * Returns the full catalog of available AI voices.
 */
export const listAvailableVoicesTool: ToolDefinition = {
  description:
    'List all available AI voice characters/speakers. Use this if the user asks about available voices, languages, or accents, or if you need to select a specific voice for TTS.',
  schema: z.object({
    provider: z
      .enum(['deepgram', 'google', 'all'])
      .default('all')
      .describe('Filter voices by provider (Vision TTS for single-speaker, Vision Podcast for podcasts).'),
  }),
  execute: async ({ provider = 'all' }) => {
    let result = '';

    if (provider === 'all' || provider === 'deepgram') {
      result += '### Vision Text-to-Speech Voices (Single Speaker)\n';
      result += '| Name | Language | Accent | Gender | Model ID | Description |\n';
      result += '|------|----------|--------|--------|----------|-------------|\n';
      result += auraSpeakers
        .filter((s) => s.provider === 'deepgram')
        .map(
          (s) =>
            `| ${s.name} | ${s.language} | ${s.accent} | ${s.gender} | ${s.model} | ${s.description} |`
        )
        .join('\n');
      result += '\n\n';
    }

    if (provider === 'all' || provider === 'google') {
      result += '### Vision Podcast Voices (Multi-Speaker Podcast)\n';
      result += '| Name | Gender | Description |\n';
      result += '|------|--------|-------------|\n';
      result += geminiVoices
        .map((v) => `| ${v.name} | ${v.gender} | ${v.description} |`)
        .join('\n');
    }

    return { success: true, catalog: result };
  },
};

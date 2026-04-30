import { z } from 'zod';
import { ToolDefinition } from './types';
import { googleGenAi } from '@/services/llm/client';
import { CHAT_MODEL_ID } from '@/services/llm/constants';

export const youtubeSummarizeTool: ToolDefinition = {
  description: 'Summarizes or answers questions about the content of a YouTube video given its URL.',
  schema: z.object({
    url: z.string().url().describe('The full YouTube video URL to summarize.'),
    prompt: z.string().optional().describe('An optional specific prompt or question about the video. Defaults to "Please summarize the video."'),
  }),
  execute: async ({ url, prompt = 'Please summarize the video.' }) => {
    try {
      const contents = [
        {
          fileData: {
            fileUri: url,
          },
        },
        { text: prompt }
      ];

      const response = await googleGenAi.models.generateContent({
        model: CHAT_MODEL_ID,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: contents as any,
      });
      
      return response.text;
    } catch (error) {
      console.error('[tool-youtube-summarize] Error summarizing YouTube video:', error);
      return `Failed to summarize the video. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

import { z } from 'zod';
import { tavilyService } from '@/services/tavily.services';
import { ToolDefinition } from './types';

/**
 * tool: extractWebUrl
 */
export const extractWebUrlTool: ToolDefinition = {
  description:
    'Extract comprehensive, detailed content from one or more URLs for deep research. Returns full page content.',
  schema: z.object({
    urls: z.array(z.string().url().describe('Website URL to extract detailed content from'))
      .min(1)
      .max(3)
      .describe('Array of 1-3 URLs to extract.'),
  }),
  execute: async ({ urls }) => {
    return tavilyService.extractWebUrl(urls);
  },
};

import { z } from 'zod';
import { webSearch } from '@/lib/tavily';
import { ToolDefinition } from './types';

/**
 * tool: webSearch
 */
export const webSearchTool: ToolDefinition = {
  description: 'Search the web for current information using Tavily.',
  schema: z.object({
    query: z.string().describe('Search query for the web'),
  }),
  execute: async ({ query }) => {
    return webSearch(query);
  },
};

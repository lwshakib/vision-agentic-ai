import { z } from 'zod';
import { generateFile } from '@/llm';
import { ToolDefinition } from './types';

/**
 * tool: generateFile
 */
export const generateFileTool: ToolDefinition = {
  description:
    'Generate a downloadable file (PDF, CSV, JSON, or Markdown) from text content.',
  schema: z.object({
    fileName: z
      .string()
      .describe('The name of the file to create (e.g., report, data).'),
    type: z
      .enum(['pdf', 'csv', 'json', 'markdown'])
      .describe('The type of file to generate.'),
    content: z
      .string()
      .describe('The full text content to be included in the file.'),
  }),
  execute: async ({ fileName, type, content }) => {
    return generateFile({ fileName, type, content });
  },
};

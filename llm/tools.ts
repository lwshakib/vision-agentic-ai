/**
 * AI Tool Definitions
 * Defines the executable functions available to the models.
 * Each tool includes a name, description, input schema (via Zod), and an execute function.
 */

export interface Tool {
  description: string;
  inputSchema: z.ZodTypeAny;
  execute: (args: Record<string, any>) => Promise<any>;
}

import { z } from 'zod';
import { webSearch, extractWebUrl } from '@/lib/tavily';
import { generateImage } from './generate-image';
import { textToSpeech } from './text-to-speech';
import { generateFile } from './generate-file';

/**
 * tool: webSearch
 * Purpose: Performs basic web searches via Tavily for current data.
 */
export const webSearchTool: Tool = {
  description: 'Search the web for current information using Tavily.',
  inputSchema: z.object({
    query: z.string().describe('Search query for the web'),
  }),
  execute: webSearch,
};

/**
 * tool: extractWebUrl
 * Purpose: Performs deep content extraction and Markdown parsing from specific URLs.
 * Used for detailed research and fact-checking.
 */
export const extractWebUrlTool: Tool = {
  description:
    'Extract comprehensive, detailed content from one or more URLs for deep research, fact-checking, and validation. Returns full page content including all text, structure, and context. Use this for: (1) Deep research when user requests detailed/comprehensive information, (2) When webSearch results are insufficient or lack detail, (3) Fact-checking and validation from original sources, (4) Extracting detailed data, statistics, or technical information, (5) Cross-referencing multiple sources to verify claims. Always extract from multiple authoritative sources when doing deep research or validation.',
  inputSchema: z.object({
    urls: z
      .array(
        z
          .string()
          .url()
          .describe('Website URL to extract detailed content from'),
      )
      .min(1)
      .max(10)
      .describe(
        'Array of URLs to extract. For deep research, include 3-5 most relevant and authoritative sources. Prioritize primary sources, official websites, and reputable publications.',
      ),
  }),
  execute: extractWebUrl,
};

/**
 * tool: generateImage
 * Purpose: Generates high-quality visuals using the FLUX.2 [klein] 9B model.
 * Supports flexible dimensions and advanced generation modes.
 */
export const generateImageTool: Tool = {
  description:
    'Generate high-quality images using AI. Use this when the user explicitly asks to create, generate, or make an image, picture, photo, illustration, or artwork. The model used is FLUX.2 [klein] 9B, which creates fast, high-quality images based on text prompts. Supports any custom width and height.',
  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        'Detailed description of the image to generate. Be specific about style, composition, colors, subject, mood, and any other relevant details.',
      ),
    width: z
      .number()
      .default(1024)
      .describe('Width of the image in pixels. Defaults to 1024.'),
    height: z
      .number()
      .default(1024)
      .describe('Height of the image in pixels. Defaults to 1024.'),
    mode: z
      .enum(['text-to-image', 'image-to-image', 'blend', 'inpaint'])
      .default('text-to-image')
      .describe('The generation mode to use.'),
    seed: z.number().optional().describe('Seed for deterministic results.'),
    steps: z.number().default(28).describe('Number of optimization steps (20-35).'),
  }),
  execute: generateImage,
};

/**
 * tool: textToSpeech
 * Purpose: Converts generated text into playable audio files via Deepgram.
 */
export const textToSpeechTool: Tool = {
  description:
    "Convert text to speech using an AI model. Use this when the user asks to 'say', 'speak', 'read out loud', or convert text to audio. You can also specify an optional 'voice' (model ID) from the speaker registry.",
  inputSchema: z.object({
    text: z.string().describe('The text to convert to speech'),
    voice: z
      .string()
      .optional()
      .describe(
        "The model ID of the speaker to use (e.g., 'orpheus', 'luna', 'zeus'). If not provided, it defaults to 'orpheus'.",
      ),
  }),
  execute: textToSpeech,
};

/**
 * tool: generateFile
 * Purpose: Generates PDF, CSV, JSON, or Markdown files based on text content.
 */
export const generateFileTool: Tool = {
  description:
    'Generate a downloadable file (PDF, CSV, JSON, or Markdown) from text content. Use this when the user explicitly asks to "generate a PDF", "create a CSV", "make a JSON file", etc. The file will be uploaded and a link will be provided.',
  inputSchema: z.object({
    fileName: z
      .string()
      .describe('The name of the file to create (e.g., "report", "data").'),
    type: z
      .enum(['pdf', 'csv', 'json', 'markdown'])
      .describe('The type of file to generate.'),
    content: z
      .string()
      .describe('The full text content to be included in the file. For JSON files, provide a properly stringified JSON string.'),
  }),
  execute: generateFile,
};

/**
 * The consolidated tools collection exported for use in the main model streaming function.
 */
export const tools: Record<string, Tool> = {
  webSearch: webSearchTool,
  extractWebUrl: extractWebUrlTool,
  generateImage: generateImageTool,
  textToSpeech: textToSpeechTool,
  generateFile: generateFileTool,
};

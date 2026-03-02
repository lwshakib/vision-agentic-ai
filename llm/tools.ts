/**
 * AI Tool Definitions
 * Defines the executable functions available to the Gemini models.
 * Each tool includes a name, description, input schema (via Zod), and an execute function.
 */

import type { Tool } from 'ai';
import { z } from 'zod';
import { webSearch } from './web-search';
import { extractWebUrl } from './extract-web-url';
import { generateImage } from './generate-image';
import { textToSpeech } from './text-to-speech';

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
 * Purpose: Generates high-quality visuals using the A4F (Imagen 3.5) model.
 * Supports square, portrait, and landscape aspect ratios.
 */
export const generateImageTool: Tool = {
  description:
    'Generate high-quality images using AI. Use this when the user explicitly asks to create, generate, or make an image, picture, photo, illustration, or artwork. The model used is Imagen 3.5, which creates fast, high-quality images based on text prompts.',
  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        'Detailed description of the image to generate. Be specific about style, composition, colors, subject, mood, and any other relevant details.',
      ),
    width: z
      .enum(['1792', '1024'])
      .default('1024')
      .describe('Width of the image in pixels. Must be either 1792 or 1024.'),
    height: z
      .enum(['1792', '1024'])
      .default('1024')
      .describe('Height of the image in pixels. Must be either 1792 or 1024.'),
  }),
  execute: generateImage,
};

/**
 * tool: textToSpeech
 * Purpose: Converts generated text into playable audio files via Deepgram.
 */
export const textToSpeechTool: Tool = {
  description:
    "Convert text to speech using an AI model. Use this when the user asks to 'say', 'speak', 'read out loud', or convert text to audio.",
  inputSchema: z.object({
    text: z.string().describe('The text to convert to speech'),
  }),
  execute: textToSpeech,
};

/**
 * The consolidated tools collection exported for use in the main model streaming function.
 */
export const tools: Record<string, Tool> = {
  webSearch: webSearchTool,
  extractWebUrl: extractWebUrlTool,
  generateImage: generateImageTool,
  textToSpeech: textToSpeechTool,
};

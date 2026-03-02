import type { Tool } from 'ai';
import { z } from 'zod';
import { webSearch } from './web-search';
import { extractWebUrl } from './extract-web-url';
import { generateImage } from './generate-image';
import { textToSpeech } from './text-to-speech';

export const webSearchTool: Tool = {
  description: 'Search the web for current information using Tavily.',
  inputSchema: z.object({
    query: z.string().describe('Search query for the web'),
  }),
  execute: webSearch,
};

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

export const generateImageTool: Tool = {
  description:
    'Generate high-quality images using AI. Use this when the user explicitly asks to create, generate, or make an image, picture, photo, illustration, or artwork. The model used is Flux Schnell, which creates fast, high-quality images based on text prompts.',
  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        'Detailed description of the image to generate. Be specific about style, composition, colors, subject, mood, and any other relevant details.',
      ),
    width: z
      .number()
      .int()
      .min(256)
      .max(2048)
      .default(1024)
      .describe('Width of the image in pixels'),
    height: z
      .number()
      .int()
      .min(256)
      .max(2048)
      .default(1024)
      .describe('Height of the image in pixels'),
    negative_prompt: z
      .string()
      .optional()
      .describe('Things to avoid in the image'),
  }),
  execute: generateImage,
};

// ToolSet expects an object map keyed by tool name
export const textToSpeechTool: Tool = {
  description:
    "Convert text to speech using an AI model. Use this when the user asks to 'say', 'speak', 'read out loud', or convert text to audio.",
  inputSchema: z.object({
    text: z.string().describe('The text to convert to speech'),
  }),
  execute: textToSpeech,
};

// ToolSet expects an object map keyed by tool name
export const tools: Record<string, Tool> = {
  webSearch: webSearchTool,
  extractWebUrl: extractWebUrlTool,
  generateImage: generateImageTool,
  textToSpeech: textToSpeechTool,
};

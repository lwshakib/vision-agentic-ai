import { z } from 'zod';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenAI } from '@google/genai';
import { s3Service } from './s3.services';

import {
  CLOUDFLARE_AI_GATEWAY_API_KEY,
  CLOUDFLARE_AI_GATEWAY_ENDPOINT,
  TAVILY_API_KEY,
  GOOGLE_API_KEY,
} from '@/lib/env';
import { IMAGE_MODEL_ID, TTS_MODEL_ID } from '@/lib/constants';
import { fetchWithRetry } from '@/lib/utils';

/**
 * AI Tool Interface Definitions
 * Defines the executable functions available to the models.
 */
export interface ToolDefinition {
  description: string;
  schema: z.ZodObject<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (args: any) => Promise<any>;
}

/**
 * tool: webSearch
 */
export const webSearchTool: ToolDefinition = {
  description: 'Search the web for current information using Tavily.',
  schema: z.object({
    query: z.string().describe('Search query for the web'),
  }),
  execute: async ({ query }) => {
    if (!TAVILY_API_KEY) throw new Error('Tavily API key is missing');
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: 5,
      }),
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  },
};

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
    // Implementation using a simple reader mode proxy or direct fetch if allowed
    const results = await Promise.all(
      (urls as string[]).map(async (url) => {
        try {
          const res = await fetch(`https://r.jina.ai/${url}`); // Jina Reader is a great free utility for this
          if (!res.ok) return { url, content: `Failed to load: ${res.status}` };
          const text = await res.text();
          return { url, content: text.slice(0, 10000) }; // Limit per URL
        } catch (e) {
          return { url, error: String(e) };
        }
      }),
    );
    return { results };
  },
};

/**
 * tool: generateImage
 */
export const generateImageTool: ToolDefinition = {
  description:
    'Generate or edit high-quality images using FLUX.2 [klein] 9B. Supports text-to-image and multi-reference image-to-image (img2img).',
  schema: z.object({
    prompt: z.string().describe('Detailed description of the image to generate or the edits to apply.'),
    image_urls: z.array(z.string())
      .max(4)
      .optional()
      .describe('Optional array of up to 4 reference image URLs or S3 keys for image-to-image generation.'),
    num_inference_steps: z.number()
      .max(50)
      .default(10)
      .describe('Number of diffusion steps (max 50).'),
    guidance: z.number()
      .default(3.5)
      .describe('Controls how strictly the model follows the prompt.'),
    seed: z.number()
      .optional()
      .describe('Random seed for deterministic generation.'),
    width: z.number()
      .max(1024)
      .default(512)
      .describe('Width of the image in pixels (max 1024).'),
    height: z.number()
      .max(1024)
      .default(512)
      .describe('Height of the image in pixels (max 1024).'),
  }),
  execute: async ({
    prompt,
    image_urls = [],
    num_inference_steps = 10,
    guidance = 3.5,
    seed,
    width = 512,
    height = 512,
  }) => {
    // 🛡️ Enforcement Guards
    const safeWidth = Math.min(width, 1024);
    const safeHeight = Math.min(height, 1024);
    const safeSteps = Math.min(num_inference_steps, 50);

    const images: string[] = [];

    // 🔄 Process Reference Images
    if (image_urls.length > 0) {
      console.log(
        `[Tool:generateImage] Processing ${image_urls.length} reference images...`,
      );
      await Promise.all(
        image_urls.map(async (url: string) => {
          try {
            let actualUrl = url;
            if (!url.startsWith('http')) {
              actualUrl = await s3Service.getSignedUrl(url);
            }

            const imgRes = await fetchWithRetry(actualUrl);
            if (!imgRes.ok) throw new Error(`Fetch failed: ${imgRes.status}`);

            // 🚀 High-performance Buffer to Base64 conversion
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            images.push(buffer.toString('base64'));
          } catch (e) {
            console.warn(
              `[Tool:generateImage] Failed to process image ${url}:`,
              e,
            );
          }
        }),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      model: IMAGE_MODEL_ID,
      prompt,
      width: safeWidth,
      height: safeHeight,
      num_inference_steps: safeSteps,
      guidance,
    };

    if (images.length > 0) {
      payload.images = images;
    }
    if (seed !== undefined) {
      payload.seed = seed;
    }

    const response = await fetch(CLOUDFLARE_AI_GATEWAY_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLOUDFLARE_AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Model error: ${response.status} - ${errorText.slice(0, 100)}`,
      );
    }

    const { image } = await response.json();
    if (!image) throw new Error('No image in response');

    const resultBuffer = Buffer.from(image, 'base64');
    const key = `generated/flux2-${Date.now()}.jpg`;
    const imageUrl = await s3Service.uploadFile(
      resultBuffer,
      key,
      'image/jpeg',
    );

    return {
      success: true,
      image: imageUrl,
      info: {
        model: IMAGE_MODEL_ID,
        mode: images.length > 0 ? 'img2img' : 'text2img',
        references: images.length,
        dimensions: `${safeWidth}x${safeHeight}`,
        steps: safeSteps,
      },
    };
  },
};

/**
 * tool: textToSpeech
 */
export const textToSpeechTool: ToolDefinition = {
  description: 'Convert text to speech using Gemini Native Audio Generation (TTS). Supports controllable style, tone, and emotional delivery through natural language prompts or audio tags like [whispers] or [excitedly].',
  schema: z.object({
    text: z.string().describe('The text to convert to speech. You can include performance directions like "Say in a spooky voice: Hello there" or use tags like [laughs] or [gasp].'),
    voice: z.string()
      .default('Kore')
      .describe('The voice name to use. Popular: Zephyr (Bright), Puck (Upbeat), Kore (Firm), Fenrir (Excitable), Leda (Youthful), Enceladus (Breathy).'),
  }),
  execute: async ({ text, voice = 'Kore' }) => {
    const genAI = new GoogleGenAI({ apiKey: GOOGLE_API_KEY! });

    const result = await genAI.models.generateContent({
      model: TTS_MODEL_ID,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseModalities: ['AUDIO'] as any,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        } as any,
      },
    });

    const data = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error('Speech synthesis failed: No audio data returned');

    const pcmBuffer = Buffer.from(data, 'base64');
    const wavHeader = createWavHeader(pcmBuffer.length);
    const finalBuffer = Buffer.concat([wavHeader, pcmBuffer]);

    const key = `tts/audio-${Date.now()}.wav`;
    const audioUrl = await s3Service.uploadFile(finalBuffer, key, 'audio/wav');

    return { success: true, audioUrl };
  },
};

/**
 * Helper to generate a standard RIFF/WAVE header for 24kHz 16-bit mono PCM data.
 * Gemini TTS returns raw PCM, which needs a header to be playable as a .wav file.
 */
function createWavHeader(pcmLength: number, sampleRate: number = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(pcmLength + 36, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  header.writeUInt16LE(2, 32); // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(pcmLength, 40);
  return header;
}

/**
 * tool: generateFile
 */
export const generateFileTool: ToolDefinition = {
  description:
    'Generate a downloadable file (PDF, CSV, JSON, or Markdown) from text content.',
  schema: z.object({
    fileName: z.string().describe('The name of the file to create (e.g., report, data).'),
    type: z.enum(['pdf', 'csv', 'json', 'markdown'])
      .describe('The type of file to generate.'),
    content: z.string().describe('The full text content to be included in the file.'),
  }),
  execute: async ({ fileName, type, content }) => {
    return toolService.generateFile({ fileName, type, content });
  },
};

/**
 * The consolidated tools collection for the LLM to access by name.
 */
export const toolDefinitions: Record<string, ToolDefinition> = {
  webSearch: webSearchTool,
  extractWebUrl: extractWebUrlTool,
  generateImage: generateImageTool,
  textToSpeech: textToSpeechTool,
  generateFile: generateFileTool,
};

export type GeneratedFileType = 'pdf' | 'csv' | 'json' | 'markdown';

export interface GenerateFileOptions {
  fileName: string;
  type: GeneratedFileType;
  content: string;
}

/**
 * ToolService class
 * Centralizes the implementation and definition of all AI-driven tools.
 */
class ToolService {
  /**
   * Generates a file based on content and type, and uploads it to S3/R2.
   * @param options - fileName, type, and content.
   */
  public async generateFile(options: GenerateFileOptions) {
    const { fileName, type, content } = options;

    const normalizedContent =
      typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    const safeFileName = fileName || 'generated-file';
    const safeType = type || 'pdf';
    const extension = safeType === 'markdown' ? 'md' : safeType;
    const fullFileName = safeFileName.endsWith(`.${extension}`)
      ? safeFileName
      : `${safeFileName}.${extension}`;

    try {
      let buffer: Buffer;

      switch (safeType) {
        case 'pdf': {
          const doc = new jsPDF();
          const margin = 15;
          const lineHeight = 6;
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const maxLineWidth = pageWidth - margin * 2;
          let cursorY = margin + 5;

          const lines = normalizedContent.split('\n');
          let i = 0;
          while (i < lines.length) {
            const line = lines[i].trim();

            if (
              line.startsWith('|') &&
              i + 1 < lines.length &&
              lines[i + 1].includes('---')
            ) {
              const tableLines: string[] = [];
              while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableLines.push(lines[i].trim());
                i++;
              }

              if (tableLines.length >= 2) {
                const headers = tableLines[0]
                  .split('|')
                  .filter((cell) => cell.trim() !== '')
                  .map((cell) => cell.trim());

                const rows = tableLines.slice(2).map((rowLine) =>
                  rowLine
                    .split('|')
                    .filter((cell) => cell.trim() !== '')
                    .map((cell) => cell.trim()),
                );

                autoTable(doc, {
                  head: [headers],
                  body: rows,
                  startY: cursorY,
                  margin: { left: margin, right: margin },
                  theme: 'striped',
                  styles: { fontSize: 9 },
                  headStyles: { fillColor: [41, 128, 185] },
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                cursorY = (doc as any).lastAutoTable.finalY + 10;
                continue;
              }
            }

            if (!line) {
              cursorY += lineHeight;
              i++;
              continue;
            }

            // Handle Horizontal Rule
            if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
              doc.setLineWidth(0.2);
              doc.line(margin, cursorY - 2, pageWidth - margin, cursorY - 2);
              cursorY += lineHeight;
              i++;
              continue;
            }

            let isHeader = false;
            let headerLevel = 0;
            let textToRender = line;

            // Handle Headers
            const headerMatch = textToRender.match(/^(#{1,6})\s+(.*)$/);
            if (headerMatch) {
              isHeader = true;
              headerLevel = headerMatch[1].length;
              textToRender = headerMatch[2];
            }

            // Handle Basic Lists
            const isList = textToRender.match(/^[-*]\s+(.*)$/);
            let indentX = margin;
            if (isList) {
              textToRender = '• ' + isList[1];
              indentX = margin + 5;
            }

            let fontSize = 10;
            let isBold = false;

            if (isHeader) {
              fontSize = 20 - headerLevel * 2; // # -> 18, ## -> 16, ### -> 14...
              fontSize = Math.max(10, fontSize);
              isBold = true;
              cursorY += 4; // Add top spacing for headers
            }

            doc.setFontSize(fontSize);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');

            // Wrap lines
            const wrappedLines = doc.splitTextToSize(
              textToRender,
              maxLineWidth - (indentX - margin),
            );

            for (const wLine of wrappedLines) {
              if (cursorY + lineHeight > pageHeight - margin) {
                doc.addPage();
                cursorY = margin + 5;
              }

              if (isHeader) {
                const cleanHeader = wLine.replace(/\*|_/g, ''); // strip inline markdown from headers to keep it clean
                doc.text(cleanHeader, indentX, cursorY);
              } else {
                // Inline bold/italic parser for standard paragraphs
                const parts = wLine.split(/(\*\*.*?\*\*|__.*?__|\*.*?\*)/g);
                let currentX = indentX;
                for (const part of parts) {
                  if (!part) continue;

                  if (
                    (part.startsWith('**') && part.endsWith('**')) ||
                    (part.startsWith('__') && part.endsWith('__'))
                  ) {
                    doc.setFont('helvetica', 'bold');
                    const text = part.slice(2, -2);
                    doc.text(text, currentX, cursorY);
                    currentX += doc.getTextWidth(text);
                  } else if (
                    part.startsWith('*') &&
                    part.endsWith('*') &&
                    part.length > 2
                  ) {
                    doc.setFont('helvetica', 'italic');
                    const text = part.slice(1, -1);
                    doc.text(text, currentX, cursorY);
                    currentX += doc.getTextWidth(text);
                  } else {
                    doc.setFont('helvetica', 'normal');
                    doc.text(part, currentX, cursorY);
                    currentX += doc.getTextWidth(part);
                  }
                }
              }

              cursorY += lineHeight * (fontSize / 10);
            }

            if (isHeader) {
              cursorY += 2; // Add bottom spacing for headers
            }
            i++;
          }

          buffer = Buffer.from(doc.output('arraybuffer'));
          break;
        }
        default:
          buffer = Buffer.from(normalizedContent, 'utf-8');
      }

      const contentTypeMap: Record<string, string> = {
        pdf: 'application/pdf',
        csv: 'text/csv',
        json: 'application/json',
        markdown: 'text/markdown',
      };
      const contentType =
        contentTypeMap[safeType] || 'application/octet-stream';

      const url = await s3Service.uploadFile(
        buffer,
        `files/${fullFileName}`,
        contentType,
      );

      return {
        success: true,
        url,
        fileName: fullFileName,
      };
    } catch (error) {
      console.error('[ToolService.generateFile] Error:', error);
      throw error;
    }
  }
}

export const toolService = new ToolService();

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { s3Service } from './s3.services';

import {
  CLOUDFLARE_AI_GATEWAY_API_KEY,
  CLOUDFLARE_AI_GATEWAY_ENDPOINT,
  TAVILY_API_KEY,
} from '@/lib/env';
import { 
  IMAGE_MODEL_ID, 
  TTS_MODEL_ID,
} from '@/lib/constants';

/**
 * AI Tool Interface Definitions
 * Defines the executable functions available to the models.
 */
export interface ToolDefinition {
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: any) => Promise<any>;
}

/**
 * tool: webSearch
 */
export const webSearchTool: ToolDefinition = {
  description: 'Search the web for current information using Tavily.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for the web',
      },
    },
    required: ['query'],
  },
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
  parameters: {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: {
          type: 'string',
          format: 'uri',
          description: 'Website URL to extract detailed content from',
        },
        minItems: 1,
        maxItems: 3,
        description: 'Array of 1-3 URLs to extract.',
      },
    },
    required: ['urls'],
  },
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
    'Generate high-quality images using AI FLUX.1 [schnell]. Output is a stable URL.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed description of the image to generate.',
      },
      width: {
        type: 'number',
        default: 1024,
        description: 'Width of the image in pixels.',
      },
      height: {
        type: 'number',
        default: 1024,
        description: 'Height of the image in pixels.',
      },
    },
    required: ['prompt'],
  },
  execute: async ({ prompt, width = 1024, height = 1024 }) => {
    const response = await fetch(CLOUDFLARE_AI_GATEWAY_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLOUDFLARE_AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL_ID,
        prompt,
        width,
        height,
        num_inference_steps: 4,
      }),
    });

    if (!response.ok) throw new Error('Image generation fetch failed');
    const { image } = await response.json();
    if (!image) throw new Error('No image returned from model');

    const buffer = Buffer.from(image, 'base64');
    const key = `generated/image-${Date.now()}.jpg`;
    const imageUrl = await s3Service.uploadFile(buffer, key, 'image/jpeg');

    return { success: true, image: imageUrl };
  },
};

/**
 * tool: textToSpeech
 */
export const textToSpeechTool: ToolDefinition = {
  description: 'Convert text to speech using an AI model (Aura-2).',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to convert to speech',
      },
      voice: {
        type: 'string',
        description: 'The model ID of the speaker to use (e.g., orpheus, luna).',
      },
    },
    required: ['text'],
  },
  execute: async ({ text, voice = 'orpheus' }) => {
    const response = await fetch(CLOUDFLARE_AI_GATEWAY_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLOUDFLARE_AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: TTS_MODEL_ID,
        text,
        voice,
      }),
    });

    if (!response.ok) throw new Error('Speech synthesis failed');
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const key = `tts/audio-${Date.now()}.mp3`;
    const audioUrl = await s3Service.uploadFile(buffer, key, 'audio/mpeg');

    return { success: true, audioUrl };
  },
};

/**
 * tool: generateFile
 */
export const generateFileTool: ToolDefinition = {
  description:
    'Generate a downloadable file (PDF, CSV, JSON, or Markdown) from text content.',
  parameters: {
    type: 'object',
    properties: {
      fileName: {
        type: 'string',
        description: 'The name of the file to create (e.g., report, data).',
      },
      type: {
        type: 'string',
        enum: ['pdf', 'csv', 'json', 'markdown'],
        description: 'The type of file to generate.',
      },
      content: {
        type: 'string',
        description: 'The full text content to be included in the file.',
      },
    },
    required: ['fileName', 'type', 'content'],
  },
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
    const fullFileName = safeFileName.endsWith(`.${safeType}`)
      ? safeFileName
      : `${safeFileName}.${safeType}`;

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

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const wrappedLines = doc.splitTextToSize(line, maxLineWidth);
            for (const wLine of wrappedLines) {
              if (cursorY + lineHeight > pageHeight - margin) {
                doc.addPage();
                cursorY = margin + 5;
              }
              doc.text(wLine, margin, cursorY);
              cursorY += lineHeight;
            }
            i++;
          }

          buffer = Buffer.from(doc.output('arraybuffer'));
          break;
        }
        default:
          buffer = Buffer.from(normalizedContent, 'utf-8');
      }

      await s3Service.uploadFile(buffer, `files/${fullFileName}`, `application/${safeType}`);

      return {
        success: true,
        path: `files/${fullFileName}`,
        fileName: fullFileName,
      };
    } catch (error) {
      console.error('[ToolService.generateFile] Error:', error);
      throw error;
    }
  }
}

export const toolService = new ToolService();

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
import { fetchWithRetry } from '@/lib/utils';

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
    'Generate or edit high-quality images using FLUX.2 [klein] 9B. Supports text-to-image and multi-reference image-to-image (img2img).',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed description of the image to generate or the edits to apply.',
      },
      image_urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional array of up to 4 reference image URLs or S3 keys for image-to-image generation.',
        maxItems: 4,
      },
      num_inference_steps: {
        type: 'number',
        description: 'Number of diffusion steps (max 50).',
        default: 10,
      },
      guidance: {
        type: 'number',
        description: 'Controls how strictly the model follows the prompt.',
        default: 3.5,
      },
      seed: {
        type: 'number',
        description: 'Random seed for deterministic generation.',
      },
      width: {
        type: 'number',
        default: 512,
        description: 'Width of the image in pixels (max 1024).',
      },
      height: {
        type: 'number',
        default: 512,
        description: 'Height of the image in pixels (max 1024).',
      },
    },
    required: ['prompt'],
  },
  execute: async ({ 
    prompt, 
    image_urls = [], 
    num_inference_steps = 10, 
    guidance = 3.5, 
    seed, 
    width = 512, 
    height = 512 
  }) => {
    // 🛡️ Enforcement Guards
    const safeWidth = Math.min(width, 1024);
    const safeHeight = Math.min(height, 1024);
    const safeSteps = Math.min(num_inference_steps, 50);

    const images: string[] = [];

    // 🔄 Process Reference Images
    if (image_urls.length > 0) {
      console.log(`[Tool:generateImage] Processing ${image_urls.length} reference images...`);
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
            console.warn(`[Tool:generateImage] Failed to process image ${url}:`, e);
          }
        })
      );
    }

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
      throw new Error(`Model error: ${response.status} - ${errorText.slice(0, 100)}`);
    }

    const { image } = await response.json();
    if (!image) throw new Error('No image in response');

    const resultBuffer = Buffer.from(image, 'base64');
    const key = `generated/flux2-${Date.now()}.jpg`;
    const imageUrl = await s3Service.uploadFile(resultBuffer, key, 'image/jpeg');

    return { 
      success: true, 
      image: imageUrl,
      info: {
        model: IMAGE_MODEL_ID,
        mode: images.length > 0 ? 'img2img' : 'text2img',
        references: images.length,
        dimensions: `${safeWidth}x${safeHeight}`,
        steps: safeSteps
      }
    };
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
              textToRender = "• " + isList[1];
              indentX = margin + 5;
            }

            let fontSize = 10;
            let isBold = false;
            
            if (isHeader) {
              fontSize = 20 - (headerLevel * 2); // # -> 18, ## -> 16, ### -> 14...
              fontSize = Math.max(10, fontSize);
              isBold = true;
              cursorY += 4; // Add top spacing for headers
            }

            doc.setFontSize(fontSize);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');

            // Wrap lines
            const wrappedLines = doc.splitTextToSize(textToRender, maxLineWidth - (indentX - margin));

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
                for (let part of parts) {
                  if (!part) continue;
                  
                  if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
                    doc.setFont('helvetica', 'bold');
                    const text = part.slice(2, -2);
                    doc.text(text, currentX, cursorY);
                    currentX += doc.getTextWidth(text);
                  } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
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
      const contentType = contentTypeMap[safeType] || 'application/octet-stream';

      const url = await s3Service.uploadFile(buffer, `files/${fullFileName}`, contentType);

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

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { s3Service } from './s3.services';

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
};

/**
 * tool: extractWebUrl
 */
export const extractWebUrlTool: ToolDefinition = {
  description:
    'Extract comprehensive, detailed content from one or more URLs for deep research, fact-checking, and validation. Returns full page content including all text, structure, and context.',
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
        maxItems: 10,
        description: 'Array of 1-10 URLs to extract.',
      },
    },
    required: ['urls'],
  },
};

/**
 * tool: generateImage
 */
export const generateImageTool: ToolDefinition = {
  description:
    'Generate high-quality images using AI. The model used is FLUX.1 [schnell].',
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
      mode: {
        type: 'string',
        enum: ['text-to-image', 'image-to-image', 'blend', 'inpaint'],
        default: 'text-to-image',
      },
      seed: {
        type: 'number',
        description: 'Seed for deterministic results.',
      },
      steps: {
        type: 'number',
        default: 28,
        description: 'Number of optimization steps (20-35).',
      },
    },
    required: ['prompt'],
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

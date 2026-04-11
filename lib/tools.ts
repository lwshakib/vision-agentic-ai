/**
 * AI Tool Definitions
 * Defines the executable functions available to the models.
 * Each tool includes a name, description, and raw JSON input schema.
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
    'Generate high-quality images using AI. The model used is FLUX.2 [klein] 9B.',
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

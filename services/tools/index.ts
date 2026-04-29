import { webSearchTool } from './tool-web-search';
import { extractWebUrlTool } from './tool-extract-web-url';
import { generateImageTool } from './tool-generate-image';
import { textToSpeechTool } from './tool-text-to-speech';
import { generateFileTool } from './tool-generate-file';
import { generatePodcastTool } from './tool-generate-podcast';
import { listAvailableVoicesTool } from './tool-list-voices';
import { ToolDefinition } from './types';

export * from './types';
export * from './tool-web-search';
export * from './tool-extract-web-url';
export * from './tool-generate-image';
export * from './tool-text-to-speech';
export * from './tool-generate-file';
export * from './tool-generate-podcast';
export * from './tool-list-voices';

/**
 * The consolidated tools collection for the LLM to access by name.
 */
export const toolDefinitions: Record<string, ToolDefinition> = {
  webSearch: webSearchTool,
  extractWebUrl: extractWebUrlTool,
  generateImage: generateImageTool,
  textToSpeech: textToSpeechTool,
  generateFile: generateFileTool,
  generatePodcast: generatePodcastTool,
  listAvailableVoices: listAvailableVoicesTool,
};

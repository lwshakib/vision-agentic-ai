import { generateText } from 'ai';
import { GeminiModel } from './model';

/**
 * Generates a short, descriptive title (3-5 words) for a chat based on the first user message.
 */
export async function generateChatTitle(firstMessage: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: GeminiModel(),
      prompt: `Extract a very short, concise, and descriptive title (3-5 words maximum) for a chat started with this message. Do not use quotes or special characters: "${firstMessage}"`,
    });

    // Clean up the response (remove quotes, dots, etc.)
    return (
      text
        .replace(/["'˙.]/g, '')
        .trim()
        .slice(0, 50) || 'New Chat'
    );
  } catch (error) {
    console.error('Failed to generate chat title:', error);
    return 'New Chat';
  }
}

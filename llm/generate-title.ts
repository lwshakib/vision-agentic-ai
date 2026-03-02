/**
 * Chat Title Generator
 * Uses the Gemini model to create a concise summary title for a new conversation.
 */

import { generateText } from 'ai';
import { GeminiModel } from './model';

/**
 * Generates a short, descriptive title (3-5 words) based on the opening message.
 * @param firstMessage - The starting prompt from the user.
 */
export async function generateChatTitle(firstMessage: string): Promise<string> {
  try {
    // Call the model with specific instructions for title creation.
    const { text } = await generateText({
      model: GeminiModel(),
      prompt: `Extract a very short, concise, and descriptive title (3-5 words maximum) for a chat started with this message. Do not use quotes or special characters: "${firstMessage}"`,
    });

    /**
     * Post-processing:
     * - Remove any lingering quotes or special formatting characters.
     * - Truncate to a reasonable character limit for UI safety.
     * - Fallback to 'New Chat' if the model returns an empty or invalid string.
     */
    return (
      text
        .replace(/["'˙.]/g, '')
        .trim()
        .slice(0, 50) || 'New Chat'
    );
  } catch (error) {
    // If title generation fails, use a generic fallback instead of crashing.
    console.error('Failed to generate chat title:', error);
    return 'New Chat';
  }
}

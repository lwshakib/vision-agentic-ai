import { generateText } from './generate-text';
import { estimateTokens, TOKEN_LIMIT_THRESHOLD } from './token-utils';

/**
 * Summarizes the message history if it exceeds the token limit.
 * It identifies the largest messages and replaces them with a summarized version.
 */
export async function manageContext(messages: any[]): Promise<any[]> {
  let currentTokens = messages.reduce((acc, msg) => acc + estimateTokens(msg.content), 0);

  if (currentTokens <= TOKEN_LIMIT_THRESHOLD) {
    return messages;
  }

  const systemMessage = messages.find((m) => m.role === 'system');
  const otherMessages = messages.filter((m) => m.role !== 'system');
  
  if (otherMessages.length === 0) return messages;

  // We want to keep the last few messages intact for context
  const messagesToKeepCount = 3;
  const messagesToConsider = otherMessages.slice(0, -messagesToKeepCount);
  const messagesToKeep = otherMessages.slice(-messagesToKeepCount);

  // Sort messages by size to find the biggest culprits
  const sortedIndices = messagesToConsider
    .map((msg, idx) => ({ idx, length: JSON.stringify(msg.content || '').length }))
    .filter((m) => m.length > 3000) // Lowered threshold slightly for earlier action
    .sort((a, b) => b.length - a.length);

  const newMessages = [...messagesToConsider];
  let summarizedAny = false;

  for (const { idx } of sortedIndices) {
    if (currentTokens <= TOKEN_LIMIT_THRESHOLD) break;

    const originalMessage = newMessages[idx];
    const originalContent = typeof originalMessage.content === 'string' 
      ? originalMessage.content 
      : JSON.stringify(originalMessage.content);

    try {
      summarizedAny = true;
      console.log(`[ContextManager] Action: Summarizing message at index ${idx}. Size change: ${originalContent.length} chars -> summarizing...`);
      
      const { text: summary } = await generateText({
        messages: [
          {
            role: 'system',
            content: 'You are a highly efficient assistant. Summarize the following content while preserving ALL critical data, facts, names, dates, and conclusions. Be extremely concise but maintain the technical depth. Your goal is to compress the text by at least 60% without losing information.',
          },
          {
            role: 'user',
            content: `Original Content:\n${originalContent}\n\nDetailed Summary:`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });

      const oldLength = originalContent.length;
      newMessages[idx] = {
        ...originalMessage,
        content: `[Summarized Content (Original: ${oldLength} chars)]: ${summary}`,
      };

      // Update current token estimate
      const currentFullHistory = [systemMessage, ...newMessages, ...messagesToKeep].filter(Boolean);
      currentTokens = currentFullHistory.reduce(
        (acc, msg) => acc + estimateTokens(msg.content || ''),
        0
      );
    } catch (e) {
      console.error('[ContextManager] Summarization failed:', e);
    }
  }

  if (summarizedAny) {
    console.log(`[ContextManager] Final token estimate after summarization: ${currentTokens}`);
  }

  return [systemMessage, ...newMessages, ...messagesToKeep].filter(Boolean);
}

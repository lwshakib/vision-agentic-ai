/**
 * Utility for estimating token counts and managing message history within context limits.
 */

/**
 * Roughly estimates the number of tokens in a string or object.
 * This is a heuristic based on string length.
 */
export function estimateTokens(text: string | unknown[]): number {
  if (typeof text !== 'string') {
    // If not a string (like tool calls), stringify first
    return Math.ceil(JSON.stringify(text).length / 2);
  }
  // Most models use ~4 chars/token; we use 2 for a safer, more conservative estimate
  return Math.ceil(text.length / 2);
}

/**
 * Estimates the total token count for a list of conversation messages.
 */
export function estimateMessageTokens(
  messages: Array<{ content?: string | unknown; tool_calls?: unknown[] }>,
): number {
  return messages.reduce((acc, msg) => {
    // Estimate tokens in the message content
    let count = estimateTokens((msg.content as string) || '');
    // If there are tool calls, account for their tokens as well
    if (msg.tool_calls) count += estimateTokens(msg.tool_calls as unknown[]);
    return acc + count;
  }, 0);
}

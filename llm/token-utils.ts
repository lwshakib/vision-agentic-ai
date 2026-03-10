/**
 * Utility for estimating token counts and managing message history within context limits.
 */

/**
 * Roughly estimates the number of tokens in a string.
 * This is a heuristic; most models use ~4 characters per token for English.
 * We'll use a safer 2 characters per token to avoid underestimation and provide a buffer.
 */
export function estimateTokens(text: string | any[]): number {
  if (typeof text !== 'string') {
    return Math.ceil(JSON.stringify(text).length / 2);
  }
  return Math.ceil(text.length / 2);
}

/**
 * Estimates tokens for a list of messages.
 */
export function estimateMessageTokens(messages: any[]): number {
  return messages.reduce((acc, msg) => {
    let count = estimateTokens(msg.content || '');
    if (msg.tool_calls) count += estimateTokens(msg.tool_calls);
    return acc + count;
  }, 0);
}

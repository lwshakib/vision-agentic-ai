/**
 * Utility for estimating token counts and managing message history within context limits.
 */

export const MAX_CONTEXT_TOKENS = 131072;
export const TOKENS_SAFETY_MARGIN = 10000; // Leave space for completion
export const TOKEN_LIMIT_THRESHOLD = MAX_CONTEXT_TOKENS - TOKENS_SAFETY_MARGIN;

/**
 * Roughly estimates the number of tokens in a string.
 * This is a heuristic; most models use ~4 characters per token for English.
 * We'll use a safer 3 characters per token to avoid underestimation.
 */
export function estimateTokens(text: string | any[]): number {
  if (typeof text !== 'string') {
    return Math.ceil(JSON.stringify(text).length / 3);
  }
  return Math.ceil(text.length / 3);
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

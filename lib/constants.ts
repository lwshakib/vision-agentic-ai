/**
 * Global Application Constants
 */

/**
 * The full context window limit for the GLM model (128k tokens).
 */
export const GLM_CONTEXT_WINDOW_LIMIT = 131072;

/**
 * The maximum character limit for a single speech synthesis request.
 */
export const SPEECH_CHARACTER_LIMIT = 2000;

/**
 * Reserved headroom for the AI's response to ensure it doesn't get cut off.
 */
export const TOKEN_SAFETY_MARGIN = 10000;

/**
 * The safe threshold for the context window before pruning begins.
 * Calculation: Total window (128k) minus safety headroom (10k) = ~118k tokens.
 */
export const TOKEN_LIMIT_THRESHOLD =
  GLM_CONTEXT_WINDOW_LIMIT - TOKEN_SAFETY_MARGIN;

/**
 * Global Application Constants
 */

/**
 * The full context window limit for Kimi K2.5 (256k tokens).
 */
export const CHAT_CONTEXT_WINDOW_LIMIT = 256000;

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
 */
export const TOKEN_LIMIT_THRESHOLD =
  CHAT_CONTEXT_WINDOW_LIMIT - TOKEN_SAFETY_MARGIN;

/**
 * Model Shorthand IDs (Passed in request bodies to AI Gateway)
 */
export const CHAT_MODEL_ID = 'kimi-k2.5';
export const IMAGE_MODEL_ID = 'flux-1-schnell';
export const TTS_MODEL_ID = 'aura-2-en';
export const ASR_MODEL_ID = 'whisper-large-v3-turbo';
export const STT_MODEL_ID = 'flux';

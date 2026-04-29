/**
 * LLM Service Constants
 */

export const CHAT_MODEL_ID = 'gemini-3.1-flash-lite-preview';
export const IMAGE_MODEL_ID = 'gemini-2.5-flash-image';
export const TTS_MODEL_ID = 'gemini-3.1-flash-tts-preview';

/**
 * The full context window limit for Gemini (1M tokens).
 */
export const CHAT_CONTEXT_WINDOW_LIMIT = 1000000;

/**
 * Reserved headroom for the AI's response to ensure it doesn't get cut off.
 */
export const TOKEN_SAFETY_MARGIN = 10000;

/**
 * The safe threshold for the context window before pruning begins.
 */
export const TOKEN_LIMIT_THRESHOLD = CHAT_CONTEXT_WINDOW_LIMIT - TOKEN_SAFETY_MARGIN;

/**
 * The maximum character limit for a single speech synthesis request.
 */
export const SPEECH_CHARACTER_LIMIT = 2000;

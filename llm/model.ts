import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { GOOGLE_API_KEY } from '@/lib/env';

/**
 * Shuffles and returns a single API key from the provided comma-separated string.
 */
export const getSingleAPIKey = () => {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not set');
  }

  const keys = GOOGLE_API_KEY.split(',').map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('No valid API keys found in GOOGLE_API_KEY');
  }

  return keys[Math.floor(Math.random() * keys.length)];
};

/**
 * Shuffles and returns one of the available Gemini models.
 */
export const getModelName = () => {
  const availableModels = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ];

  return availableModels[Math.floor(Math.random() * availableModels.length)];
};

/**
 * Returns a freshly initialized Gemini model with a shuffled API key and model name.
 * This ensures that every request potentially uses a different identity.
 */
export const GeminiModel = () => {
  const apiKey = getSingleAPIKey();
  const modelName = getModelName();

  const google = createGoogleGenerativeAI({
    apiKey,
  });

  return google(modelName);
};

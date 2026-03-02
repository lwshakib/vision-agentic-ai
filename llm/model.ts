/**
 * LLM Model Factory
 * Manages the initialization and configuration of the Google Gemini AI models.
 * Implements API key rotation and model selection logic.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { GOOGLE_API_KEY } from '@/lib/env';

/**
 * Retrieves a single API key from a potentially comma-separated list.
 * This allows for rotating across multiple keys to avoid rate limits.
 */
export const getSingleAPIKey = () => {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not set');
  }

  // Parse the environment variable into an array of trimmed, non-empty keys.
  const keys = GOOGLE_API_KEY.split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    throw new Error('No valid API keys found in GOOGLE_API_KEY');
  }

  // Pick a random key from the available set.
  return keys[Math.floor(Math.random() * keys.length)];
};

/**
 * Randomly selects one of the pre-approved Gemini model versions.
 */
export const getModelName = () => {
  const availableModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

  // Distribute requests across different model tiers/versions.
  return availableModels[Math.floor(Math.random() * availableModels.length)];
};

/**
 * Returns a configured instance of a Gemini model.
 * Re-initializes on every call to ensure fresh key/model rotation.
 */
export const GeminiModel = () => {
  const apiKey = getSingleAPIKey();
  const modelName = getModelName();

  // Initialize the Google AI provider with the selected key.
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  // Return the model instance for the selected name.
  return google(modelName);
};

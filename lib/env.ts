/**
 * Environment Variables Configuration
 * Centralizes the loading of API keys and secrets from process.env.
 */

// API Key for Google Gemini model access.
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// API Key for Tavily web search integration.
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// API Key for Nebius (often used for alternative LLM hosting).
export const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;

// API Key for Deepgram audio transcription services.
export const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// API Key for A4F (likely authentication or external utility provider).
export const A4F_API_KEY = process.env.A4F_API_KEY;

// Cloudflare API Key for Worker calls.
export const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;

// Worker URL for the Flux Klein model.
export const FLUX_KLEIN_WORKER_URL = process.env.FLUX_KLEIN_WORKER_URL;

// Worker URL for the GLM-4.7-Flash model.
export const GLM_WORKER_URL = process.env.GLM_WORKER_URL;

// Worker URL for the Aura-2 TTS model.
export const AURA_2_EN_WORKER_URL = process.env.AURA_2_EN_WORKER_URL;

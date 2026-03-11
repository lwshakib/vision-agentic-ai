/**
 * Environment Variables Configuration
 * Centralizes the loading of API keys and secrets from process.env.
 */


// API Key for Tavily web search integration.
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// API Key for Nebius (often used for alternative LLM hosting).
export const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;


// Cloudflare API Key for Worker calls.
export const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;

// Worker URL for the Whisper Large v3 Turbo model.
export const WHISPER_LARGE_V3_TURBO_WORKER_URL = process.env.WHISPER_LARGE_V3_TURBO_WORKER_URL;

// Worker URL for the Flux 2 Klein 9B model.
export const FLUX_2_KLEIN_9B_WORKER_URL = process.env.FLUX_2_KLEIN_9B_WORKER_URL;

// Worker URL for the GLM-4.7-Flash model.
export const GLM_WORKER_URL = process.env.GLM_WORKER_URL;

// Worker URL for the Aura-2 TTS model.
export const AURA_2_EN_WORKER_URL = process.env.AURA_2_EN_WORKER_URL;

// Worker URL for Flux ASR
export const FLUX_WORKER_URL = process.env.FLUX_WORKER_URL;

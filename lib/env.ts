/**
 * Environment Variables Configuration
 * Centralizes the loading of API keys and secrets from process.env.
 */

// API Key for Tavily web search integration.
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// API Key for Nebius (often used for alternative LLM hosting).
export const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;

// Cloudflare API Key used for authenticating requests to all custom workers.
export const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;

// Worker URL for the Whisper Large v3 Turbo model (Audio Transcription).
export const WHISPER_LARGE_V3_TURBO_WORKER_URL =
  process.env.WHISPER_LARGE_V3_TURBO_WORKER_URL;

// Worker URL for the Flux 2 Klein 9B model (Image Generation).
export const FLUX_2_KLEIN_9B_WORKER_URL =
  process.env.FLUX_2_KLEIN_9B_WORKER_URL;

// Worker URL for the GLM-4.7-Flash model (Main Text & Reasoning LLM).
export const GLM_WORKER_URL = process.env.GLM_WORKER_URL;

// Worker URL for the Aura-2 TTS model (High-fidelity Text-to-Speech).
export const AURA_2_EN_WORKER_URL = process.env.AURA_2_EN_WORKER_URL;

// Worker URL for additional image/audio processing workflows.
export const FLUX_WORKER_URL = process.env.FLUX_WORKER_URL;

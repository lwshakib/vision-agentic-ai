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
// Cloudflare AI Gateway configuration.
export const CLOUDFLARE_AI_GATEWAY_API_KEY =
  process.env.CLOUDFLARE_AI_GATEWAY_API_KEY;
export const CLOUDFLARE_AI_GATEWAY_ENDPOINT =
  process.env.CLOUDFLARE_AI_GATEWAY_ENDPOINT;

// S3/R2 Storage configuration.
export const AWS_REGION = process.env.AWS_REGION;
export const AWS_ENDPOINT = process.env.AWS_ENDPOINT;
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

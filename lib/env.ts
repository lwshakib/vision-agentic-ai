/**
 * Environment Variables Configuration
 * Centralizes the loading of API keys and secrets from process.env.
 */

// API Key for Tavily web search integration.
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// API Key for Resend email integration.
export const RESEND_API_KEY = process.env.RESEND_API_KEY;

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

// Google AI configuration.
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Deepgram configuration.
export const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

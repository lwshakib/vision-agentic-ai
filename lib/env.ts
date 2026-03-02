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

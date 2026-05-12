import { GoogleGenAI } from '@google/genai';
import { GOOGLE_API_KEY } from '@/lib/env';

if (!GOOGLE_API_KEY) {
  console.warn('[llm] Warning: GOOGLE_API_KEY is missing.');
}

export const googleGenAi = new GoogleGenAI({
  apiKey: GOOGLE_API_KEY || '',
});

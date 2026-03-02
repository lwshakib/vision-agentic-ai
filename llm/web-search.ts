import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';

const tvlyClient = tavily({ apiKey: TAVILY_API_KEY || '' });

export async function webSearch({ query }: { query: string }) {
  if (!TAVILY_API_KEY) {
    throw new Error('Missing TAVILY_API_KEY');
  }

  const result = await tvlyClient.search(query, {
    includeAnswer: true,
    includeFavicon: true,
    includeImages: false,
    maxResults: 5,
  });

  return result;
}

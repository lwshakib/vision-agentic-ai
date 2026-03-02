/**
 * Web Search Utility
 * Integrates with the Tavily API to perform keyword-based web searches.
 */

import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';

/**
 * Initialize the Tavily client with the key from environment variables.
 */
const tvlyClient = tavily({ apiKey: TAVILY_API_KEY || '' });

/**
 * Executes a web search query.
 * @param query - The string to search for.
 * @returns A structured object containing search results and short answers.
 */
export async function webSearch({ query }: { query: string }) {
  // Validate API key before attempting the request.
  if (!TAVILY_API_KEY) {
    throw new Error('Missing TAVILY_API_KEY');
  }

  // Execute the search with specific features enabled (answers, favicons).
  const result = await tvlyClient.search(query, {
    includeAnswer: true, // Generate a brief AI answer based on results.
    includeFavicon: true, // Include source icons for UI rendering.
    includeImages: false, // Save bandwidth by excluding image results here.
    maxResults: 5, // Limit to 5 high-relevance sources.
  });

  return result;
}

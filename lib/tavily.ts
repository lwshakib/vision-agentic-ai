/**
 * Tavily Web Search and Content Extraction Logic
 * Integrates with the Tavily API to perform keyword-based web searches
 * and deep reading of specific URLs.
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
  // Validate API key exists before attempting the request.
  if (!TAVILY_API_KEY) {
    throw new Error('Missing TAVILY_API_KEY');
  }

  // Execute the search with specific features enabled (answers, favicons).
  const result = await tvlyClient.search(query, {
    includeAnswer: true, // Requests a short AI-generated answer extracted from search results
    includeFavicon: true, // Grabs the favicon URL for each source for the UI
    includeImages: false, // Disables image results to optimize for text research
    maxResults: 5, // Fetches top 5 high-relevance sources
  });

  return result;
}

/**
 * Extracts detailed content from a list of URLs.
 * @param urls - Array of strings containing the target web addresses.
 */
export async function extractWebUrl({ urls }: { urls: string[] }) {
  try {
    // Perform the extraction via Tavily's advanced reading mode.
    const response = await (
      tvlyClient as unknown as {
        extract: (
          urls: string[],
          options: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>;
      }
    ).extract(urls, {
      includeFavicon: true,
      includeImages: false, // Text-only for model processing efficiency.
      topic: 'general',
      format: 'markdown', // Best for LLM consumption.
      extractDepth: 'advanced', // Highest quality content retrieval.
    });

    /**
     * Interface for the raw result item from Tavily.
     */
    interface ExtractionResult {
      url: string;
      title?: string;
      rawContent?: string;
      content?: string;
      favicon?: string;
    }

    // Map and clean the results from the API response.
    const results = ((response?.results as ExtractionResult[]) || []).map(
      (r) => ({
        url: r.url,
        title: r.title || r.url,
        content: r.rawContent || r.content || 'No content extracted',
        favicon: r.favicon || null,
        extractedLength: r.rawContent?.length || 0,
      }),
    );

    // Return a structured summary of the extraction process to be fed back to the LLM.
    return {
      success: true,
      urls: urls,
      results: results,
      totalSources: results.length,
      // Aggregated length for token estimation and context management.
      totalContentLength: (results as { extractedLength: number }[]).reduce(
        (sum, r) => sum + (r.extractedLength || 0),
        0,
      ),
      response_time:
        ((response as Record<string, unknown>)?.responseTime as number) || 0,
    };
  } catch (error) {
    // Graceful error handling in case of API outages or network issues.
    return {
      success: false,
      message: 'Extract url content failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

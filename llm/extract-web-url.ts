/**
 * Web Content Extraction Logic
 * Uses the Tavily SDK to perform deep reading of specific URLs.
 * Extracts full markdown content for validation and deep research.
 */

import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';

// Initialize the Tavily client for extraction tasks.
const tvlyClient = tavily({ apiKey: TAVILY_API_KEY || '' });

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

    // Return a structured summary of the extraction process.
    return {
      success: true,
      urls: urls,
      results: results,
      totalSources: results.length,
      // Aggregated length for logging and context window monitoring.
      totalContentLength: (results as { extractedLength: number }[]).reduce(
        (sum, r) => sum + (r.extractedLength || 0),
        0,
      ),
      response_time: response.responseTime,
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

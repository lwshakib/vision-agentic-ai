import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';

const client = TAVILY_API_KEY ? tavily({ apiKey: TAVILY_API_KEY }) : null;

interface ExtractionResultItem {
  url: string;
  title?: string;
  rawContent?: string;
  content?: string;
  favicon?: string;
}

interface ExtractionResponse {
  results: ExtractionResultItem[];
  responseTime?: number;
}

/**
 * Performs a web search query via Tavily.
 */
export async function webSearch(query: string) {
  if (!client) throw new Error('Missing TAVILY_API_KEY');

  return await client.search(query, {
    includeAnswer: true,
    includeFavicon: true,
    includeImages: false,
    maxResults: 5,
  });
}

/**
 * Extracts detailed content from specific URLs.
 */
export async function extractWebUrl(urls: string[]) {
  if (!client) {
    return {
      success: false,
      message: 'TAVILY_API_KEY is not configured',
      error: 'Missing API key',
    };
  }

  try {
    const response = (await client.extract(urls, {
      includeFavicon: true,
      includeImages: false,
      topic: 'general',
      format: 'markdown',
      extractDepth: 'advanced',
    })) as unknown as ExtractionResponse;

    const results = (response?.results || []).map((r) => ({
      url: r.url,
      title: r.title || r.url,
      content: r.rawContent || r.content || 'No content extracted',
      favicon: r.favicon || null,
      extractedLength: (r.rawContent || r.content || '').length,
    }));

    return {
      success: true,
      urls,
      results,
      totalSources: results.length,
      totalContentLength: results.reduce(
        (sum, r) => sum + r.extractedLength,
        0,
      ),
      response_time: response?.responseTime || 0,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Search extraction failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';

/**
 * Interface mapping for the Tavily client's extraction result items.
 */
interface ExtractionResultItem {
  url: string;
  title?: string;
  rawContent?: string;
  content?: string;
  favicon?: string;
}

/**
 * Interface for the response from the Tavily extract method.
 */
interface ExtractionResponse {
  results: ExtractionResultItem[];
  responseTime?: number;
}

class TavilyService {
  private client: ReturnType<typeof tavily>;

  constructor() {
    this.client = tavily({ apiKey: TAVILY_API_KEY || '' });
  }

  /**
   * Performs a web search query via Tavily.
   */
  public async webSearch(query: string) {
    if (!TAVILY_API_KEY) throw new Error('Missing TAVILY_API_KEY');

    return await this.client.search(query, {
      includeAnswer: true,
      includeFavicon: true,
      maxResults: 5,
    });
  }

  /**
   * Extracts detailed content from specific URLs.
   */
  public async extractWebUrl(urls: string[]) {
    try {
      // Use advanced extraction with cast for deeper content retrieval
      const response = (await (this.client as any).extract(urls, {
        includeFavicon: true,
        topic: 'general',
        format: 'markdown',
        extractDepth: 'advanced',
      })) as ExtractionResponse;

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
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const tavilyService = new TavilyService();

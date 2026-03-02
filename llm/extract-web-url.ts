import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';

const tvlyClient = tavily({ apiKey: TAVILY_API_KEY || '' });

export async function extractWebUrl({ urls }: { urls: string[] }) {
  try {
    const response = await (tvlyClient as unknown as { 
      extract: (urls: string[], options: Record<string, unknown>) => Promise<Record<string, unknown>> 
    }).extract(urls, {
      includeFavicon: true,
      includeImages: false,
      topic: 'general',
      format: 'markdown',
      extractDepth: 'advanced',
    });

    interface ExtractionResult {
      url: string;
      title?: string;
      rawContent?: string;
      content?: string;
      favicon?: string;
    }

    const results = ((response?.results as ExtractionResult[]) || []).map((r) => ({
      url: r.url,
      title: r.title || r.url,
      content: r.rawContent || r.content || 'No content extracted',
      favicon: r.favicon || null,
      extractedLength: r.rawContent?.length || 0,
    }));

    return {
      success: true,
      urls: urls,
      results: results,
      totalSources: results.length,
      totalContentLength: (results as { extractedLength: number }[]).reduce(
        (sum, r) => sum + (r.extractedLength || 0),
        0,
      ),
      response_time: response.responseTime,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Extract url content failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

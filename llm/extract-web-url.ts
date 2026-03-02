import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';

const tvlyClient = tavily({ apiKey: TAVILY_API_KEY || '' });

export async function extractWebUrl({ urls }: { urls: string[] }) {
  try {
    // Use advanced extraction depth for comprehensive content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await tvlyClient.extract(urls, {
      includeFavicon: true,
      includeImages: false,
      topic: 'general',
      format: 'markdown',
      extractDepth: 'advanced', // Changed from "basic" to "advanced" for deeper extraction
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (response?.results || [])?.map((r: any) => ({
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
      totalContentLength: results.reduce(
        (sum: number, r: any) => sum + (r.extractedLength || 0),
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

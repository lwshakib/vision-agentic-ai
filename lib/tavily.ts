import { tavily } from '@tavily/core';
import { TAVILY_API_KEY } from '@/lib/env';
import { validatePublicUrl } from '@/lib/url-validator';

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
    // Validate input URLs against SSRF (block private IP ranges, loopback, link-local, internal domains)
    const validationResults = await Promise.all(
      urls.map(async (url) => ({
        url,
        validation: await validatePublicUrl(url),
      })),
    );

    const validUrls = validationResults
      .filter((v) => v.validation.valid)
      .map((v) => v.url);
    const invalidUrls = validationResults.filter((v) => !v.validation.valid);

    if (validUrls.length === 0) {
      const reasons = invalidUrls
        .map((v) => `${v.url}: ${v.validation.reason}`)
        .join('; ');
      return {
        success: false,
        message:
          'URL validation failed: All provided URLs were invalid or pointed to restricted internal/private networks (SSRF protection).',
        error: `SSRF validation failed. ${reasons}`,
      };
    }

    const response = (await client.extract(validUrls, {
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
      urls: validUrls,
      results,
      totalSources: results.length,
      totalContentLength: results.reduce(
        (sum, r) => sum + r.extractedLength,
        0,
      ),
      response_time: response?.responseTime || 0,
      ...(invalidUrls.length > 0
        ? {
            blockedUrls: invalidUrls.map((v) => ({
              url: v.url,
              reason: v.validation.reason,
            })),
          }
        : {}),
    };
  } catch (error) {
    return {
      success: false,
      message: 'Search extraction failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


/**
 * Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines Tailwind CSS classes safely.
 * It merges conditional classes (via clsx) and resolves Tailwind conflicts (via twMerge).
 * Example: cn('px-2', isTrue && 'bg-red-500')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates a string to a specified length and adds an ellipsis.
 * @param str - The string to truncate.
 * @param length - The maximum length before truncation.
 */
export function truncate(str: string, length: number) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

/**
 * Enhanced fetch with timeout, standard headers, and retry logic.
 * Useful for fetching external assets from potentially unreliable sources.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  timeout = 30000,
): Promise<Response> {
  const defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers },
        signal: controller.signal,
      });
      clearTimeout(timerId);
      return response;
    } catch (err) {
      clearTimeout(timerId);
      lastError = err as Error;

      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const retryDelay = 1000 * Math.pow(2, i);

      console.warn(
        `[fetchWithRetry] Attempt ${i + 1} failed: ${
          isTimeout ? 'Timeout' : lastError.message
        }. ${i < maxRetries - 1 ? `Retrying in ${retryDelay}ms...` : 'Max retries reached.'}`,
      );

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw (
    lastError ||
    new Error(`Failed to fetch ${url} after ${maxRetries} attempts`)
  );
}

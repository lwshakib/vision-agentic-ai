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

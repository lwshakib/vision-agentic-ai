/**
 * Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines Tailwind CSS classes safely.
 * It merges conditional classes (via clsx) and resolves Tailwind conflicts (via twMerge).
 * @param inputs - Array of class names or conditional class objects.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

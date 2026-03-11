/**
 * User Authentication Actions
 * Provides server-side helper to retrieve user data from request headers.
 * This architecture relies on a gateway/middleware injecting the 'x-user' header.
 */

import { headers } from 'next/headers';

/**
 * Retrieves the current user context.
 * Useful in Server Components and API Routes.
 */
export async function getUser() {
  // Access the request headers.
  const headerList = await headers();
  // Retrieve the stringified user object injected by middleware.
  const userData = headerList.get('x-user');
  if (!userData) return null;

  try {
    // Parse the JSON data into a usable TypeScript object.
    // The expected structure includes user id, email, and credits.
    return JSON.parse(userData);
  } catch (error) {
    // Handle parsing errors (e.g., malformed header data).
    console.error('Error parsing user data from headers:', error);
    return null;
  }
}

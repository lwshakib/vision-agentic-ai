/**
 * Better-Auth API Handler
 * This catch-all route handles all authentication-related requests (sign-in, sign-up, session check, etc.)
 * by delegating them to the Better-Auth Next.js handler.
 */

// Import the configured auth instance from the shared library.
import { auth } from '@/lib/auth';
// Import the utility that converts Better-Auth logic into Next.js compatible route handlers.
import { toNextJsHandler } from 'better-auth/next-js';

/**
 * Export the dynamically generated GET and POST handlers.
 * Any request to /api/auth/* will be processed by this handler.
 */
export const { POST, GET } = toNextJsHandler(auth);

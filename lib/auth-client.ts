/**
 * better-auth Client Configuration
 * This module initializes and exports the authentication client for the frontend.
 * It uses 'better-auth/react' to provide hooks and methods for managing user sessions.
 */

import { createAuthClient } from 'better-auth/react';

/**
 * The initialized authClient instance.
 * Used across the application to sign in, sign up, and check session status.
 */
export const authClient = createAuthClient({
  /**
   * The base URL where the authentication server is hosted.
   * This is used by the client to send requests for login, logout, and session checks.
   * Ensure NEXT_PUBLIC_BASE_URL is set in your .env for production.
   */
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
});

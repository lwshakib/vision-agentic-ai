/**
 * better-auth Server Configuration
 * This module configures the server-side authentication logic using better-auth.
 * It integrates with Prisma for database persistence and Resend for email notifications.
 */

import { betterAuth } from 'better-auth';
// Prisma adapter connects the auth system to our database schema.
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';
// Resend client for sending verification and password reset emails.
import { Resend } from 'resend';
// Custom email template for consistent branding across auth emails.
import { AuthEmailTemplate } from '@/components/emails/auth-email-template';

// Initialize the Resend instance with the API key from environment variables.
// Function to lazily initialize Resend to avoid errors during build when the key is missing.
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

/**
 * Main authentication configuration object.
 */
export const auth = betterAuth({
  /**
   * Database configuration: uses Prisma as the ORM with a PostgreSQL provider.
   */
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  /**
   * Email and password sign-in configuration.
   */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Prevent login until email is confirmed.

    /**
     * Custom handler for sending password reset links.
     * Triggered when a user requests a password recovery.
     */
    sendResetPassword: async ({ user, url }) => {
      const resend = getResend();
      if (!resend) {
        console.warn('RESEND_API_KEY is not configured. Skipping reset email.');
        return;
      }
      try {
        const { error } = await resend.emails.send({
          from: 'Vision Agentic AI <noreply@lwshakib.site>',
          to: user.email,
          subject: 'Reset your password',
          // Render the AuthEmailTemplate with a recovery context.
          react: AuthEmailTemplate({ type: 'forgot-password', url }),
        });

        if (error) {
          console.error('Failed to send email via Resend:', error);
          throw new Error('Failed to send authentication email.');
        }
      } catch (err) {
        console.error('Resend error:', err);
        throw err;
      }
    },
  },

  /**
   * Social login configuration (OAuth).
   */
  socialProviders: {
    google: {
      enabled: true,
      // Credentials loaded from server environment variables.
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  /**
   * Email verification configuration.
   */
  emailVerification: {
    sendOnSignUp: true, // Automatically send verification email after registration.

    /**
     * Custom handler for sending the initial account verification email.
     */
    sendVerificationEmail: async ({ user, url }) => {
      const resend = getResend();
      if (!resend) {
        console.warn(
          'RESEND_API_KEY is not configured. Skipping verification email.',
        );
        return;
      }
      try {
        await resend.emails.send({
          from: 'Vision Agentic AI <noreply@lwshakib.site>',
          to: user.email,
          subject: 'Verify your email address',
          // Render the template with a verification context.
          react: AuthEmailTemplate({ type: 'email-verification', url }),
        });
      } catch (err) {
        console.error('Verification email error:', err);
      }
    },
  },

  /**
   * Account-specific settings.
   */
  account: {
    accountLinking: {
      enabled: true, // Allow linking multiple providers (e.g., Google and Email) to one user.
    },
  },

  /**
   * Additional user schema fields managed by the auth system.
   * These are synchronized between the database and the session object.
   */
  user: {
    additionalFields: {
      // Tracks available message credits for the AI (Reset periodically)
      messageCredits: {
        type: 'number',
        defaultValue: 10,
      },
      // Keeps track of the last time credits were replenished
      lastCreditReset: {
        type: 'date',
        defaultValue: new Date(),
      },
    },
  },
});

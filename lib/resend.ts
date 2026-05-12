import { Resend } from 'resend';
import { RESEND_API_KEY } from '@/lib/env';
import { ReactNode } from 'react';

const client = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Generic function to send an email.
 * @param to - Recipient email.
 * @param subject - Email subject line.
 * @param react - React Email component for the body.
 */
export async function sendEmail(to: string, subject: string, react: ReactNode) {
  if (!client) {
    console.warn('[EmailService] RESEND_API_KEY is missing.');
    return;
  }

  try {
    const { data, error } = await client.emails.send({
      from: 'Vision AI <noreply@vision.leadwithshakib.dev>',
      to,
      subject,
      react: react as React.ReactElement,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Email.sendEmail] Error:', error);
    throw error;
  }
}

/**
 * Specialized function for sending verification emails during auth.
 */
export async function sendVerificationEmail(to: string, url: string) {
  console.log(
    `[Email] Preparing verification email for ${to} with URL: ${url}`,
  );
  return await sendEmail(
    to,
    'Verify your email - Vision AI',
    null as unknown as ReactNode,
  );
}

/**
 * Specialized function for welcome emails.
 */
export async function sendWelcomeEmail(to: string) {
  return await sendEmail(
    to,
    'Welcome to Vision AI',
    null as unknown as ReactNode,
  );
}

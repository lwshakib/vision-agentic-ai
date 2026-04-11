import { Resend } from 'resend';
import { RESEND_API_KEY } from '@/lib/env';
import { ReactNode } from 'react';

class EmailService {
  private client: Resend;

  constructor() {
    this.client = new Resend(RESEND_API_KEY || '');
  }

  /**
   * Generic method to send an email.
   * @param to - Recipient email.
   * @param subject - Email subject line.
   * @param react - React Email component for the body.
   */
  public async sendEmail(to: string, subject: string, react: ReactNode) {
    if (!RESEND_API_KEY) {
      console.warn('[EmailService] RESEND_API_KEY is missing.');
      return;
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: 'Vision AI <noreply@vision.leadwithshakib.dev>',
        to,
        subject,
        react: react as any, // Resend type expectations
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[EmailService.sendEmail] Error:', error);
      throw error;
    }
  }

  /**
   * Specialized method for sending verification emails during auth.
   */
  public async sendVerificationEmail(to: string, _url: string) {
    // Logic for verification email template...
    return await this.sendEmail(to, 'Verify your email - Vision AI', null as unknown as ReactNode);
  }

  /**
   * Specialized method for welcome emails.
   */
  public async sendWelcomeEmail(to: string) {
    return await this.sendEmail(to, 'Welcome to Vision AI', null as unknown as ReactNode);
  }
}

export const emailService = new EmailService();

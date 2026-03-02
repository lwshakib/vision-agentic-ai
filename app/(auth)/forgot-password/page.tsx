/**
 * Forgot Password Page
 * This client-side component provides a form for users to request a password reset email.
 */

'use client';

// Import the Logo icon component to display the application logo.
import { Logo as LogoIcon } from '@/components/logo';
// Import UI components for buttons, inputs, labels.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Import the authentication client to interact with the auth service.
import { authClient } from '@/lib/auth-client';
// Import an icon for the loading spinner.
import { Loader2 } from 'lucide-react';
// Import Link for navigation within the application.
import Link from 'next/link';
// Import React hooks for state management.
import { useState } from 'react';
// Import toast for displaying user notifications.
import { toast } from 'sonner';

/**
 * ForgotPasswordPage Component
 * Renders the forgot password flow, including the email input form and the success state.
 */
export default function ForgotPasswordPage() {
  // State to hold the email address entered by the user.
  const [email, setEmail] = useState('');
  // State to track if the password reset request is currently in progress.
  const [isLoading, setIsLoading] = useState(false);
  // State to track if the reset email has been successfully sent.
  const [isEmailSent, setIsEmailSent] = useState(false);

  /**
   * Handles the form submission for requesting a password reset.
   * @param e - The form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the default form submission behavior (page reload).
    e.preventDefault();
    // Set loading state to true while the request is being processed.
    setIsLoading(true);

    try {
      // Call the auth client's password reset request method.
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password', // The URL the user will be sent to after clicking the link in the email.
      });

      // If there's an error from the auth service, show a toast notification.
      if (error) {
        toast.error(error.message || 'Failed to send reset link');
        return;
      }

      // If successful, update the state to show the success message.
      setIsEmailSent(true);
      // Show a success notification.
      toast.success('Reset link sent to your email');
    } catch {
      // Handle unexpected network or server errors.
      toast.error('An unexpected error occurred');
    } finally {
      // Re-initialize loading state to false regardless of the outcome.
      setIsLoading(false);
    }
  };

  /**
   * Render the success state after the email has been sent.
   */
  if (isEmailSent) {
    return (
      <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
        {/* Container for the success message card. */}
        <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-8 shadow-md">
          {/* Link back to the home page with the logo. */}
          <Link href="/" aria-label="go home">
            <LogoIcon />
          </Link>
          <h1 className="mb-1 mt-4 text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-balance">
            We&apos;ve sent a password reset link to <strong>{email}</strong>.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {/* Quick link button to Gmail web interface. */}
            <Button asChild className="w-full">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
              >
                Go to Gmail
              </a>
            </Button>
            {/* Button to navigate back to the sign-in page. */}
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-in">Back to Login</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  /**
   * Render the initial state with the forgot password form.
   */
  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <form
        onSubmit={handleSubmit}
        // Styling for the form card.
        className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]"
      >
        <div className="p-8 pb-6">
          {/* Application logo at the top of the form. */}
          <Link href="/" aria-label="go home">
            <LogoIcon />
          </Link>
          <h1 className="mb-1 mt-4 text-xl font-semibold">Forgot Password</h1>
          <p className="text-sm">
            Enter your email to receive a password reset link
          </p>

          <div className="mt-6 space-y-4">
            {/* Form field for email address. */}
            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm">
                Email
              </Label>
              <Input
                type="email"
                required
                name="email"
                id="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading} // Disable input while loading.
              />
            </div>

            {/* Submit button to trigger the reset link request. */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                // Show loading spinner and text while processing.
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </div>
        </div>

        {/* Footer section with link to go back to sign-in. */}
        <div className="bg-muted rounded-(--radius) border p-3">
          <p className="text-accent-foreground text-center text-sm">
            Remembered your password?
            <Button asChild variant="link" className="px-2">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </p>
        </div>
      </form>
    </section>
  );
}

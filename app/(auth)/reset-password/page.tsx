/**
 * Reset Password Page
 * This client-side component handles the completion of the password reset process.
 * It uses a token from the URL to authenticate the request.
 */

'use client';

// Import Logo icon for branding.
import { Logo as LogoIcon } from '@/components/logo';
// Import UI components for form interactions.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Import authClient for password reset API call.
import { authClient } from '@/lib/auth-client';
// Import icon for loading spinner.
import { Loader2 } from 'lucide-react';
// Import Link for internal navigation.
import Link from 'next/link';
// Import useSearchParams to extract the reset token from the URL query string.
import { useSearchParams } from 'next/navigation';
// Import Suspense for handling components that use useSearchParams (required by Next.js).
import { Suspense, useState } from 'react';
// Import toast for notifications.
import { toast } from 'sonner';

/**
 * ResetPasswordForm Component
 * Contains the logic and UI for the actual password reset form.
 */
function ResetPasswordForm() {
  // Hook to access URL search parameters.
  const searchParams = useSearchParams();
  // State for the new password input.
  const [password, setPassword] = useState('');
  // State for the password confirmation input.
  const [confirmPassword, setConfirmPassword] = useState('');
  // State to track if the submission is in progress.
  const [isLoading, setIsLoading] = useState(false);
  // State to track if the password reset was successful.
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Handles the password reset form submission.
   * @param e - Form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent default form submission.
    e.preventDefault();

    // Client-side validation: ensure passwords match.
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Set loading indicator.
    setIsLoading(true);

    try {
      // Call authentication service to reset the password.
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token: searchParams.get('token') || '', // Retrieve token from URL.
      });

      // Show error toast if any issued.
      if (error) {
        toast.error(error.message || 'Failed to reset password');
        return;
      }

      // Success state.
      setIsSuccess(true);
      toast.success('Password reset successfully');
    } catch {
      // Handle unexpected errors.
      toast.error('An unexpected error occurred');
    } finally {
      // Reset loading state.
      setIsLoading(false);
    }
  };

  /**
   * Render success message if password was successfully reset.
   */
  if (isSuccess) {
    return (
      <div
        className="bg-card h-fit w-full max-w-[400px] md:min-w-[400px] rounded-[calc(var(--radius)+.125rem)] border p-8 shadow-md"
        style={{ maxWidth: '400px' }}
      >
        {/* Logo at the top of the card. */}
        <Link href="/" aria-label="go home">
          <LogoIcon />
        </Link>
        <h1 className="mb-1 mt-4 text-xl font-semibold">
          Password reset successfully
        </h1>
        <p className="text-sm">You can now sign in with your new password.</p>

        <div className="mt-6">
          {/* Button to navigate to sign-in page. */}
          <Button asChild className="w-full">
            <Link href="/sign-in">Back to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Render the password reset form.
   */
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card h-fit w-full max-w-[400px] md:min-w-[400px] rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]"
      style={{ maxWidth: '400px' }}
    >
      <div className="p-8 pb-6">
        {/* Branding. */}
        <Link href="/" aria-label="go home">
          <LogoIcon />
        </Link>
        <h1 className="mb-1 mt-4 text-xl font-semibold">Reset Password</h1>
        <p className="text-sm">Enter your new password below</p>

        <div className="mt-6 space-y-4">
          {/* New password field. */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              type="password"
              required
              name="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Confirm new password field. */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              type="password"
              required
              name="confirmPassword"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Submit button. */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              // Loading state button text.
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * ResetPasswordPage Main Component
 * Wraps the ResetPasswordForm in Suspense because it uses search parameters.
 */
export default function ResetPasswordPage() {
  return (
    // Suspense is required when using components that rely on useSearchParams in Next.js static rendering.
    <Suspense
      fallback={
        // Spinner centered in the screen while loading the form logic.
        <div className="m-auto">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

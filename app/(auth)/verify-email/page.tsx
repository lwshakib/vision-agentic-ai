/**
 * Verify Email Page
 * This client-side component handles the email verification process.
 * It checks for a verification token in the URL or a success flag.
 */

'use client';

// Import Logo icon for branding.
import { Logo as LogoIcon } from '@/components/logo';
// Import UI components.
import { Button } from '@/components/ui/button';
// Import authClient to call the email verification API.
import { authClient } from '@/lib/auth-client';
// Import loading spinner icon.
import { Loader2 } from 'lucide-react';
// Import Link for navigation.
import Link from 'next/link';
// Import useSearchParams to extract the token from the URL.
import { useSearchParams } from 'next/navigation';
// Import hooks for effect and state management.
import { Suspense, useEffect, useState } from 'react';
// Import toast for notifications.
import { toast } from 'sonner';

/**
 * VerifyEmailContent Component
 * Contains the logic for verifying the email based on URL parameters.
 */
function VerifyEmailContent() {
  // Hook to access URL parameters.
  const searchParams = useSearchParams();
  // State to track the verification status.
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  // State to store error messages if verification fails.
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Effect hook to run verification logic when searchParams change.
   */
  useEffect(() => {
    // Check if the URL already indicates a successful verification.
    const success = searchParams.get('success');
    if (success === 'true') {
      // Use queueMicrotask to avoid React state update warnings in some edge cases.
      queueMicrotask(() => setStatus('success'));
      toast.success('Email verified successfully!');
      return;
    }

    // Extract the verification token from the URL.
    const token = searchParams.get('token');
    if (!token) {
      // If no token is found, set error state.
      queueMicrotask(() => {
        setStatus('error');
        setErrorMessage('Verification token is missing.');
      });
      return;
    }

    // Call the authentication service to verify the email with the provided token.
    authClient
      .verifyEmail({
        query: {
          token,
        },
      })
      .then(({ error }) => {
        if (error) {
          // Failure case: update status and show error toast.
          setStatus('error');
          setErrorMessage(error.message || 'Verification failed.');
          toast.error(error.message || 'Verification failed');
        } else {
          // Success case: update status and show success toast.
          setStatus('success');
          toast.success('Email verified successfully!');
        }
      })
      .catch(() => {
        // Unexpected error case (e.g., network failure).
        setStatus('error');
        setErrorMessage('An unexpected error occurred.');
      });
  }, [searchParams]);

  /**
   * Render loading state while verification is in progress.
   */
  if (status === 'loading') {
    return (
      <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-8 shadow-md flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm">Verifying your email...</p>
      </div>
    );
  }

  /**
   * Render success message after verification.
   */
  if (status === 'success') {
    return (
      <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-8 shadow-md">
        {/* Logo and Home link. */}
        <Link href="/" aria-label="go home">
          <LogoIcon />
        </Link>
        <h1 className="mb-1 mt-4 text-xl font-semibold">
          Email verified successfully!
        </h1>
        <p className="text-sm">
          Your email has been verified. You can now access all features.
        </p>
        <div className="mt-6">
          {/* Link back to sign-in page. */}
          <Button asChild className="w-full">
            <Link href="/sign-in">Back to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Render failure message if verification failed.
   */
  return (
    <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-8 shadow-md">
      <Link href="/" aria-label="go home">
        <LogoIcon />
      </Link>
      <h1 className="mb-1 mt-4 text-xl font-semibold text-red-600">
        Verification Failed
      </h1>
      <p className="text-sm">{errorMessage}</p>
      <div className="mt-6 flex flex-col gap-3">
        {/* Options to retry or go back. */}
        <Button asChild className="w-full">
          <Link href="/sign-up">Try Signing Up Again</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">Back to Login</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Main VerifyEmailPage Component
 */
export default function VerifyEmailPage() {
  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      {/* Suspense is required for components using useSearchParams when using Next.js static rendering. */}
      <Suspense
        fallback={
          // Spinner while the verification logic is initializing.
          <div className="m-auto">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </section>
  );
}

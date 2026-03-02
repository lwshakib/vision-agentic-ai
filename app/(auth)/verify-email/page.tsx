'use client';

import { Logo as LogoIcon } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    authClient
      .verifyEmail({
        query: {
          token,
        },
      })
      .then(({ error }) => {
        if (error) {
          setStatus('error');
          setErrorMessage(error.message || 'Verification failed.');
          toast.error(error.message || 'Verification failed');
        } else {
          setStatus('success');
          toast.success('Email verified successfully!');
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage('An unexpected error occurred.');
      });
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-8 shadow-md flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm">Verifying your email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-8 shadow-md">
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
          <Button asChild className="w-full">
            <Link href="/sign-in">Back to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

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

export default function VerifyEmailPage() {
  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <Suspense
        fallback={
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

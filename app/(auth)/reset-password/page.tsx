'use client';

import { Logo as LogoIcon } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';

function ResetPasswordForm() {

  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token: searchParams.get('token') || '',
      });

      if (error) {
        toast.error(error.message || 'Failed to reset password');
        return;
      }

      setIsSuccess(true);
      toast.success('Password reset successfully');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-8 shadow-md">
        <Link href="/" aria-label="go home">
          <LogoIcon />
        </Link>
        <h1 className="mb-1 mt-4 text-xl font-semibold">
          Password reset successfully
        </h1>
        <p className="text-sm">You can now sign in with your new password.</p>

        <div className="mt-6">
          <Button asChild className="w-full">
            <Link href="/sign-in">Back to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]"
    >
      <div className="p-8 pb-6">
        <Link href="/" aria-label="go home">
          <LogoIcon />
        </Link>
        <h1 className="mb-1 mt-4 text-xl font-semibold">Reset Password</h1>
        <p className="text-sm">Enter your new password below</p>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              New Password
            </Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm New Password
            </Label>
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
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

export default function ResetPasswordPage() {
  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <Suspense
        fallback={
          <div className="m-auto">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </section>
  );
}

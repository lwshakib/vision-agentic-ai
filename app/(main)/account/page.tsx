'use client';

import React, { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { uploadToCloudinary } from '@/lib/cloudinary-upload';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Camera,
  Loader2,
  Mail,
  User as UserIcon,
  Smartphone,
  Laptop,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Type definitions for session and account data.
 */
interface SessionData {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AccountData {
  id: string;
  providerId: string;
  accountId: string;
}

/**
 * AccountPage Component
 * Provides a comprehensive interface for users to manage their profile,
 * including updating their avatar, name, email, and viewing active sessions.
 */
export default function AccountPage() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Local state for profile fields.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Sync local state when session data is loaded.
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      fetchSessions();
      fetchAccounts();
    }
  }, [session]);

  /**
   * Fetches active sessions from the auth client.
   */
  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (authClient as any).listSessions();
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  /**
   * Fetches connected accounts (OAuth providers).
   */
  const fetchAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (authClient as any).listAccounts();
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  /**
   * Handles user information updates (name, email).
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Update failed');
      }

      toast.success('Profile updated successfully');
      // Refresh the session to show updated data across the app.
      window.location.reload();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handles avatar image upload to Cloudinary and database update.
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Upload to Cloudinary.
      const uploadResult = await uploadToCloudinary(file);

      // 2. Update the user record with the new URL.
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadResult.secureUrl }),
      });

      if (!res.ok) throw new Error('Failed to update profile picture');

      toast.success('Profile picture updated');
      window.location.reload();
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload image',
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (isSessionPending) {
    return <AccountSkeleton />;
  }

  if (!session?.user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          Please sign in to view your account.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8">
      {/* Header Section with Glassmorphism feel */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and security settings.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile Sidebar: Avatar and basic stats */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-b from-sidebar-accent/50 to-background/50 backdrop-blur-sm">
            <CardHeader className="flex flex-col items-center pb-6 text-center">
              <div className="relative group mx-auto">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg shadow-black/10 transition-transform">
                  <AvatarImage src={session.user.image || ''} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {session.user.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Hover/Upload Overlay */}
                <label
                  htmlFor="avatar-upload"
                  className={cn(
                    'absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity cursor-pointer',
                    isUploading ? 'opacity-100' : 'group-hover:opacity-100',
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8" />
                  )}
                  <input
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
              <div className="mt-4 space-y-1">
                <CardTitle className="text-xl">{session.user.name}</CardTitle>
                <CardDescription className="font-medium">
                  {session.user.email}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-background/40">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <span>Email verified</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Forms and Details */}
        <div className="md:col-span-2 space-y-8">
          {/* Personal Information Form */}
          <Card className="border-none shadow-lg shadow-black/5 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your display name. Email address cannot be changed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      className="pl-10 bg-muted/50 cursor-not-allowed"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full sm:w-auto"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Connected Accounts List */}
          <Card className="border-none shadow-lg shadow-black/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Connected Accounts
              </CardTitle>
              <CardDescription>
                OAuth providers linked to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {isLoadingAccounts ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground italic">
                    No connected accounts.
                  </div>
                ) : (
                  <>
                    {accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-accent">
                            {acc.providerId === 'google' ? (
                              <svg className="size-5" viewBox="0 0 24 24">
                                <path
                                  fill="currentColor"
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                  fill="currentColor"
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                  fill="currentColor"
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                  fill="currentColor"
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                />
                              </svg>
                            ) : (
                              <Globe className="size-5" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium capitalize">
                              {acc.providerId}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-blue-500/10 text-blue-600 border-none"
                        >
                          Linked
                        </Badge>
                      </div>
                    ))}
                    {/* Placeholder for Microsoft */}
                    <div className="p-4 flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-accent">
                          <svg className="size-5" viewBox="0 0 23 23">
                            <path fill="#f3f3f3" d="M0 0h11v11H0z" />
                            <path fill="#f3f3f3" d="M12 0h11v11H12z" />
                            <path fill="#f3f3f3" d="M0 12h11v11H0z" />
                            <path fill="#f3f3f3" d="M12 12h11v11H12z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium">Microsoft</div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-dashed"
                      >
                        Available soon
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions List */}
          <Card className="border-none shadow-lg shadow-black/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Devices currently logged into your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {isLoadingSessions ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No active sessions found.
                  </div>
                ) : (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-4 flex items-center justify-between hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {sess.userAgent?.toLowerCase().includes('mobile') ? (
                            <Smartphone className="h-5 w-5 text-primary" />
                          ) : (
                            <Laptop className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {sess.ipAddress || 'Unknown IP'}
                            {sess.id === session.session.id && (
                              <Badge
                                variant="secondary"
                                className="bg-green-500/10 text-green-600 border-none text-[10px] py-0"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            {sess.userAgent || 'Web Browser'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(sess.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for the Account Page
 */
function AccountSkeleton() {
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <div className="md:col-span-2 space-y-8">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

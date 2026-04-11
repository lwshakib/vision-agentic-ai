'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToS3 } from '@/lib/s3-upload';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

interface ProfileImageUploadProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  onSuccess?: () => void;
}

export function ProfileImageUpload({
  src,
  name,
  className,
  onSuccess,
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Uploading profile picture...');

    try {
      // 1. Upload to S3
      const { secureUrl } = await uploadToS3(file);

      // 2. Update user profile via Better Auth
      const { error } = await authClient.updateUser({
        image: secureUrl,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update profile');
      }

      toast.success('Profile picture updated', { id: toastId });
      onSuccess?.();
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed', {
        id: toastId,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('relative group', className)}>
      <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-1 ring-border/50">
        <AvatarImage src={src || ''} className="object-cover" />
        <AvatarFallback className="text-3xl font-bold bg-primary/5 text-primary/80">
          {name?.substring(0, 2).toUpperCase() || '??'}
        </AvatarFallback>
      </Avatar>

      {/* Upload Overlay */}
      <label
        htmlFor="avatar-upload-input"
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-all cursor-pointer backdrop-blur-[2px]',
          isUploading ? 'opacity-100' : 'group-hover:opacity-100',
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Saving
            </span>
          </>
        ) : (
          <>
            <Camera className="h-8 w-8 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Change
            </span>
          </>
        )}
        <input
          id="avatar-upload-input"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleUpload}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}

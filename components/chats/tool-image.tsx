'use client';

import React from 'react';
import { DownloadIcon, ImageIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ToolImageProps {
  imageSrc: string;
  prompt?: string;
  options?: {
    width?: number;
    height?: number;
    model?: string;
  };
}

import { ToolCard } from './tool-card';

export function ToolImage({ imageSrc, prompt, options }: ToolImageProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `vision-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Image downloaded successfully');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download image');
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-2xl border border-muted/20 bg-muted/10 shadow-lg transition-all hover:border-primary/20 hover:shadow-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={prompt || 'Vision AI Generated Visual'}
        className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        loading="lazy"
      />
      
      {/* Floating Action Overlay */}
      <div className="absolute top-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Button
          size="icon"
          variant="secondary"
          className="size-10 rounded-full bg-background/80 shadow-xl backdrop-blur-md transition-all hover:bg-background hover:scale-110 active:scale-95 border border-muted"
          onClick={handleDownload}
          title="Download Image"
        >
          <DownloadIcon className="size-5" />
        </Button>
      </div>
    </div>
  );
}

'use client';

import { DownloadIcon } from 'lucide-react';
import { MessageAction } from '@/components/ai-elements/message';
import { toast } from 'sonner';

interface ToolImageProps {
  imageSrc: string;
  prompt?: string;
}

export function ToolImage({ imageSrc, prompt }: ToolImageProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download image');
    }
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-md border border-border/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={prompt || 'Generated image'}
        className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.01]"
      />
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <MessageAction
          label="Download"
          onClick={handleDownload}
          tooltip="Download this image"
          className="size-8 rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60 active:scale-95 border-none p-0"
        >
          <DownloadIcon className="size-4" />
        </MessageAction>
      </div>
    </div>
  );
}

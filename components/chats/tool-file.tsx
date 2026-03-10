'use client';

import React from 'react';
import { PaperclipIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ToolFileDownloadProps {
  url: string;
  fileName: string;
  type: string;
}

import { ToolCard } from './tool-card';
import { FileTextIcon } from 'lucide-react';

export function ToolFileDownload({ url, fileName, type }: ToolFileDownloadProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  return (
    <ToolCard
      icon={FileTextIcon}
      title="Document Generation"
      subtitle={fileName}
      badge={type.toUpperCase()}
      onDownload={handleDownload}
    >
      <div className="flex items-center gap-3 p-4 bg-muted/5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm border">
          <FileTextIcon className="size-5 text-primary" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-xs font-bold leading-tight">{fileName}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Ready for selection</span>
        </div>
      </div>
    </ToolCard>
  );
}

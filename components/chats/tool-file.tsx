'use client';

import React from 'react';
import { FileTextIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ToolFileDownloadProps {
  url: string;
  fileName: string;
  type: string;
}

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
      toast.success('Download processing...');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  return (
    <button
      onClick={handleDownload}
      title={`Download ${fileName}`}
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4 outline-none transition-all my-1.5"
    >
      <FileTextIcon className="size-4 opacity-70" />
      <span>{fileName}</span>
    </button>
  );
}

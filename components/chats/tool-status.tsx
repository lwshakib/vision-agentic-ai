'use client';

import { LoaderIcon } from 'lucide-react';
import { Shimmer } from '@/components/ai-elements/shimmer';
import React, { useState, useEffect } from 'react';

interface ToolActionStatusProps {
  loadingText?: string;
  error?: string;
  success?: boolean;
  failedTitle?: string;
}

export function ToolLoading({ loadingText }: { loadingText: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <LoaderIcon className="h-3 w-3 animate-spin text-muted-foreground" />
      <Shimmer className="text-xs font-medium text-muted-foreground">
        {loadingText}
      </Shimmer>
    </div>
  );
}

export function SearchLoading({ loadingText }: { loadingText: string }) {
  const [time, setTime] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
      setProgress((prev) => Math.min(70, prev + 5));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full p-3 rounded-md bg-muted/60 relative">
      <div className="absolute top-2 right-2 text-xs text-green-600">
        {time}s
      </div>
      <div className="flex items-center gap-2 mb-2">
        <LoaderIcon className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{loadingText}</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}

export function ToolError({ 
  error, 
  title = "Tool action failed" 
}: { 
  error?: string; 
  title?: string 
}) {
  return (
    <div className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="font-medium">{title}</p>
      {error && <p className="text-xs mt-1">{error}</p>}
    </div>
  );
}

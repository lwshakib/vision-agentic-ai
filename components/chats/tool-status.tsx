'use client';

import { LoaderIcon } from 'lucide-react';
import { Shimmer } from '@/components/ai-elements/shimmer';
import React from 'react';

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
  return (
    <div className="flex items-center gap-2 px-1">
      <LoaderIcon className="h-3 w-3 animate-spin text-muted-foreground" />
      <Shimmer className="text-xs font-medium text-muted-foreground">
        {loadingText}
      </Shimmer>
    </div>
  );
}

export function ToolError({
  error,
  title = 'Tool action failed',
}: {
  error?: string;
  title?: string;
}) {
  return (
    <div className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="font-medium">{title}</p>
      {error && <p className="text-xs mt-1">{error}</p>}
    </div>
  );
}

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DownloadIcon, LoaderIcon } from 'lucide-react';
import { Shimmer } from '@/components/ai-elements/shimmer';

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
  onDownload?: () => void;
  isLoading?: boolean;
  isSimpleLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ToolCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  onDownload,
  isLoading,
  isSimpleLoading,
  children,
  className,
}: ToolCardProps) {
  if (isSimpleLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-1 py-2 my-2 animate-in fade-in duration-500',
          className,
        )}
      >
        <LoaderIcon className="size-3.5 animate-spin text-muted-foreground/80" />
        <Shimmer className="text-[12px] font-medium tracking-tight text-muted-foreground/90">
          {title}
        </Shimmer>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('group relative my-4 space-y-3', className)}>
      {/* Header - Consolidated Premium Style */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm transition-colors',
              isLoading
                ? 'bg-muted animate-pulse'
                : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className={cn('size-4', isLoading && 'animate-spin-slow')} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold tracking-tight uppercase text-muted-foreground/80">
              {title}
            </span>
            {subtitle && (
              <p className="line-clamp-1 text-[10px] italic text-muted-foreground/60 leading-tight">
                &ldquo;{subtitle}&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {badge && !isLoading && (
            <span className="hidden sm:inline-flex rounded-full border bg-muted/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              {badge}
            </span>
          )}
          {onDownload && !isLoading && (
            <Button
              size="icon"
              variant="secondary"
              className="size-8 rounded-full bg-background/80 shadow-sm backdrop-blur-sm transition-all hover:bg-background hover:scale-110 active:scale-95 border border-muted"
              onClick={onDownload}
              title="Download results"
            >
              <DownloadIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Body Container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-card shadow-lg transition-all duration-300',
          isLoading
            ? 'border-muted/50 shadow-none'
            : 'border-muted/20 group-hover:border-primary/20 group-hover:shadow-xl',
        )}
      >
        {children}
      </div>
    </div>
  );
}

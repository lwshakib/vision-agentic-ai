'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ConversationSkeleton() {
  return (
    <div className="flex flex-col gap-12 py-8">
      {Array.from({ length: 5 }).map((_, index) => {
        const isUser = index % 2 === 1;
        return (
          <div
            key={index}
            className={cn(
              'flex items-start gap-4',
              isUser ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-muted/60" />
            <div
              className={cn(
                'space-y-3 flex-1 max-w-[80%]',
                isUser ? 'flex flex-col items-end' : '',
              )}
            >
              <Skeleton className={cn('h-4', isUser ? 'w-24' : 'w-32')} />
              <div
                className={cn(
                  'space-y-2 w-full',
                  isUser ? 'flex flex-col items-end' : '',
                )}
              >
                <Skeleton className={cn('h-4', isUser ? 'w-full' : 'w-5/6')} />
                <Skeleton className={cn('h-4', isUser ? 'w-5/6' : 'w-full')} />
                <Skeleton className={cn('h-4 w-2/3')} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChatInputSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/40 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

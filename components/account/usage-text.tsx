'use client';

import { useChatStore } from '@/hooks/use-chat-store';
import { Sparkles } from 'lucide-react';

export function UsageText() {
  const { messageCredits } = useChatStore();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
      <Sparkles className="size-3.5 text-primary" />
      <span className="text-xs font-bold text-primary">
        {messageCredits ?? 0} / 10 Credits
      </span>
    </div>
  );
}

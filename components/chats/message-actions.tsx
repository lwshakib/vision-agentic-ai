'use client';

import {
  CopyIcon,
  RotateCcwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from 'lucide-react';
import { useState } from 'react';
import {
  MessageAction,
  MessageActions,
} from '@/components/ai-elements/message';
import type { ChatMessage } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';

interface TextPart {
  type: string;
  text?: string;
}

interface MessageActionsListProps {
  message: ChatMessage;
  onCopy: (text: string) => void;
  onRetry?: () => void;
}

export function MessageActionsList({
  message,
  onCopy,
  onRetry,
}: MessageActionsListProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  if (message.isStreaming) return null;

  const isAssistant = message.role === 'assistant';

  const fullText = Array.isArray(message.parts)
    ? (message.parts as TextPart[])
        .filter((p) => p.type === 'text' && p.text)
        .map((p) => (p.text ?? '').replace(/<title>.*?<\/title>/gs, '').trim())
        .filter(Boolean)
        .join('\n\n')
    : '';

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback((prev) => (prev === type ? null : type));
  };

  return (
    <MessageActions
      className={cn(
        'mt-1 opacity-0 transition-opacity group-hover:opacity-100',
        message.role === 'user' ? 'justify-end' : '',
      )}
    >
      {fullText && (
        <MessageAction
          label="Copy"
          onClick={() => onCopy(fullText)}
          tooltip="Copy this response"
        >
          <CopyIcon className="size-4" />
        </MessageAction>
      )}

      {isAssistant && onRetry && (
        <MessageAction
          label="Regenerate"
          onClick={onRetry}
          tooltip="Regenerate response"
        >
          <RotateCcwIcon className="size-4" />
        </MessageAction>
      )}

      {isAssistant && (
        <>
          <MessageAction
            label="Good response"
            onClick={() => handleFeedback('up')}
            tooltip="Good response"
            className={cn(
              feedback === 'up' &&
                'text-green-600 bg-green-50 dark:bg-green-900/20',
            )}
          >
            <ThumbsUpIcon
              className={cn('size-4', feedback === 'up' && 'fill-current')}
            />
          </MessageAction>

          <MessageAction
            label="Bad response"
            onClick={() => handleFeedback('down')}
            tooltip="Bad response"
            className={cn(
              feedback === 'down' &&
                'text-red-600 bg-red-50 dark:bg-red-900/20',
            )}
          >
            <ThumbsDownIcon
              className={cn('size-4', feedback === 'down' && 'fill-current')}
            />
          </MessageAction>
        </>
      )}
    </MessageActions>
  );
}

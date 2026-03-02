'use client';

import { CopyIcon, RotateCcw } from 'lucide-react';
import {
  MessageAction,
  MessageActions,
} from '@/components/ai-elements/message';
import type { UIMessage } from 'ai';

interface TextPart {
  type: string;
  text?: string;
}

interface MessageActionsListProps {
  message: UIMessage;
  onCopy: (text: string) => void;
  onRetry?: () => void;
}

export function MessageActionsList({
  message,
  onCopy,
  onRetry,
}: MessageActionsListProps) {
  if (message.role !== 'assistant') return null;

  const fullText = Array.isArray(message.parts)
    ? (message.parts as TextPart[])
        .filter((p) => p.type === 'text' && p.text)
        .map((p) => (p.text ?? '').replace(/<title>.*?<\/title>/gs, '').trim())
        .filter(Boolean)
        .join('\n\n')
    : '';

  if (!fullText) return null;

  return (
    <MessageActions className="mt-1">
      <MessageAction
        label="Copy"
        onClick={() => onCopy(fullText)}
        tooltip="Copy this response"
      >
        <CopyIcon className="size-4" />
      </MessageAction>
      {onRetry && (
        <MessageAction
          label="Retry"
          onClick={onRetry}
          tooltip="Regenerate response"
        >
          <RotateCcw className="size-4" />
        </MessageAction>
      )}
    </MessageActions>
  );
}

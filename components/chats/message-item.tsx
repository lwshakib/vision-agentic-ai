'use client';

import React from 'react';
import {
  Message,
  MessageAttachment,
  MessageAttachments,
} from '@/components/ai-elements/message';
import { ChatMessageParts } from './message-parts';
import { MessageActionsList } from './message-actions';
import type { ChatMessage } from '@/hooks/use-chat';

interface MessagePartItem {
  type: string;
  [key: string]: unknown;
  id?: string;
  publicId?: string;
  url?: string;
  name?: string;
  filename?: string;
  mediaType?: string;
}

interface MessageWithFiles extends ChatMessage {
  files?: MessagePartItem[];
  version?: number | string;
}

interface MessageItemProps {
  message: ChatMessage;
  onCopy: (text: string) => void;
  onRetry?: () => void;
}

export function ChatMessageItem({
  message,
  onCopy,
  onRetry,
}: MessageItemProps) {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const msgWithFiles = message as MessageWithFiles;
  const messageFiles = msgWithFiles.files || [];
  const fileParts =
    parts.filter(
      (part: MessagePartItem) =>
        part.type === 'file' || part.type === 'attachment',
    ) || [];

  // De-duplicate files between message.files and message.parts
  const uniqueFilesMap = new Map<string, MessagePartItem>();

  // Helper to add a file to the map if it's unique
  const addFile = (file: MessagePartItem) => {
    const key = file.id || file.publicId || file.url;
    if (key && !uniqueFilesMap.has(key)) {
      uniqueFilesMap.set(key, {
        type: file.type,
        id: key,
        url: file.url || '',
        name: file.name || file.filename,
        filename: file.filename || file.name,
        mediaType: file.mediaType || file.type,
      });
    }
  };

  messageFiles.forEach(addFile);
  fileParts.forEach(addFile);

  const allFiles = Array.from(uniqueFilesMap.values());

  return (
    <Message from={message.role} key={message.id}>
      {allFiles.length > 0 && (
        <MessageAttachments className="mb-2">
          {allFiles.map((file) => (
            <MessageAttachment
              key={file.id || file.url}
              data={{
                url: file.url || '',
                mediaType:
                  file.mediaType || file.type || 'application/octet-stream',
                filename: file.name || file.filename || '',
              }}
            />
          ))}
        </MessageAttachments>
      )}

      <ChatMessageParts
        messageId={message.id}
        parts={parts}
        isVersioned={!!msgWithFiles.version}
        version={msgWithFiles.version}
        isStreaming={message.isStreaming}
      />

      <MessageActionsList message={message} onCopy={onCopy} onRetry={onRetry} />
    </Message>
  );
}

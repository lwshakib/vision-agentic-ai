'use client';

import React from 'react';
import { Message, MessageAttachment, MessageAttachments } from '@/components/ai-elements/message';
import { ChatMessageParts } from './message-parts';
import { MessageActionsList } from './message-actions';
import type { UIMessage } from 'ai';

interface MessagePartItem {
  type: string;
  id?: string;
  url?: string;
  name?: string;
  filename?: string;
  mediaType?: string;
}

interface MessageWithFiles extends UIMessage {
  files?: MessagePartItem[];
  version?: number | string;
}

interface MessageItemProps {
  message: UIMessage;
  onCopy: (text: string) => void;
  onRetry?: () => void;
}

export function ChatMessageItem({ message, onCopy, onRetry }: MessageItemProps) {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const msgWithFiles = message as MessageWithFiles;
  const messageFiles = msgWithFiles.files || [];
  const fileParts = parts.filter((part: MessagePartItem) => part.type === 'file' || part.type === 'attachment') || [];

  const allFiles = [
    ...messageFiles,
    ...fileParts.map((part: MessagePartItem) => ({
      type: part.type,
      id: part.id || part.url,
      url: part.url || '',
      name: part.name || part.filename,
      filename: part.filename || part.name,
      mediaType: part.mediaType || part.type,
    })),
  ];

  return (
    <Message from={message.role} key={message.id}>
      {allFiles.length > 0 && (
        <MessageAttachments className="mb-2">
          {allFiles.map((file) => (
            <MessageAttachment
              key={file.id || file.url}
              data={{
                type: 'file',
                url: file.url || '',
                mediaType: file.mediaType || file.type || 'application/octet-stream',
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
      />

      <MessageActionsList message={message} onCopy={onCopy} onRetry={onRetry} />
    </Message>
  );
}

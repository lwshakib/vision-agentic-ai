'use client';

import React from 'react';
import { Message, MessageAttachment, MessageAttachments } from '@/components/ai-elements/message';
import { ChatMessageParts } from './message-parts';
import { MessageActionsList } from './message-actions';

interface MessageItemProps {
  message: any;
  onCopy: (text: string) => void;
  onRetry?: () => void;
}

export function ChatMessageItem({ message, onCopy, onRetry }: MessageItemProps) {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const messageFiles = (message as any).files || [];
  const fileParts = parts.filter((part: any) => part.type === 'file' || part.type === 'attachment') || [];

  const allFiles = [
    ...messageFiles,
    ...fileParts.map((part: any) => ({
      id: part.id || part.url,
      url: part.url,
      name: part.name || part.filename,
      mediaType: part.mediaType || part.type,
    })),
  ];

  return (
    <Message from={message.role} key={message.id}>
      {allFiles.length > 0 && (
        <MessageAttachments className="mb-2">
          {allFiles.map((file: any) => (
            <MessageAttachment
              key={file.id || file.url}
              data={{
                type: 'file',
                url: file.url,
                mediaType: file.mediaType || file.type || 'application/octet-stream',
                filename: file.name || file.filename,
              }}
            />
          ))}
        </MessageAttachments>
      )}
      
      <ChatMessageParts 
        messageId={message.id} 
        parts={parts} 
        isVersioned={!!(message as any).version} 
        version={(message as any).version} 
      />

      <MessageActionsList message={message} onCopy={onCopy} onRetry={onRetry} />
    </Message>
  );
}

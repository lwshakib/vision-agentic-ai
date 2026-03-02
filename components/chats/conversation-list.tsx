'use client';

import React, { useRef, useEffect } from 'react';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { MessageSquare } from 'lucide-react';
import { ChatMessageItem } from './message-item';
import { ConversationSkeleton } from './chat-skeleton';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { ThinkingDots } from '@/components/thinking-dots';
import type { UIMessage } from 'ai';

interface ChatConversationListProps {
  messages: UIMessage[];
  status: string;
  isLoadingHistory: boolean;
  onCopy: (text: string) => void;
  onRetry?: (messageIndex: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ChatConversationList({
  messages,
  status,
  isLoadingHistory,
  onCopy,
  onRetry,
  emptyTitle = "Start a conversation",
  emptyDescription = "Type a message below to begin chatting"
}: ChatConversationListProps) {
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (isLoadingHistory) {
      initialScrollDone.current = false;
    }
  }, [isLoadingHistory]);

  useEffect(() => {
    if (!isLoadingHistory && listEndRef.current) {
      const isInitialScroll = !initialScrollDone.current;
      const scroll = () => {
        listEndRef.current?.scrollIntoView({
          behavior: isInitialScroll || status === 'streaming' ? 'auto' : 'smooth',
          block: 'end',
        });
        if (isInitialScroll && messages.length > 0) {
          initialScrollDone.current = true;
        }
      };

      const raf = requestAnimationFrame(() => {
        setTimeout(scroll, isInitialScroll ? 0 : 50);
        if (isInitialScroll) {
          setTimeout(scroll, 200);
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isLoadingHistory, messages, status]);

  return (
    <Conversation>
      <ConversationContent>
        {isLoadingHistory ? (
          <ConversationSkeleton />
        ) : messages.length === 0 ? (
          <ConversationEmptyState
            icon={<MessageSquare className="size-12" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessageItem 
                key={message.id} 
                message={message} 
                onCopy={onCopy} 
                onRetry={onRetry ? () => onRetry(index) : undefined}
              />
            ))}

            {status === 'submitted' && (
              <Message from="assistant" key="thinking-indicator">
                <MessageContent>
                  <ThinkingDots />
                </MessageContent>
              </Message>
            )}
          </>
        )}
        <div ref={listEndRef} />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

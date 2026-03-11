/**
 * ChatConversationList Component
 * This component manages the display of the message history within a chat session.
 * It handles automatic scrolling, loading skeletons, and empty state UI.
 */

'use client';

import React, { useRef, useEffect } from 'react';
// Import specialized AI UI elements for conversation flow.
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { MessageSquare } from 'lucide-react';
// Import individual message item and loading skeleton.
// Import individual message item and loading skeleton.
import { ChatMessageItem } from './message-item';
import { ConversationSkeleton } from './chat-skeleton';
// Import the animated dots shown while waiting for an AI response.
import type { ChatMessage, ChatStatus } from '@/hooks/use-chat';

/**
 * Interface for the list component's props.
 */
interface ChatConversationListProps {
  messages: ChatMessage[]; // The actual array of chat messages.
  status: ChatStatus; // The current chat status (idle, submitted, streaming).
  isLoadingHistory: boolean; // Flag for initial data fetch state.
  onCopy: (text: string) => void; // Clipboard callback.
  onRetry?: (messageIndex: number) => void; // Logic for re-running a failed prompt.
  emptyTitle?: string; // Customizable empty state heading.
  emptyDescription?: string; // Customizable empty state subtitle.
}

/**
 * Renders a scrollable container for chat messages.
 */
export function ChatConversationList({
  messages,
  status,
  isLoadingHistory,
  onCopy,
  onRetry,
  emptyTitle = 'Start a conversation',
  emptyDescription = 'Type a message below to begin chatting',
}: ChatConversationListProps) {
  // Ref to the dummy div at the end of the list used for scrolling into view.
  const listEndRef = useRef<HTMLDivElement | null>(null);
  // Ref to track if we've handled the very first scroll to bottom.
  const initialScrollDone = useRef(false);

  /**
   * Reset the initial scroll tracker if history starts loading again (e.g., on chat switch).
   */
  useEffect(() => {
    if (isLoadingHistory) {
      initialScrollDone.current = false;
    }
  }, [isLoadingHistory]);

  /**
   * Primary effect for managing the auto-scroll behavior.
   */
  useEffect(() => {
    if (!isLoadingHistory && listEndRef.current) {
      const isInitialScroll = !initialScrollDone.current;

      const scroll = () => {
        listEndRef.current?.scrollIntoView({
          behavior: isInitialScroll || status === 'streaming' ? 'auto' : 'smooth',
          block: 'end',
        });

        // Mark initial scroll as complete if we actually have content.
        if (isInitialScroll && messages.length > 0) {
          initialScrollDone.current = true;
        }
      };

      // Ensure the DOM has finished painting before attempting to scroll.
      const raf = requestAnimationFrame(() => {
        setTimeout(scroll, isInitialScroll ? 0 : 30);
        
        // Double-check scroll on initial load to account for images or late renders.
        if (isInitialScroll) {
          setTimeout(scroll, 150);
          setTimeout(scroll, 500);
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isLoadingHistory, messages, status]);

  return (
    <Conversation>
      <ConversationContent className="pb-0 pt-4">
        {/* State 1: Loading History. Show placeholders. */}
        {isLoadingHistory ? (
          <ConversationSkeleton />
        ) : messages.length === 0 ? (
          <ConversationEmptyState
            icon={<MessageSquare className="size-12" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          /* State 3: Active Conversation. */
          <>
            {/* Render each message using the specialized item component. */}
            {messages.map((message, index) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                onCopy={onCopy}
                onRetry={onRetry ? () => onRetry(index) : undefined}
              />
            ))}
          </>
        )}
        {/* Invisible anchor for the scroll-into-view logic and bottom spacing. */}
        {/* Using a tall spacer ensures scrollIntoView reaches the absolute bottom of the container. */}
        <div ref={listEndRef} className="h-32 w-full shrink-0" />
      </ConversationContent>
      {/* Optional button to manually reset scroll to bottom. */}
      <ConversationScrollButton />
    </Conversation>
  );
}

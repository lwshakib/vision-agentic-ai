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
import { ChatMessageItem } from './message-item';
import { ConversationSkeleton } from './chat-skeleton';
// Import low-level message display components.
import { Message, MessageContent } from '@/components/ai-elements/message';
// Import the animated dots shown while waiting for an AI response.
import { ThinkingDots } from '@/components/thinking-dots';
import type { UIMessage } from 'ai';

/**
 * Interface for the list component's props.
 */
interface ChatConversationListProps {
  messages: UIMessage[]; // The actual array of chat messages.
  status: string; // The current chat status (idle, submitted, streaming).
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
        // Scroll to the end of the list.
        // Use 'auto' (instant) for initial loads or fast streaming; 'smooth' for casual additions.
        listEndRef.current?.scrollIntoView({
          behavior:
            isInitialScroll || status === 'streaming' ? 'auto' : 'smooth',
          block: 'end',
        });

        // Mark initial scroll as complete if we actually have content.
        if (isInitialScroll && messages.length > 0) {
          initialScrollDone.current = true;
        }
      };

      // Ensure the DOM has finished painting before attempting to scroll.
      const raf = requestAnimationFrame(() => {
        setTimeout(scroll, isInitialScroll ? 0 : 50);
        // Double-tap scroll on initial load to handle image heights or delayed renders.
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
        {/* State 1: Loading History. Show placeholders. */}
        {isLoadingHistory ? (
          <ConversationSkeleton />
        ) : /* State 2: No Messages. Show welcome UI. */
        messages.length === 0 ? (
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

            {/* If a message was just submitted but streaming hasn't started yet, show "Thinking...". */}
            {status === 'submitted' && (
              <Message from="assistant" key="thinking-indicator">
                <MessageContent>
                  <ThinkingDots />
                </MessageContent>
              </Message>
            )}
          </>
        )}
        {/* Invisible anchor for the scroll-into-view logic. */}
        <div ref={listEndRef} />
      </ConversationContent>
      {/* Optional button to manually reset scroll to bottom. */}
      <ConversationScrollButton />
    </Conversation>
  );
}

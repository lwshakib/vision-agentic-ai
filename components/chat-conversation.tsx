/**
 * ChatConversationView Component
 * This is the high-level orchestration component for the chat interface.
 * It combines the message list, tool loading states, and input systems into a single view.
 */

'use client';

// Import sub-components for input and message display.
import ChatInput from '@/components/chat-input';
import { ChatConversationList as ConversationList } from './chats/conversation-list';
// Import skeleton loaders for a smooth initial experience.
import { ConversationSkeleton, ChatInputSkeleton } from './chats/chat-skeleton';
// Import specialized loading indicators for AI tool usage.
import {
  SearchLoading as SearchLoadingUI,
  ToolLoading as ToolLoadingUI,
} from './chats/tool-status';
import type { ChatMessage, ChatStatus } from '@/hooks/use-chat';

export type { ChatMessage };

// Detailed props interface for the main view.
type ChatConversationViewProps = {
  messages: ChatMessage[]; // Array of message objects to render.
  status: ChatStatus; // Current status of the AI (e.g., 'generating', 'idle').
  isLoadingHistory: boolean; // Whether historical messages are still being fetched from the DB.
  onSend: (
    text: string,
    files?: Array<{
      url: string;
      name: string;
      type: string;
      publicId: string;
    }>,
  ) => void | Promise<void>; // Callback for dispatching new user messages.
  onCopy: (text: string) => void | Promise<void>; // Utility for copying message text.
  onRetry?: (messageIndex: number) => void; // Optional logic for re-triggering a failed AI response.
  onStop?: () => void; // Logic to stop generating responses.
  isVoiceMode?: boolean;
  onVoiceModeChange?: (value: boolean) => void;
  isSpeaking?: boolean;
};

/**
 * Convenience wrapper for the Web Search loading indicator.
 */
export const WebSearchLoading = ({ loadingText }: { loadingText: string }) => (
  <SearchLoadingUI loadingText={loadingText} />
);

/**
 * Convenience wrapper for the Image Generation (or generic tool) loading indicator.
 */
export const ImageGenerationLoading = ({
  loadingText,
}: {
  loadingText: string;
}) => <ToolLoadingUI loadingText={loadingText} />;

export function ChatConversationView({
  messages,
  status,
  isLoadingHistory,
  onSend,
  onCopy,
  onRetry,
  onStop,
  isVoiceMode,
  onVoiceModeChange,
  isSpeaking,
}: ChatConversationViewProps) {
  return (
    // Main layout container: full screen height, vertical flex.
    <div className="flex min-h-screen flex-col bg-background">
      {/* Scrollable area centered via max-width and margin-auto. */}
      <div className="flex flex-1 min-h-0 max-w-3xl mx-auto w-full">
        <ConversationList
          messages={messages}
          status={status}
          isLoadingHistory={isLoadingHistory}
          onCopy={onCopy}
          onRetry={onRetry}
        />
      </div>

      {/* Floating glassmorphism footer containing the chat input. */}
      <div className="sticky bottom-0 flex w-full items-center justify-center bg-background/80 px-4 pb-6 pt-4 backdrop-blur">
        <div className="w-full max-w-3xl">
          <ChatInput
            onSend={onSend}
            onStop={onStop}
            placeholder="Send a message"
            isGenerating={status === 'submitted' || status === 'streaming'}
            isVoiceMode={isVoiceMode}
            onVoiceModeChange={onVoiceModeChange}
            isSpeaking={isSpeaking}
          />
        </div>
      </div>
    </div>
  );
}

// Export skeleton components for use in dynamic route loading states.
export { ConversationSkeleton as ChatSkeleton, ChatInputSkeleton };

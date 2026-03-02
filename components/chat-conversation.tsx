'use client';

import ChatInput from '@/components/chat-input';
import { ChatConversationList as ConversationList } from './chats/conversation-list';
import { ConversationSkeleton, ChatInputSkeleton } from './chats/chat-skeleton';
import { SearchLoading as SearchLoadingUI, ToolLoading as ToolLoadingUI } from './chats/tool-status';
import type { UIMessage } from 'ai';

export type ChatMessage = UIMessage;

type ChatConversationViewProps = {
  messages: ChatMessage[];
  status: string;
  isLoadingHistory: boolean;
  onSend: (
    text: string,
    files?: Array<{
      url: string;
      name: string;
      type: string;
      publicId: string;
    }>,
  ) => void | Promise<void>;
  onCopy: (text: string) => void | Promise<void>;
  onRetry?: (messageIndex: number) => void;
};

export const WebSearchLoading = ({ loadingText }: { loadingText: string }) => (
  <SearchLoadingUI loadingText={loadingText} />
);

export const ImageGenerationLoading = ({ loadingText }: { loadingText: string }) => (
  <ToolLoadingUI loadingText={loadingText} />
);

export function ChatConversationView({
  messages,
  status,
  isLoadingHistory,
  onSend,
  onCopy,
  onRetry,
}: ChatConversationViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 min-h-0 max-w-3xl mx-auto w-full">
        <ConversationList
          messages={messages}
          status={status}
          isLoadingHistory={isLoadingHistory}
          onCopy={onCopy}
          onRetry={onRetry}
        />
      </div>

      <div className="sticky bottom-0 flex w-full items-center justify-center bg-background/80 px-4 pb-6 pt-4 backdrop-blur">
        <div className="w-full max-w-3xl">
          <ChatInput onSend={onSend} placeholder="Send a message" />
        </div>
      </div>
    </div>
  );
}

export { ConversationSkeleton as ChatSkeleton, ChatInputSkeleton };

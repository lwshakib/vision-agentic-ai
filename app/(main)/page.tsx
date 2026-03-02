/**
 * Home Page (Chat Initialization)
 * This component provides the initial chat interface where users can start a new permanent or temporary chat.
 */

'use client';

// Import essential React and UI hooks.
import { useMemo, useState, Suspense } from 'react';
// Import custom ChatInput component for user message entry.
import ChatInput from '@/components/chat-input';
// Import Next.js navigation hooks.
import { useRouter, useSearchParams } from 'next/navigation';
// Import AI SDK hooks for handling real-time chat interactions.
import { useChat } from '@ai-sdk/react';
// Import the default transport configuration for the AI SDK.
import { DefaultChatTransport } from 'ai';
// Import toast for notifications.
import { toast } from 'sonner';
// Import components for viewing conversations.
import {
  ChatConversationView,
  type ChatMessage,
} from '@/components/chat-conversation';
// Import global store for managing chat history/sidebar state.
import { useChatStore } from '@/lib/store';

/**
 * Type definition for file metadata shared between the input and server.
 */
type FileInfo = {
  url: string; // File location URL.
  name: string; // Original filename.
  type: string; // MIME type.
  publicId: string; // Unique asset ID from storage provider.
};

/**
 * PromptInputContent Component
 * The main UI for starting a new chat session.
 */
function PromptInputContent() {
  const userName = 'Professor'; // Static user name for demonstration.
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine if the current view should be a temporary (non-persisted) chat.
  const isTemporaryChat = searchParams?.get('temporary-chat') === 'true';

  // If temporary chat flag is present, render the TemporaryChat sub-component.
  if (isTemporaryChat) {
    return <TemporaryChat />;
  }

  /**
   * Handles starting a new permanent chat.
   * @param message - Initial user message.
   * @param files - Optional attached files.
   */
  const handleSend = async (message: string, files?: FileInfo[]) => {
    // Call API to initialize a new chat record in the database.
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error('Failed to start chat');
      return;
    }

    // Optimistically update the sidebar store with the new chat entry.
    useChatStore.getState().addChat({
      id: data.chatId,
      title: 'New chat',
      url: `/~/${data.chatId}`,
    });

    // Extract initial message and files into URL parameters for the redirect.
    const params = new URLSearchParams();
    params.set('message', message);

    // Encode file information if present.
    if (files && files.length > 0) {
      params.set('files', encodeURIComponent(JSON.stringify(files)));
    }

    // Redirect the user to the newly created chat details page.
    router.push(`/~/${data.chatId}?${params.toString()}`);
  };

  return (
    // Centered layout for the initial prompt input.
    <div className="bg-background min-h-screen w-full flex flex-col items-center justify-center px-4 py-6 text-center">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        {/* Welcome message. */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Good to see you, {userName}.
          </p>
          <p className="text-lg font-medium mt-1">
            What&apos;s the agenda today, or what are you working on?
          </p>
        </div>

        {/* Input area. */}
        <div className="w-full max-w-(--breakpoint-md) mx-auto">
          <ChatInput onSend={handleSend} />
        </div>
      </div>
    </div>
  );
}

/**
 * TemporaryChat Component
 * Handles a chat session that is NOT saved to the database.
 */
function TemporaryChat() {
  // Loading state for history (not used here but maintained for component consistency).
  const [isLoadingHistory] = useState(false);

  // Memoize the chat transport to prevent unnecessary re-creations.
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/generate', // Directly calls the AI generation endpoint.
      }),
    [],
  );

  // Use the AI SDK's chat hook for state and messaging management.
  const { sendMessage, messages, status } = useChat({
    transport: chatTransport,
    onError: (err) => {
      console.error('Temporary chat error:', err);
      toast.error('Internal server error');
    },
  });

  /**
   * Helper to copy message text to clipboard.
   */
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy');
    }
  };

  /**
   * Handles sending a message in a temporary chat.
   */
  const handleSend = async (
    text: string,
    files?: Array<{
      url: string;
      name: string;
      type: string;
      publicId: string;
    }>,
  ) => {
    // If files are attached, include them in the message payload.
    if (files && files.length > 0) {
      sendMessage({
        text: text || 'See attached files',
        files: files.map((file) => ({
          id: file.publicId,
          name: file.name,
          url: file.url,
          type: 'file',
          mediaType: file.type || 'application/octet-stream',
        })),
      });
    } else {
      // Otherwise just send the plain text.
      sendMessage({
        text,
      });
    }
  };

  return (
    // Render the chat view component with temporary message state.
    <ChatConversationView
      messages={messages as unknown as ChatMessage[]}
      status={status}
      isLoadingHistory={isLoadingHistory}
      onSend={handleSend}
      onCopy={handleCopy}
    />
  );
}

/**
 * Exported Component
 * Wraps the content in Suspense to handle useSearchParams.
 */
export default function PromptInputWithActions() {
  return (
    <Suspense
      // Simple loading skeleton while search parameters are being processed.
      fallback={
        <div className="bg-background min-h-screen w-full flex flex-col items-center justify-center px-4 py-6 text-center">
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Good to see you, Professor.
              </p>
              <p className="text-lg font-medium mt-1">
                What&apos;s the agenda today, or what are you working on?
              </p>
            </div>
            <div className="w-full max-w-(--breakpoint-md) mx-auto">
              <div className="animate-pulse bg-muted rounded-lg h-12 w-full" />
            </div>
          </div>
        </div>
      }
    >
      {/* Main content. */}
      <PromptInputContent />
    </Suspense>
  );
}

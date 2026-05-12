/**
 * Chat Details Page
 * This client-side component handles the rendering and logic for a specific chat session.
 * It manages message history loading, real-time messaging, and persistence.
 */

'use client';

// Import React hooks for lifecycle management and optimization.
import { useEffect, useRef, useState, useCallback } from 'react';
// Import Next.js hooks for accessing URL parameters and search queries.
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useChat } from '@/hooks/use-chat';
import { useLiveAPI } from '@/hooks/use-live-api';
import { nanoid } from 'nanoid';
import ChatInput from '@/components/chats/chat-input';
import { ChatConversationList } from '@/components/chats/conversation-list';
import { toast } from 'sonner';
import { useChatStore } from '@/hooks/use-chat-store';

/**
 * Interface representing a component part of a chat message (text, file, etc.).
 */
interface MessagePart {
  type: string;
  text?: string;
  id?: string;
  publicId?: string;
  name?: string;
  filename?: string;
  url?: string;
  mediaType?: string;
}

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { setChatTitle, messageCredits, setMessageCredits } = useChatStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Refs to track the currently active optimistic message for in-place streaming
  const activeMessageIdRef = useRef<string | null>(null);
  const activeMessageRoleRef = useRef<'user' | 'assistant' | null>(null);
  const isMessageSavedRef = useRef<boolean>(false);

  /**
   * Helper function to save a message to the database
   */
  const saveMessageToDB = useCallback(
    async (text: string, role: string) => {
      if (!text.trim() || !chatId) return;

      console.log(
        `💾 Saving final ${role} message to DB: "${text.substring(0, 30)}..."`,
      );
      try {
        const res = await fetch(`/api/chat/${chatId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            parts: [{ type: 'text', text }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`✅ ${role} message saved successfully`);
          if (data.title) setChatTitle(chatId, data.title);
        } else {
          console.error(`❌ Failed to save ${role} message:`, res.status);
        }
      } catch (err) {
        console.error(`❌ Error saving ${role} message:`, err);
      }
    },
    [chatId, setChatTitle],
  );

  const [isVoiceMode, setIsVoiceMode] = useState(
    searchParams.get('voiceMode') === 'true',
  );

  // Reset active transcripts when voice mode toggles
  useEffect(() => {
    activeMessageIdRef.current = null;
    activeMessageRoleRef.current = null;
    isMessageSavedRef.current = false;
  }, [isVoiceMode]);

  const {
    connect: connectLive,
    disconnect: disconnectLive,
    isConnected: isLiveConnected,
    isSpeaking: isLiveSpeaking,
    volume: liveVolume,
    onTranscription,
    onTurnComplete,
  } = useLiveAPI();

  const { sendMessage, messages, setMessages, status, stop } = useChat({
    headers: {
      'X-Chat-Id': chatId || '',
    },
    onError: (err) => {
      console.error('Chat error:', err);
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.error === 'Credit exhausted') {
          setIsVoiceMode(false);
          toast.error('Limit Reached', {
            description:
              errorData.message ||
              'You have reached your daily limit of 10 messages.',
            action: {
              label: 'Upgrade',
              onClick: () => router.push('/pro'),
            },
          });
          return;
        }
      } catch {
        // Fallback
      }
      toast.error('Internal server error');
    },
    onFinish: (message) => {
      const parts = message.parts ?? [];
      const content = message.content ?? '';

      if (!chatId || (parts.length === 0 && !content)) return;

      void fetch(`/api/chat/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          parts,
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.title) {
              setChatTitle(chatId, data.title);
            }
          }
        })
        .catch((err) =>
          console.error('Failed to save assistant message:', err),
        );
    },
  });

  const handleStop = useCallback(() => {
    stop();
    if (isVoiceMode) {
      disconnectLive();
      setIsVoiceMode(false);
    }
  }, [stop, isVoiceMode, disconnectLive]);

  // Voice Mode lifecycle
  useEffect(() => {
    if (isVoiceMode && !isLiveConnected) {
      console.log('🔄 Voice Mode: ON (Connecting...)');
      connectLive();
    } else if (!isVoiceMode && isLiveConnected) {
      console.log('🔄 Voice Mode: OFF');
      disconnectLive();
    }
  }, [isVoiceMode, isLiveConnected, connectLive, disconnectLive]);

  // Live Transcription Handling - Direct Streaming into Message Bubbles
  useEffect(() => {
    onTranscription((text, isFinal, role, isCumulative) => {
      if (!text && !isFinal) return;

      // 1. Role Switch or New Turn Detection
      if (activeMessageRoleRef.current !== role) {
        // If we were streaming something else, finalize it
        if (activeMessageIdRef.current && !isMessageSavedRef.current) {
          const lastMsg = messages.find(
            (m) => m.id === activeMessageIdRef.current,
          );
          if (lastMsg && lastMsg.content.trim()) {
            void saveMessageToDB(lastMsg.content, lastMsg.role);
          }
        }

        const newId = nanoid();
        activeMessageIdRef.current = newId;
        activeMessageRoleRef.current = role;
        isMessageSavedRef.current = false;

        setMessages((prev) => [
          ...prev,
          {
            id: newId,
            role,
            content: text,
            isStreaming: true,
            parts: [{ type: 'text', text }],
          },
        ]);
      } else {
        // 2. Update existing active message bubble
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(
            (m) => m.id === activeMessageIdRef.current,
          );
          if (idx >= 0) {
            const oldText = updated[idx].content;
            let newText = text;

            if (!isCumulative) {
              const needsSpace =
                oldText && !oldText.endsWith(' ') && !text.startsWith(' ');
              newText = oldText + (needsSpace ? ' ' : '') + text;
            } else {
              newText = text.length >= oldText.length ? text : oldText;
            }

            updated[idx] = {
              ...updated[idx],
              content: newText,
              isStreaming: !isFinal,
              parts: [{ type: 'text', text: newText }],
            };
          }
          return updated;
        });
      }

      // 3. Persistence for user message (on isFinal)
      if (isFinal && role === 'user' && !isMessageSavedRef.current) {
        setMessages((prev) => {
          const msg = prev.find((m) => m.id === activeMessageIdRef.current);
          if (msg) void saveMessageToDB(msg.content, 'user');
          return prev;
        });
        isMessageSavedRef.current = true;
      }
    });
  }, [onTranscription, setMessages, chatId, saveMessageToDB, messages]);

  // Handle Turn Completion (Assistant Persistence & Finalization)
  useEffect(() => {
    onTurnComplete(() => {
      if (
        activeMessageIdRef.current &&
        activeMessageRoleRef.current === 'assistant' &&
        !isMessageSavedRef.current
      ) {
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) => m.id === activeMessageIdRef.current,
          );
          if (idx >= 0) {
            const msg = prev[idx];
            void saveMessageToDB(msg.content, 'assistant');
            prev[idx] = { ...msg, isStreaming: false };
          }
          return [...prev];
        });
        isMessageSavedRef.current = true;
      }
      activeMessageIdRef.current = null;
      activeMessageRoleRef.current = null;
      isMessageSavedRef.current = false;
    });
  }, [onTurnComplete, saveMessageToDB, setMessages]);

  // Local state to track if historical messages are still being fetched.
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  // Refs to prevent duplicate initialization/message sending.
  const initialMessageSent = useRef(false);
  const messagesLoaded = useRef(false);

  // Reset refs when chatId changes to allow fresh loading/sending.
  useEffect(() => {
    initialMessageSent.current = false;
    messagesLoaded.current = false;
    setIsLoadingHistory(true);
  }, [chatId]);

  /**
   * Function to retry a failed assistant message by re-sending the preceding user message.
   * @param messageIndex - The index of the message to retry.
   */
  const handleRetry = (messageIndex: number) => {
    const target = messages[messageIndex];
    if (!target) return;

    // Find the last user message before this assistant message.
    const previousUserMessage = [...messages]
      .slice(0, messageIndex)
      .reverse()
      .find((m) => m.role === 'user');

    if (!previousUserMessage) {
      toast.error('No previous user message found to retry.');
      return;
    }

    // Extract content and files from the previous user message.
    const prevParts = Array.isArray(previousUserMessage.parts)
      ? previousUserMessage.parts
      : [];
    const textPart = prevParts.find((p: MessagePart) => p.type === 'text') as
      | MessagePart
      | undefined;
    const filesParts = prevParts.filter(
      (p: MessagePart) => p.type === 'file' || p.type === 'attachment',
    ) as MessagePart[];

    // Instead of removing the assistant message, we retain the chat history
    // and just re-send the user message to generate a new alternative response at the bottom.

    // Re-send the user message to trigger a fresh AI response.
    if (filesParts.length > 0) {
      sendMessage({
        text: textPart?.text || 'See attached files',
        files: filesParts.map((file: MessagePart) => ({
          id: file.id || file.publicId || '',
          name: file.name || file.filename || '',
          url: file.url || '',
          type: 'file',
          mediaType: file.mediaType || file.type || 'application/octet-stream',
        })),
      });
    } else {
      sendMessage({
        text: textPart?.text || '',
      });
    }
  };

  // Load chat history on initial mount or when chatId changes.
  useEffect(() => {
    if (!chatId || messagesLoaded.current) return;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat/${chatId}`);
        if (!res.ok) throw new Error('Failed to load chat');
        const data = await res.json();

        // If messages are found, set them in the chat state.
        if (data.messages && data.messages.length > 0) {
          console.log(`📜 Loaded ${data.messages.length} historical messages`);
          setMessages(data.messages);
          if (data.title) {
            setChatTitle(chatId, data.title);
          }
        }
        messagesLoaded.current = true;
      } catch (err) {
        console.error('Load history failed:', err);
        toast.error('Failed to load chat history');
      } finally {
        setIsLoadingHistory(false);
      }
    }

    void loadHistory();

    // Fetch and sync credits on mount
    const syncCredits = async () => {
      try {
        const res = await fetch('/api/credits/sync');
        if (res.ok) {
          const data = await res.json();
          setMessageCredits(data.messageCredits);
        }
      } catch (err) {
        console.error('Failed to sync credits:', err);
      }
    };
    void syncCredits();
  }, [chatId, setMessages, setChatTitle, setMessageCredits]);

  // Handle initial message from query params (e.g., when redirected from home).
  useEffect(() => {
    if (isLoadingHistory || initialMessageSent.current) return;

    const initialMessage = searchParams.get('message');
    const initialFilesStr = searchParams.get('files');

    // Only send the initial message if one is provided and no messages exist yet.
    if (initialMessage && messages.length === 0) {
      initialMessageSent.current = true;

      const initialVoiceMode = searchParams.get('voiceMode') === 'true';

      // Parse files if they were passed in the URL.
      if (initialFilesStr) {
        try {
          const files = JSON.parse(
            decodeURIComponent(initialFilesStr),
          ) as Array<{
            url: string;
            name: string;
            type: string;
            publicId: string;
          }>;
          sendMessage({
            text: initialMessage,
            isVoiceMode: initialVoiceMode,
            files: files.map((file) => ({
              id: file.publicId,
              name: file.name,
              url: file.url,
              type: 'file',
              mediaType: file.type || 'application/octet-stream',
            })),
          });
        } catch (e) {
          console.error('Failed to parse initial files:', e);
          sendMessage({ text: initialMessage, isVoiceMode: initialVoiceMode });
        }
      } else {
        sendMessage({ text: initialMessage, isVoiceMode: initialVoiceMode });
      }

      // Clear search params from URL without a page reload.
      const newUrl = window.location.pathname;
      window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        '',
        newUrl,
      );
    } else if (messages.length > 0) {
      // Even if there's no initial message to send, we're not loading anymore if messages exist.
      setIsLoadingHistory(false);
    }
  }, [isLoadingHistory, searchParams, messages.length, sendMessage]);

  /**
   * Handler to copy message text to clipboard.
   */
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  /**
   * Handler for sending a new message.
   */
  const handleSend = useCallback(
    async (
      text: string,
      files?: Array<{
        url: string;
        name: string;
        type: string;
        publicId: string;
      }>,
    ) => {
      // If files are attached, format the payload accordingly.
      if (files && files.length > 0) {
        sendMessage({
          text: text || 'See attached files',
          isVoiceMode,
          files: files.map((file) => ({
            id: file.publicId,
            name: file.name,
            url: file.url,
            type: 'file',
            mediaType: file.type || 'application/octet-stream',
          })),
        });
      } else {
        // Standard text message.
        sendMessage({
          text,
          isVoiceMode,
        });
      }
    },
    [sendMessage, isVoiceMode],
  );

  // Return null if chatId is missing.
  if (!chatId) return null;

  return (
    // Main layout container for the chat interface.
    <div className="flex min-h-screen flex-col bg-background">
      {/* Scrollable conversation display area. */}
      <div className="flex flex-1 min-h-0 max-w-3xl mx-auto w-full flex-col">
        <ChatConversationList
          messages={messages}
          status={status}
          isLoadingHistory={isLoadingHistory}
          onCopy={handleCopy}
          onRetry={handleRetry}
        />
      </div>

      {/* Sticky footer containing the message input. */}
      <div className="sticky bottom-0 flex w-full items-center justify-center bg-background/80 px-4 pb-6 pt-4 backdrop-blur">
        <div className="w-full max-w-3xl">
          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            placeholder="Send a message"
            isGenerating={status === 'submitted' || status === 'streaming'}
            isVoiceMode={isVoiceMode}
            onVoiceModeChange={(value) => {
              if (value && messageCredits !== null && messageCredits <= 0) {
                toast.error('Limit Reached', {
                  description:
                    'You have reached your daily limit of 10 messages. Please upgrade to Pro to continue.',
                });
                return;
              }
              setIsVoiceMode(value);
            }}
            isSpeaking={isLiveSpeaking}
            isConnected={isLiveConnected}
            volume={liveVolume}
          />
        </div>
      </div>
    </div>
  );
}

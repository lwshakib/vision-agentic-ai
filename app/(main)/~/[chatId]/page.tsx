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
// Import custom components.
import ChatInput from '@/components/chat-input';
import { ChatConversationList } from '@/components/chats/conversation-list';
// Import utility for notifications.
import { toast } from 'sonner';
// Import global state for chat management.
import { useChatStore } from '@/hooks/use-chat-store';

/**
 * Interface representing a component part of a chat message (text, file, etc.).
 */
interface MessagePart {
  type: string; // The category of the part.
  text?: string; // Content if it's text.
  id?: string; // Unique part ID.
  publicId?: string; // External storage ID.
  name?: string; // Display name.
  filename?: string; // Alternative name.
  url?: string; // Media URL.
  mediaType?: string; // MIME type.
}

/**
 * Main ChatPage Component
 */
export default function ChatPage() {
  // Extract chatId from the URL dynamic segment.
  const { chatId } = useParams<{ chatId: string }>();
  // Access state action to set the current chat title in the UI.
  const { setChatTitle, messageCredits, setMessageCredits } = useChatStore();
  const router = useRouter();

  const searchParams = useSearchParams();
  // Voice Mode State
  const [isVoiceMode, setIsVoiceMode] = useState(
    searchParams.get('voiceMode') === 'true',
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toastRef = useRef<string | number | null>(null);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);

  /**
   * TTS Playback Logic
   */
  const speak = useCallback(
    async (text: string) => {
      if (!text || !isVoiceMode) return;

      if (ttsAbortControllerRef.current) {
        ttsAbortControllerRef.current.abort();
      }
      const controller = new AbortController();
      ttsAbortControllerRef.current = controller;

      const ttsPromise = (async () => {
        const res = await fetch('/api/voice-agent/tts', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'orpheus' }),
        });

        if (!res.ok) throw new Error('Speech generation failed');
        const data = await res.json();
        if (!data.audioUrl) throw new Error('No audio URL returned');
        return data.audioUrl;
      })();

      const tId = toast.promise(ttsPromise, {
        loading: 'Processing audio...',
        success: 'Audio ready',
        error: 'Speech generation failed',
      }) as unknown as string | number;
      toastRef.current = tId;

      try {
        setIsSpeaking(true);
        const audioUrl = await ttsPromise;

        if (audioUrl) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => setIsSpeaking(false);

          await audio.play();
        } else {
          setIsSpeaking(false);
        }
      } catch (error) {
        console.error('Speech playback failed:', error);
        setIsSpeaking(false);
      }
    },
    [isVoiceMode],
  );

  /**
   * Initialize custom useChat hook for real-time interaction.
   */
  const {
    sendMessage, // Function to send a new user message.
    messages, // Array of current chat messages.
    setMessages, // Function to manually update message state.
    status, // Current status of the chat (idle, loading, etc.).
    stop, // Function to abort the current AI generation request
  } = useChat({
    headers: {
      'X-Chat-Id': chatId || '', // Include chatId in headers for server context.
    },
    // Global error handler for chat operations.
    onError: (err) => {
      console.error('Chat error:', err);
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.error === 'Credit exhausted') {
          setIsVoiceMode(false); // Close voice mode on credit exhaustion
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
    // Callback triggered when the AI finishes generating a response.
    onFinish: (message) => {
      // Extract parts from the finished message for database persistence.
      const parts = message.parts ?? [];
      const content = message.content ?? '';

      if (!chatId || (parts.length === 0 && !content)) return;

      // Persist the assistant message to the database.
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

      // Trigger Voice Mode speech if active
      if (isVoiceMode && content) {
        speak(content);
      }
    },
  });

  // Wrap the stop function to also handle audio and toasts
  const handleStop = useCallback(() => {
    stop(); // Abort LLM stream
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (toastRef.current) {
      toast.dismiss(toastRef.current);
      toastRef.current = null;
    }
    setIsSpeaking(false);
  }, [stop]);

  // Stop everything if exiting Voice Mode
  useEffect(() => {
    if (!isVoiceMode) {
      // Small timeout to avoid React "cascading renders" error when calling setState from effect.
      const timer = setTimeout(() => {
        handleStop();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isVoiceMode, handleStop]);

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

    // Remove this assistant message and any subsequent messages to clean up the UI.
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);

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
      toast.success('Copied');
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy');
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
      <div className="flex flex-1 min-h-0 max-w-3xl mx-auto w-full">
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
            isSpeaking={isSpeaking}
          />
        </div>
      </div>
    </div>
  );
}

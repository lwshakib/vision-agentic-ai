/**
 * Home Page (Chat Initialization)
 * This component provides the initial chat interface where users can start a new permanent or temporary chat.
 */

'use client';

// Import essential React and UI hooks.
import { useMemo, useState, Suspense, useCallback, useRef, useEffect } from 'react';
// Import custom ChatInput component for user message entry.
import ChatInput from '@/components/chat-input';
// Import Next.js navigation hooks.
import { useRouter, useSearchParams } from 'next/navigation';
// Import AI SDK hooks for handling real-time chat interactions.
import { useChat, type ChatMessage } from '@/hooks/use-chat';
import { toast } from 'sonner';
import {
  ChatConversationView,
} from '@/components/chat-conversation';
// Import global store for managing chat history/sidebar state.
import { useChatStore } from '@/hooks/use-chat-store';

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

  // Voice Mode State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { messageCredits } = useChatStore();

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

    if (isVoiceMode) {
      params.set('voiceMode', 'true');
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
          <ChatInput 
            onSend={handleSend} 
            isVoiceMode={isVoiceMode}
            onVoiceModeChange={(value) => {
              if (value && messageCredits !== null && messageCredits <= 0) {
                toast.error('Limit Reached', {
                  description: 'You have reached your daily limit of 10 messages. Please upgrade to Pro to continue.',
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

/**
 * TemporaryChat Component
 * Handles a chat session that is NOT saved to the database.
 */
function TemporaryChat() {
  // Loading state for history (not used here but maintained for component consistency).
  const [isLoadingHistory] = useState(false);
  const router = useRouter();

  const { messageCredits } = useChatStore();

  // Voice Mode State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toastRef = useRef<any>(null);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);

  /**
   * TTS Playback Logic
   */
  const speak = useCallback(async (text: string) => {
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
    });
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
  }, [isVoiceMode]);

  // Use the custom chat hook for state and messaging management.
  const { sendMessage, messages, status, stop } = useChat({
    onError: (err) => {
      console.error('Temporary chat error:', err);
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
        // Fallback for non-JSON errors
      }
      toast.error('Internal server error');
    },
    onFinish: (message) => {
      if (isVoiceMode && message.content) {
        speak(message.content);
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
      handleStop();
    }
  }, [isVoiceMode, handleStop]);

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
      // Otherwise just send the plain text.
      sendMessage({
        text,
        isVoiceMode,
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
      onStop={handleStop}
      onCopy={handleCopy}
      isVoiceMode={isVoiceMode}
      onVoiceModeChange={(value) => {
        if (value && messageCredits !== null && messageCredits <= 0) {
          toast.error('Limit Reached', {
            description: 'You have reached your daily limit of 10 messages. Please upgrade to Pro to continue.',
          });
          return;
        }
        setIsVoiceMode(value);
      }}
      isSpeaking={isSpeaking}
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

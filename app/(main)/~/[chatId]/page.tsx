'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ChatInput from '@/components/chat-input';
import { ChatConversationList } from '@/components/chats/conversation-list';
import { toast } from 'sonner';
import { useChatStore } from '@/lib/store';

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
  const { setChatTitle } = useChatStore();

  // Memoize transport to prevent re-creation on every render
  const chatTransport = useMemo(() => {
    if (!chatId) return null;
    return new DefaultChatTransport({
      api: '/api/generate',
      headers: {
        'X-Chat-Id': chatId,
      },
    });
  }, [chatId]); // Only recreate if chatId changes

  const {
    sendMessage,
    messages,
    setMessages,
    status,
  } = useChat({
    transport: chatTransport ?? undefined,
    onError: (err) => {
      console.error('Chat error:', err);
      toast.error('Internal server error');
    },
    onFinish: (message) => {
      // Persist assistant message with parts (including tool outputs)
      const parts = (message as unknown as { message?: { parts?: unknown[] } })?.message?.parts ?? [];
      if (!chatId || !parts || parts.length === 0) return;
      void fetch(`/api/chat/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          parts,
        }),
      }).catch((err) =>
        console.error('Failed to save assistant message:', err),
      );
    },
  });
  const searchParams = useSearchParams();

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const initialMessageSent = useRef(false);
  const messagesLoaded = useRef(false);

  // Reset refs when chatId changes
  useEffect(() => {
    initialMessageSent.current = false;
    messagesLoaded.current = false;
    setIsLoadingHistory(true);
  }, [chatId]);

  const handleRetry = (messageIndex: number) => {
    const target = messages[messageIndex];
    if (!target) return;

    // Find the last user message before this assistant message
    const previousUserMessage = [...messages]
      .slice(0, messageIndex)
      .reverse()
      .find((m) => m.role === 'user');

    if (!previousUserMessage) {
      toast.error('No previous user message found to retry.');
      return;
    }

    const prevParts = Array.isArray(previousUserMessage.parts)
      ? previousUserMessage.parts
      : [];
    const textPart = prevParts.find((p: MessagePart) => p.type === 'text') as MessagePart | undefined;
    const filesParts = prevParts.filter(
      (p: MessagePart) => p.type === 'file' || p.type === 'attachment',
    ) as MessagePart[];

    // Remove this assistant message and any subsequent messages
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);

    // Re-send the user message
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

  // Load chat history on initial mount or when chatId changes
  useEffect(() => {
    if (!chatId || messagesLoaded.current) return;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat/${chatId}`);
        if (!res.ok) throw new Error('Failed to load chat');
        const data = await res.json();

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
  }, [chatId, setMessages, setChatTitle]);

  // Handle initial message from query params
  useEffect(() => {
    if (isLoadingHistory || initialMessageSent.current) return;

    const initialMessage = searchParams.get('message');
    const initialFilesStr = searchParams.get('files');

    if (initialMessage && messages.length === 0) {
      initialMessageSent.current = true;

      if (initialFilesStr) {
        try {
          const files = JSON.parse(decodeURIComponent(initialFilesStr)) as Array<{
            url: string;
            name: string;
            type: string;
            publicId: string;
          }>;
          sendMessage({
            text: initialMessage,
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
          sendMessage({ text: initialMessage });
        }
      } else {
        sendMessage({ text: initialMessage });
      }

      // Clear params without page reload
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    } else if (messages.length > 0) {
      // Even if there's no initial message to send, we're not loading anymore
      setIsLoadingHistory(false);
    }
  }, [isLoadingHistory, searchParams, messages.length, sendMessage]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy');
    }
  };

  const handleSend = async (
    text: string,
    files?: Array<{
      url: string;
      name: string;
      type: string;
      publicId: string;
    }>,
  ) => {
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
      sendMessage({
        text,
      });
    }
  };

  if (!chatId) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 min-h-0 max-w-3xl mx-auto w-full">
        <ChatConversationList
          messages={messages}
          status={status}
          isLoadingHistory={isLoadingHistory}
          onCopy={handleCopy}
          onRetry={handleRetry}
        />
      </div>

      <div className="sticky bottom-0 flex w-full items-center justify-center bg-background/80 px-4 pb-6 pt-4 backdrop-blur">
        <div className="w-full max-w-3xl">
          <ChatInput onSend={handleSend} placeholder="Send a message" />
        </div>
      </div>
    </div>
  );
}

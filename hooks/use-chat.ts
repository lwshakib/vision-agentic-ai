'use client';

import { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useChatStore } from '@/hooks/use-chat-store';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts?: any[];
  reasoning?: string;
  version?: number | string;
  files?: any[];
  isStreaming?: boolean;
};

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';

interface SendMessageOptions {
  text: string;
  files?: any[];
}

export function useChat({
  api = '/api/generate',
  headers = {},
  onFinish,
  onError,
}: {
  api?: string;
  headers?: Record<string, string>;
  onFinish?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
} = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const setChatTitle = useChatStore((state) => state.setChatTitle);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    async ({ text, files }: SendMessageOptions) => {
      setStatus('submitted');

      const userMessage: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content: text,
        parts: [
          { type: 'text', text },
          ...(files?.map(f => ({ ...f, type: 'file' })) || [])
        ],
        files: files || []
      };

      setMessages(prev => [...prev, userMessage]);

      // Save user message to DB if we have a chatId (passed via headers usually)
      const chatId = headers['X-Chat-Id'];
      if (chatId) {
        try {
          const res = await fetch(`/api/chat/${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'user',
              parts: userMessage.parts
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.title) {
              setChatTitle(chatId as string, data.title);
            }
          }
        } catch (e) {
          console.error('Failed to save user message:', e);
        }
      }

      const assistantMessageId = nanoid();
      let assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        parts: [],
        reasoning: '',
        isStreaming: true,
      };
      let reasoningStartTime: number | null = null;

      try {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const response = await fetch(api, {
          method: 'POST',
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content:
                m.content ||
                m.parts?.find((p) => p.type === 'text')?.text ||
                '',
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData);
        }

        setStatus('streaming');
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No body');

        const decoder = new TextDecoder();
        let buffer = '';

        setMessages((prev) => [...prev, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(trimmedLine.slice(6));

              // If we get content or tool but were reasoning, mark it as finished
              if (data.type !== 'reasoning') {
                const parts = [...(assistantMessage.parts || [])];
                const lastReasoningIndex = parts.findLastIndex(
                  (p) => p.type === 'reasoning' && p.isStreaming,
                );
                if (lastReasoningIndex !== -1 && reasoningStartTime) {
                  parts[lastReasoningIndex] = {
                    ...parts[lastReasoningIndex],
                    isStreaming: false,
                    duration: Math.max(
                      1,
                      Math.ceil((Date.now() - reasoningStartTime) / 1000),
                    ),
                  };
                  reasoningStartTime = null;
                  assistantMessage.parts = parts;
                }
              }

              if (data.type === 'content') {
                assistantMessage.content += data.delta;

                const parts = [...(assistantMessage.parts || [])];
                const lastPart = parts[parts.length - 1];

                if (lastPart?.type === 'text') {
                  parts[parts.length - 1] = {
                    ...lastPart,
                    text: (lastPart.text || '') + data.delta,
                  };
                } else {
                  parts.push({ type: 'text', text: data.delta });
                }
                assistantMessage.parts = parts;
              } else if (data.type === 'reasoning') {
                if (!reasoningStartTime) reasoningStartTime = Date.now();
                assistantMessage.reasoning =
                  (assistantMessage.reasoning || '') + data.delta;

                const parts = [...(assistantMessage.parts || [])];
                const lastPart = parts[parts.length - 1];

                if (lastPart?.type === 'reasoning') {
                  parts[parts.length - 1] = {
                    ...lastPart,
                    text: (lastPart.text || '') + data.delta,
                    isStreaming: true,
                  };
                } else {
                  parts.push({
                    type: 'reasoning',
                    text: data.delta,
                    isStreaming: true,
                  });
                }
                assistantMessage.parts = parts;
              } else if (data.type === 'tool_call') {
                const parts = [...(assistantMessage.parts || [])];
                parts.push({
                  type: `tool-${data.name}`,
                  input: data.args ? JSON.parse(data.args) : {},
                  state: 'input-available',
                });
                assistantMessage.parts = parts;
              } else if (data.type === 'tool_result') {
                const parts = [...(assistantMessage.parts || [])];
                const toolIndex = parts.findLastIndex(
                  (p) =>
                    p.type === `tool-${data.name}` &&
                    p.state !== 'output-available',
                );

                if (toolIndex !== -1) {
                  parts[toolIndex] = {
                    ...parts[toolIndex],
                    output: data.result,
                    state: 'output-available',
                  };
                } else {
                  parts.push({
                    type: `tool-${data.name}`,
                    output: data.result,
                    state: 'output-available',
                  });
                }
                assistantMessage.parts = parts;
              }

              // Update the UI
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...assistantMessage,
                        parts: [...(assistantMessage.parts || [])],
                      }
                    : m,
                ),
              );
            } catch (e) {
              // Ignore
            }
          }
        }

        setStatus('idle');
        // Final update to set isStreaming to false for any remaining reasoning blocks
        const finalParts = [...(assistantMessage.parts || [])];
        const lastReasoningIndex = finalParts.findLastIndex(
          (p) => p.type === 'reasoning' && p.isStreaming,
        );
        if (lastReasoningIndex !== -1 && reasoningStartTime) {
          finalParts[lastReasoningIndex] = {
            ...finalParts[lastReasoningIndex],
            isStreaming: false,
            duration: Math.max(
              1,
              Math.ceil((Date.now() - reasoningStartTime) / 1000),
            ),
          };
        }
        assistantMessage = {
          ...assistantMessage,
          isStreaming: false,
          parts: finalParts.map((p) =>
            p.type === 'reasoning' ? { ...p, isStreaming: false } : p,
          ),
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...assistantMessage } : m,
          ),
        );
        onFinish?.(assistantMessage);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // If aborted, we handle finishing the message up to the point it stopped.
          setStatus('idle');
          if (assistantMessage.isStreaming) {
            assistantMessage.isStreaming = false;
            // append aborted to reasoning/content to indicate
            if (assistantMessage.reasoning && !assistantMessage.content) {
               assistantMessage.reasoning += '\\n\\n[Aborted]';
            } else {
               assistantMessage.content += '\\n\\n[Aborted]';
            }
            const finalParts = [...(assistantMessage.parts || [])];
            const lastReasoningIndex = finalParts.findLastIndex(
              (p) => p.type === 'reasoning' && p.isStreaming,
            );
            if (lastReasoningIndex !== -1 && reasoningStartTime) {
              finalParts[lastReasoningIndex] = {
                ...finalParts[lastReasoningIndex],
                isStreaming: false,
                duration: Math.max(
                  1,
                  Math.ceil((Date.now() - reasoningStartTime) / 1000),
                ),
              };
            }
            assistantMessage = {
              ...assistantMessage,
              parts: finalParts.map((p) =>
                p.type === 'reasoning' ? { ...p, isStreaming: false } : p,
              ),
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...assistantMessage } : m,
              ),
            );
            onFinish?.(assistantMessage);
          }
          return;
        }
        
        setStatus('error');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, isStreaming: false } : m,
          ),
        );
        onError?.(err instanceof Error ? err : new Error(String(err)));
      } finally {
        abortControllerRef.current = null;
      }
    },
    [api, headers, messages, onFinish, onError]
  );

  return {
    messages,
    setMessages,
    status,
    sendMessage,
    stop,
  };
}

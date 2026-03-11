'use client';

import { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useChatStore } from '@/hooks/use-chat-store';

export interface MessagePart {
  type: string;
  text?: string;
  id?: string;
  publicId?: string;
  name?: string;
  filename?: string;
  url?: string;
  mediaType?: string;
  input?: unknown;
  output?: unknown;
  state?: 'input-streaming' | 'input-available' | 'output-available';
  reasoning?: string;
  isStreaming?: boolean;
  duration?: number;
  sources?: Array<{ url?: string; title?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts?: MessagePart[];
  reasoning?: string;
  version?: number | string;
  files?: MessagePart[];
  isStreaming?: boolean;
};

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';

interface SendMessageOptions {
  text: string;
  files?: MessagePart[];
  isVoiceMode?: boolean;
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
  // Local state for all messages in the current conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Tracks the current lifecycle state of the chat (idle, submitting, streaming, error)
  const [status, setStatus] = useState<ChatStatus>('idle');
  // Access global store action to update chat titles dynamically
  const setChatTitle = useChatStore((state) => state.setChatTitle);
  // Ref to hold the abort controller for canceling active streams
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Stops the current streaming operation and cleans up the controller.
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Main function to send a user message and handle the AI's streaming response.
   */
  const sendMessage = useCallback(
    async ({ text, files, isVoiceMode }: SendMessageOptions) => {
      setStatus('submitted');

      // Create a local representation of the user message
      const userMessage: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content: text,
        parts: [
          { type: 'text', text },
          ...(files?.map((f) => ({ ...f, type: 'file' })) || []),
        ],
        files: files || [],
      };

      //Optimistically add user message to the UI
      setMessages((prev) => [...prev, userMessage]);

      // Persistence: Save the user message to the database
      const chatId = headers['X-Chat-Id'];
      if (chatId) {
        try {
          const res = await fetch(`/api/chat/${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'user',
              parts: userMessage.parts,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            // If the backend generated a new title, update the global store
            if (data.title) {
              setChatTitle(chatId as string, data.title);
            }
          }
        } catch (e) {
          console.error('Failed to save user message:', e);
        }
      }

      // Initialize the assistant's placeholder message for streaming
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
        // Initialize AbortController for this specific request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Perform the API request to the local generate endpoint
        const response = await fetch(api, {
          method: 'POST',
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
          },
          body: JSON.stringify({
            isVoiceMode: Boolean(isVoiceMode),
            // Format internal message history into the schema expected by the AI provider
            messages: [...messages, userMessage].flatMap((m) => {
              const textContent =
                m.content ||
                m.parts?.find((p) => p.type === 'text')?.text ||
                '';

              // Extract image files for multimodal input
              const imageParts =
                m.parts
                  ?.filter(
                    (p) =>
                      p.type === 'file' && p.mediaType?.startsWith('image/'),
                  )
                  .map((p) => ({
                    type: 'image_url',
                    image_url: { url: p.url, detail: 'high' },
                  })) || [];

              const commonContent =
                imageParts.length > 0
                  ? [{ type: 'text', text: textContent }, ...imageParts]
                  : textContent;

              // Complex Message Handling: Assistant messages with tool calls
              if (m.role === 'assistant') {
                const toolCalls = m.parts
                  ?.filter((p) => p.type?.startsWith('tool-') && p.input)
                  .map((p) => ({
                    id: p.id || `call_${nanoid()}`,
                    type: 'function',
                    function: {
                      name: p.type.replace('tool-', ''),
                      arguments: JSON.stringify(p.input),
                    },
                  }));

                const msgs: Array<{
                  role: string;
                  content: string | unknown[];
                  tool_calls?: unknown[];
                  tool_call_id?: string;
                  name?: string;
                }> = [];
                // 1. The assistant's text and tool call definitions
                msgs.push({
                  role: 'assistant',
                  content: commonContent,
                  tool_calls: toolCalls?.length ? toolCalls : undefined,
                });

                // 2. Corresponding tool result messages for each call
                m.parts?.forEach((p) => {
                  if (
                    p.type?.startsWith('tool-') &&
                    p.state === 'output-available'
                  ) {
                    msgs.push({
                      role: 'tool',
                      tool_call_id:
                        p.id ||
                        (
                          msgs[0].tool_calls as
                            | Array<{ id: string; function: { name: string } }>
                            | undefined
                        )?.find(
                          (tc) =>
                            tc.function.name === p.type.replace('tool-', ''),
                        )?.id,
                      name: p.type.replace('tool-', ''),
                      content: JSON.stringify(p.output),
                    });
                  }
                });

                return msgs;
              }

              // simple return for user and system roles
              return {
                role: m.role,
                content: commonContent,
              };
            }),
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData);
        }

        // Handle credit updates via custom response header
        const remainingCredits = response.headers.get('X-Message-Credits');
        if (remainingCredits !== null) {
          useChatStore
            .getState()
            .setMessageCredits(parseInt(remainingCredits, 10));
        }

        setStatus('streaming');
        // Get stream reader for Server-Sent Events (SSE)
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body found');

        const decoder = new TextDecoder();
        let buffer = '';

        // Add the empty assistant message to the screen before content arrives
        setMessages((prev) => [...prev, assistantMessage]);

        // Main streaming loop: Process individual chunks as they arrive
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Partially received line goes back into buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            // Each data chunk is prefixed with 'data: ' according to SSE spec
            if (!trimmedLine.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(trimmedLine.slice(6));

              // Transition: If we get content/tools but were reasoning, mark reasoning block as finished
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

              // Route the incoming chunk based on its type
              if (data.type === 'content') {
                // Main assistant text response
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
                // "Thinking" process streamed by the model
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
                // Notification that the AI is calling a tool
                const parts = [...(assistantMessage.parts || [])];
                parts.push({
                  id: data.id,
                  type: `tool-${data.name}`,
                  input: data.args ? JSON.parse(data.args) : {},
                  state: 'input-available',
                });
                assistantMessage.parts = parts;
              } else if (data.type === 'tool_result') {
                // Notification that a tool execution has finished
                const parts = [...(assistantMessage.parts || [])];
                const toolIndex = parts.findLastIndex(
                  (p) =>
                    p.id === data.id ||
                    (p.type === `tool-${data.name}` &&
                      p.state !== 'output-available'),
                );

                if (toolIndex !== -1) {
                  parts[toolIndex] = {
                    ...parts[toolIndex],
                    id: data.id || parts[toolIndex].id,
                    output: data.result,
                    state: 'output-available',
                  };
                } else {
                  parts.push({
                    id: data.id,
                    type: `tool-${data.name}`,
                    output: data.result,
                    state: 'output-available',
                  });
                }
                assistantMessage.parts = parts;
              }

              // Reactively update the local state to trigger a re-render
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
            } catch {
              // Ignore malformed JSON chunks from heartbeat signals
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
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
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
    [api, headers, messages, onFinish, onError, setChatTitle],
  );

  return {
    messages,
    setMessages,
    status,
    sendMessage,
    stop,
  };
}

'use client';

import { useState, useCallback } from 'react';
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
        reasoning: ''
      };

      try {
        const response = await fetch(api, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(headers || {})
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content || (m.parts?.find(p => p.type === 'text')?.text || '')
            }))
          })
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

        setMessages(prev => [...prev, assistantMessage]);

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
              
              if (data.type === 'content') {
                assistantMessage.content += data.delta;
                // Update parts as well
                const textPart = assistantMessage.parts?.find(p => p.type === 'text');
                if (textPart) {
                  textPart.text = assistantMessage.content;
                } else {
                  assistantMessage.parts = [{ type: 'text', text: assistantMessage.content }];
                }
              } else if (data.type === 'reasoning') {
                assistantMessage.reasoning = (assistantMessage.reasoning || '') + data.delta;
                // Update or add reasoning part
                const reasoningPart = assistantMessage.parts?.find(p => p.type === 'reasoning');
                if (reasoningPart) {
                  reasoningPart.text = assistantMessage.reasoning;
                  reasoningPart.isStreaming = true;
                } else {
                  assistantMessage.parts = [
                    ...(assistantMessage.parts || []),
                    { type: 'reasoning', text: assistantMessage.reasoning, isStreaming: true }
                  ];
                }
              } else if (data.type === 'tool_call') {
                 assistantMessage.parts = [
                   ...(assistantMessage.parts || []),
                   { 
                     type: `tool-${data.name}`, 
                     input: data.args ? JSON.parse(data.args) : {},
                     state: 'input-available' 
                   }
                 ];
              } else if (data.type === 'tool_result') {
                 // Update the corresponding tool_call part or add a result part
                 const toolPart = assistantMessage.parts?.find(p => p.type === `tool-${data.name}` && p.state !== 'output-available');
                 if (toolPart) {
                   toolPart.output = data.result;
                   toolPart.state = 'output-available';
                 } else {
                   assistantMessage.parts = [
                     ...(assistantMessage.parts || []),
                     { 
                       type: `tool-${data.name}`, 
                       output: data.result,
                       state: 'output-available' 
                     }
                   ];
                 }
              }

              // Update the UI
              setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...assistantMessage, parts: [...(assistantMessage.parts || [])] } : m));
            } catch (e) {
              // Ignore
            }
          }
        }

        setStatus('idle');
        // Final update to set isStreaming to false
        assistantMessage.parts = assistantMessage.parts?.map(p => 
          p.type === 'reasoning' ? { ...p, isStreaming: false } : p
        );
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...assistantMessage } : m));
        onFinish?.(assistantMessage);
      } catch (err) {
        setStatus('error');
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [api, headers, messages, onFinish, onError]
  );

  return {
    messages,
    setMessages,
    status,
    sendMessage,
  };
}

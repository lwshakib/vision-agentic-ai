export type AiMessageContent =
  | string
  | (
      | { type: 'text'; text: string }
      | { type: 'file'; file: { mimeType?: string; data?: string }; url?: string }
    )[];

export interface AiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: AiMessageContent;
  name?: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
  reasoning?: string;
}

export interface StreamOptions {
  isVoiceMode?: boolean;
  sessionId?: string;
  onFinish?: (result: {
    content: string;
    reasoning?: string;
    toolInvocations: Record<string, unknown>[];
  }) => Promise<void>;
  abortSignal?: AbortSignal;
}

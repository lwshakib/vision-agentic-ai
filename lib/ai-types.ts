export interface ToolUIPart {
  type: 'tool-ui';
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'approval-requested'
    | 'approval-responded'
    | 'output-available'
    | 'output-error'
    | 'output-denied';
  input?: any;
  output?: any;
  errorText?: string;
}

export interface FileUIPart {
  type: 'file';
  url: string;
  mediaType?: string;
  filename?: string;
  data?: string;
}

export type ChatStatus = 'streaming' | 'submitted' | 'ready' | 'error';

export interface LanguageModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
}

export interface Experimental_GeneratedImage {
  base64?: string;
  mediaType?: string;
  url?: string;
}

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ReasoningPart {
  type: 'reasoning';
  reasoning: string;
}

export type MessagePart = TextPart | ToolUIPart | ReasoningPart;

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data' | 'tool';
  content: string | MessagePart[];
}

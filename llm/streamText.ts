/**
 * AI Streaming Interface
 * Orchestrates the real-time text generation and tool execution flow.
 * Uses the Vercel AI SDK to stream responses to the client.
 */

import {
  streamText as _streamText,
  convertToModelMessages,
  stepCountIs,
  type StreamTextOnFinishCallback,
  type Tool,
} from 'ai';
import { MAXIMUM_OUTPUT_TOKENS } from '@/lib/constants';
import { GeminiModel } from './model';
import { SYSTEM_PROMPT } from './prompts';
import { tools } from './tools';

/**
 * Result structure for a completed tool call.
 */
interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

/**
 * Unified message format for the application.
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

/**
 * Configuration options for the streaming request.
 */
export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

/**
 * Core function to start a streaming AI response.
 * @param messages - The history of user and assistant messages.
 * @param onFinish - Optional callback triggered when the full stream completes.
 */
export async function streamText(
  messages: Messages,
  onFinish?: StreamTextOnFinishCallback<Record<string, Tool>>,
) {
  // Convert standard message objects into the format required by the AI SDK.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelMessages = await convertToModelMessages(messages as any);

  // Execute the streaming generation.
  return _streamText({
    model: GeminiModel(), // Use the rotated Gemini model instance.
    system: SYSTEM_PROMPT, // Instructions for personality and tool usage.
    tools: tools, // Map of executable tools available to the model.
    /**
     * Stop after 10 steps of tool calling.
     * This allows for complex chains (e.g., search -> extract -> generate).
     */
    stopWhen: stepCountIs(10),
    toolChoice: 'auto', // Let the model decide when to use tools.
    messages: modelMessages,
    onFinish,
    temperature: 1, // High creativity for diverse responses.
    maxOutputTokens: MAXIMUM_OUTPUT_TOKENS, // Limit response length based on constants.
  });
}

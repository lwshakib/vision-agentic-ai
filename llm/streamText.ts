import {
  streamText as _streamText,
  convertToModelMessages,
  experimental_generateImage,
  stepCountIs,
  StreamTextOnFinishCallback,
  Tool,
} from "ai";
import { MAXIMUM_OUTPUT_TOKENS } from "../constants";
import { GeminiModel } from "./model";
import { SYSTEM_PROMPT } from "./prompts";
import { tools } from "./tools";

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], "model">;

export function streamText(
  messages: Messages,
  onFinish?: StreamTextOnFinishCallback<Record<string, Tool>>
) {
  return _streamText({
    model: GeminiModel(),
    system: SYSTEM_PROMPT,
    tools: tools,
    stopWhen: stepCountIs(10), // Increased from 5 to 10 to allow for webSearch + extractWebUrl chains
    toolChoice: "auto",
    messages: convertToModelMessages(messages as any),
    onFinish,
    temperature: 0.7,
    maxOutputTokens: MAXIMUM_OUTPUT_TOKENS
  });
}

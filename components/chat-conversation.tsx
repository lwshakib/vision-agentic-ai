"use client";

import { useEffect, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
  MessageAction,
  MessageActions,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  SourceContent,
  SourceTrigger,
} from "@/components/prompt-kit/source";
import { ImageIcon, LoaderIcon, MessageSquare, CopyIcon } from "lucide-react";
import ChatInput from "@/components/chat-input";
import { Skeleton } from "@/components/ui/skeleton";

// Loose message type so this component can work with messages from `useChat`
export type ChatMessage = any;

type ChatConversationViewProps = {
  messages: ChatMessage[];
  status: string;
  isLoadingHistory: boolean;
  onSend: (
    text: string,
    files?: Array<{ url: string; name: string; type: string; publicId: string }>
  ) => void | Promise<void>;
  onCopy: (text: string) => void | Promise<void>;
};

export function WebSearchLoading({ loadingText }: { loadingText: string }) {
  const [time, setTime] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
      setProgress((prev) => Math.min(70, prev + 5));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full p-3 rounded-md bg-muted/60 relative">
      <div className="absolute top-2 right-2 text-xs text-green-600">
        {time}s
      </div>
      <div className="flex items-center gap-2 mb-2">
        <LoaderIcon className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{loadingText}</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}

export function ChatConversationView({
  messages,
  status,
  isLoadingHistory,
  onSend,
  onCopy,
}: ChatConversationViewProps) {
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLoadingHistory && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isLoadingHistory, messages.length]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 min-h-0 max-w-3xl mx-auto w-full">
        <Conversation>
          <ConversationContent>
            {isLoadingHistory ? (
              <ChatSkeleton />
            ) : messages.length === 0 ? (
              <ConversationEmptyState
                icon={<MessageSquare className="size-12" />}
                title="Start a conversation"
                description="Type a message below to begin chatting"
              />
            ) : (
              <>
                {messages.map((message, messageIndex) => {
                  const parts = Array.isArray(message.parts)
                    ? message.parts
                    : [];
                  const isLastAssistant = (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].role === "assistant") {
                        return messageIndex === i;
                      }
                    }
                    return false;
                  })();
                  const messageFiles = (message as any).files || [];
                  const fileParts =
                    parts.filter(
                      (part: any) =>
                        part.type === "file" || part.type === "attachment"
                    ) || [];

                  const allFiles = [
                    ...messageFiles,
                    ...fileParts.map((part: any) => ({
                      id: part.id,
                      url: part.url,
                      name: part.name || part.filename,
                      mediaType: part.mediaType || part.type,
                    })),
                  ];

                  return (
                    <Message from={message.role} key={message.id}>
                      {allFiles.length > 0 && (
                        <MessageAttachments className="mb-2">
                          {allFiles.map((file: any) => (
                            <MessageAttachment
                              key={file.id || file.url}
                              data={{
                                type: "file",
                                url: file.url,
                                mediaType:
                                  file.mediaType ||
                                  file.type ||
                                  "application/octet-stream",
                                filename: file.name || file.filename,
                              }}
                            />
                          ))}
                        </MessageAttachments>
                      )}
                      <MessageContent>
                        {parts
                          .filter(
                            (part: any) =>
                              part.type !== "file" && part.type !== "attachment"
                          )
                          .map((part: any, i: number) => {
                            const key = `${message.id}-${i}`;

                            if (part.type === "text") {
                              const text = part.text ?? "";
                              if (!text) return null;

                              return (
                                <div key={key} className="flex flex-col gap-1">
                                  <MessageResponse className="[&_p]:leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1.5 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto">
                                    {text}
                                  </MessageResponse>
                                  {(message as any).version && (
                                    <span className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                      Version {(message as any).version}
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            if (part.type === "reasoning") {
                              const reasoningText =
                                (part as any).reasoning ??
                                (part as any).text ??
                                "";
                              const isStreaming = Boolean(
                                (part as any).isStreaming
                              );

                              if (!reasoningText) return null;

                              return (
                                <Reasoning
                                  key={key}
                                  className="w-full"
                                  isStreaming={isStreaming}
                                >
                                  <ReasoningTrigger />
                                  <ReasoningContent>
                                    {reasoningText}
                                  </ReasoningContent>
                                </Reasoning>
                              );
                            }

                            if (part.type === "sources") {
                              const sources = (part as any).sources ?? [];
                              if (!sources.length) return null;

                              return (
                                <div
                                  key={key}
                                  className="mb-3 flex flex-wrap justify-start gap-2"
                                >
                                  {sources.map((source: any) => {
                                    const href = source.url ?? source.href;
                                    if (!href) return null;

                                    const title =
                                      source.title ??
                                      source.name ??
                                      source.url ??
                                      href;

                                    return (
                                      <Source href={href} key={href}>
                                        <SourceTrigger showFavicon />
                                        <SourceContent
                                          title={title}
                                          description={source.description}
                                        />
                                      </Source>
                                    );
                                  })}
                                </div>
                              );
                            }

                            if (
                              typeof (part as any).type === "string" &&
                              (part as any).type.startsWith("tool-")
                            ) {
                              const toolCall = part as any;

                              if (toolCall.type === "tool-webSearch") {
                                const input = toolCall.input as
                                  | { query?: string }
                                  | undefined;
                                const output = toolCall.output as
                                  | {
                                      answer?: string;
                                      results?: {
                                        title?: string;
                                        url?: string;
                                        content?: string;
                                        favicon?: string | null;
                                      }[];
                                    }
                                  | undefined;

                                const isLoading =
                                  toolCall.state === "input-streaming" ||
                                  toolCall.state === "input-available";

                                const hasOutput =
                                  toolCall.state === "output-available" &&
                                  output;
                                const results = output?.results ?? [];

                                if (isLoading) {
                                  const text =
                                    input?.query &&
                                    input.query.trim().length > 0
                                      ? `Searching web for "${input.query}"..`
                                      : "Searching web..";

                                  return (
                                    <div key={key} className="my-2">
                                      <WebSearchLoading loadingText={text} />
                                    </div>
                                  );
                                }

                                if (hasOutput && results.length > 0) {
                                  return (
                                    <div
                                      key={key}
                                      className="mt-2 flex flex-wrap gap-2"
                                    >
                                      {results.map((item, index) => {
                                        if (!item.url) return null;

                                        return (
                                          <Source
                                            href={item.url}
                                            key={item.url ?? index}
                                          >
                                            <SourceTrigger showFavicon />
                                            <SourceContent
                                              title={item.title || item.url}
                                              description={item.content}
                                            />
                                          </Source>
                                        );
                                      })}
                                    </div>
                                  );
                                }

                                return null;
                              }

                              if (toolCall.type === "tool-extractWebUrl") {
                                const input = toolCall.input as
                                  | { urls?: string[] }
                                  | undefined;
                                const output = toolCall.output as
                                  | {
                                      success?: boolean;
                                      urls?: string[];
                                      results?: {
                                        url?: string;
                                        content?: string;
                                        favicon?: string | null;
                                      }[];
                                      response_time?: number;
                                      error?: string;
                                      message?: string;
                                    }
                                  | undefined;

                                const isLoading =
                                  toolCall.state === "input-streaming" ||
                                  toolCall.state === "input-available";

                                const hasOutput =
                                  toolCall.state === "output-available" &&
                                  output;
                                const results = output?.results ?? [];
                                const urls = input?.urls ?? output?.urls ?? [];

                                if (isLoading) {
                                  const text =
                                    urls.length > 0
                                      ? `Extracting content from ${
                                          urls.length
                                        } URL${urls.length > 1 ? "s" : ""}..`
                                      : "Extracting content..";

                                  return (
                                    <div key={key} className="my-2">
                                      <WebSearchLoading loadingText={text} />
                                    </div>
                                  );
                                }

                                if (hasOutput && results.length > 0) {
                                  return (
                                    <div
                                      key={key}
                                      className="mt-2 flex flex-wrap gap-2"
                                    >
                                      {results.map((item, index) => {
                                        if (!item.url) return null;

                                        return (
                                          <Source
                                            href={item.url}
                                            key={item.url ?? index}
                                          >
                                            <SourceTrigger showFavicon />
                                            <SourceContent
                                              title={item.url}
                                              description={item.content}
                                            />
                                          </Source>
                                        );
                                      })}
                                    </div>
                                  );
                                }

                                return null;
                              }

                              if (toolCall.type === "tool-imageToImage") {
                                const input = toolCall.input as
                                  | {
                                      imageUrl?: string;
                                      prompt?: string;
                                      mimeType?: string;
                                    }
                                  | undefined;
                                const output = toolCall.output as
                                  | {
                                      success?: boolean;
                                      image?: string;
                                      publicId?: string;
                                      prompt?: string;
                                      error?: string;
                                    }
                                  | undefined;

                                const isLoading =
                                  toolCall.state === "input-streaming" ||
                                  toolCall.state === "input-available";

                                const hasOutput =
                                  toolCall.state === "output-available" &&
                                  output;

                                if (isLoading) {
                                  return (
                                    <div key={key} className="my-2">
                                      <WebSearchLoading loadingText="Generating image from your image.." />
                                    </div>
                                  );
                                }

                                if (
                                  hasOutput &&
                                  output.success &&
                                  output.image
                                ) {
                                  const imageSrc = output.image;
                                  return (
                                    <div
                                      key={key}
                                      className="my-3 rounded-lg border border-border/40 overflow-hidden bg-muted/30"
                                    >
                                      <div className="p-3 bg-muted/50 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <ImageIcon className="h-4 w-4" />
                                          <span className="font-medium">
                                            Generated Image (from your image)
                                          </span>
                                        </div>
                                        {input?.prompt && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Prompt: &quot;{input.prompt}&quot;
                                          </p>
                                        )}
                                      </div>
                                      <div className="p-4 flex justify-center bg-background">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={imageSrc}
                                          alt={
                                            input?.prompt || "Generated image"
                                          }
                                          className="max-w-full h-auto rounded-md shadow-sm"
                                          style={{
                                            maxWidth: "100%",
                                            height: "auto",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                }

                                if (hasOutput && !output.success) {
                                  return (
                                    <div
                                      key={key}
                                      className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                                    >
                                      <p className="font-medium">
                                        Image generation failed
                                      </p>
                                      <p className="text-xs mt-1">
                                        {output.error ||
                                          "Unknown error occurred"}
                                      </p>
                                    </div>
                                  );
                                }

                                return null;
                              }

                              if (toolCall.type === "tool-generateImage") {
                                const input = toolCall.input as
                                  | {
                                      prompt?: string;
                                      width?: number;
                                      height?: number;
                                    }
                                  | undefined;
                                const output = toolCall.output as
                                  | {
                                      success?: boolean;
                                      image?: string;
                                      publicId?: string;
                                      prompt?: string;
                                      width?: number;
                                      height?: number;
                                      error?: string;
                                    }
                                  | undefined;

                                const isLoading =
                                  toolCall.state === "input-streaming" ||
                                  toolCall.state === "input-available";

                                const hasOutput =
                                  toolCall.state === "output-available" &&
                                  output;

                                if (isLoading) {
                                  return (
                                    <div key={key} className="my-2">
                                      <WebSearchLoading loadingText="Generating image.." />
                                    </div>
                                  );
                                }

                                if (
                                  hasOutput &&
                                  output.success &&
                                  output.image
                                ) {
                                  const imageSrc = output.image;
                                  return (
                                    <div
                                      key={key}
                                      className="my-3 rounded-lg border border-border/40 overflow-hidden bg-muted/30"
                                    >
                                      <div className="p-3 bg-muted/50 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <ImageIcon className="h-4 w-4" />
                                          <span className="font-medium">
                                            Generated Image
                                          </span>
                                        </div>
                                        {input?.prompt && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Prompt: &quot;{input.prompt}&quot;
                                          </p>
                                        )}
                                      </div>
                                      <div className="p-4 flex justify-center bg-background">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={imageSrc}
                                          alt={
                                            input?.prompt || "Generated image"
                                          }
                                          className="max-w-full h-auto rounded-md shadow-sm"
                                          style={{
                                            maxWidth: "100%",
                                            height: "auto",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                }

                                if (hasOutput && !output.success) {
                                  return (
                                    <div
                                      key={key}
                                      className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                                    >
                                      <p className="font-medium">
                                        Image generation failed
                                      </p>
                                      <p className="text-xs mt-1">
                                        {output.error ||
                                          "Unknown error occurred"}
                                      </p>
                                    </div>
                                  );
                                }

                                return null;
                              }

                              if (toolCall.type === "tool-textToSpeech") {
                                const input = toolCall.input as
                                  | {
                                      text?: string;
                                    }
                                  | undefined;
                                const output = toolCall.output as
                                  | {
                                      success?: boolean;
                                      audioUrl?: string;
                                      publicId?: string;
                                      text?: string;
                                      error?: string;
                                    }
                                  | undefined;

                                const isLoading =
                                  toolCall.state === "input-streaming" ||
                                  toolCall.state === "input-available";

                                const hasOutput =
                                  toolCall.state === "output-available" &&
                                  output;

                                if (isLoading) {
                                  return (
                                    <div key={key} className="my-2">
                                      <WebSearchLoading loadingText="Generating speech..." />
                                    </div>
                                  );
                                }

                                if (
                                  hasOutput &&
                                  output.success &&
                                  output.audioUrl
                                ) {
                                  return (
                                    <div
                                      key={key}
                                      className="my-3 rounded-lg border border-border/40 overflow-hidden bg-muted/30"
                                    >
                                      <div className="p-3 bg-muted/50 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <span className="font-medium">
                                            Generated Audio
                                          </span>
                                        </div>
                                        {input?.text && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            &quot;{input.text}&quot;
                                          </p>
                                        )}
                                      </div>
                                      <div className="p-4 flex justify-center bg-background">
                                        <audio
                                          controls
                                          src={output.audioUrl}
                                          className="w-full"
                                        />
                                      </div>
                                    </div>
                                  );
                                }

                                if (hasOutput && !output.success) {
                                  return (
                                    <div
                                      key={key}
                                      className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                                    >
                                      <p className="font-medium">
                                        Speech generation failed
                                      </p>
                                      <p className="text-xs mt-1">
                                        {output.error ||
                                          "Unknown error occurred"}
                                      </p>
                                    </div>
                                  );
                                }

                                return null;
                              }

                              return null;
                            }

                            return null;
                          })}
                      </MessageContent>
                      {message.role === "assistant" && isLastAssistant && (
                        <>
                          {status !== "streaming" && (
                            <MessageActions className="mt-1">
                              {(() => {
                                const textPart = Array.isArray(message.parts)
                                  ? (message.parts as any[]).find(
                                      (p) => p.type === "text" && p.text
                                    )
                                  : null;
                                if (!textPart?.text) return null;
                                return (
                                  <MessageAction
                                    label="Copy"
                                    onClick={() => onCopy(textPart.text)}
                                    tooltip="Copy this response"
                                  >
                                    <CopyIcon className="size-4" />
                                  </MessageAction>
                                );
                              })()}
                            </MessageActions>
                          )}
                        </>
                      )}
                    </Message>
                  );
                })}

                {status === "streaming" && null}
              </>
            )}
            <div ref={listEndRef} />
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="sticky bottom-0 flex w-full items-center justify-center bg-background/80 px-4 pb-6 pt-4 backdrop-blur">
        <div className="w-full max-w-3xl">
          {isLoadingHistory ? (
            <ChatInputSkeleton />
          ) : (
            <ChatInput onSend={onSend} placeholder="Send a message" />
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 4 }).map((_, index) => {
        const isUser = index % 2 === 1;
        return (
          <div
            key={index}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div className="flex items-start gap-3 max-w-[85%]">
              {!isUser && <Skeleton className="h-9 w-9 rounded-full" />}
              <div className="flex-1 space-y-3 rounded-2xl border border-border/40 bg-muted/40 p-4">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
              </div>
              {isUser && <Skeleton className="h-9 w-9 rounded-full" />}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function ChatInputSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/40 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

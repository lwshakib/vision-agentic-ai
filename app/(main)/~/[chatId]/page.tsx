"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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
import { ImageIcon, MessageSquare, CopyIcon } from "lucide-react";
import ChatInput from "@/components/chat-input";
import { Skeleton } from "@/components/ui/skeleton";
import { WebSearchLoading } from "@/components/chat-conversation";
import { toast } from "sonner";
import { useChatStore } from "@/lib/store";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  if (!chatId) return null;

  const { setChatTitle } = useChatStore();

  // Memoize transport to prevent re-creation on every render
  const chatTransport = useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/generate",
      headers: {
        "X-Chat-Id": chatId,
      },
    });
  }, [chatId]); // Only recreate if chatId changes

  const {
    sendMessage,
    messages,
    setMessages,
    status,
    error: aiErrorMessage,
  } = useChat({
    transport: chatTransport,
    onError: (err) => {
      console.error("Chat error:", err);
      const message =
        (err as any)?.message ||
        (typeof err === "string"
          ? err
          : "Something went wrong while sending your message.");

      setError(message);
      toast.error(message);
    },
    onFinish: (message) => {
      // Persist assistant message with parts (including tool outputs)
      const parts = (message as any)?.message?.parts ?? [];
      if (!chatId || !parts || parts.length === 0) return;
      void fetch(`/api/chat/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "assistant",
          parts,
        }),
      }).catch((err) =>
        console.error("Failed to save assistant message:", err)
      );
    },
  });
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const initialMessageSent = useRef(false);
  const messagesLoaded = useRef(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // Reset refs when chatId changes
  useEffect(() => {
    initialMessageSent.current = false;
    messagesLoaded.current = false;
    setIsLoadingHistory(true);
  }, [chatId]);

  // Update chat title if found in messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.parts) {
      const textPart = (lastMessage.parts as any[]).find(
        (p) => p.type === "text"
      );
      if (textPart && typeof textPart.text === "string") {
        const titleMatch = textPart.text.match(/<title>(.*?)<\/title>/);
        if (titleMatch && chatId) {
          setChatTitle(chatId as string, titleMatch[1].trim());
        }
      }
    }
  }, [messages, chatId, setChatTitle]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!isLoadingHistory && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isLoadingHistory, messages.length]);

  const handleRetry = (messageIndex: number) => {
    const target = messages[messageIndex];
    if (!target) return;

    // Find the last user message before this assistant message
    const previousUserMessage = [...messages]
      .slice(0, messageIndex)
      .reverse()
      .find((m) => m.role === "user");

    if (!previousUserMessage) {
      toast.error("No previous user message found to retry.");
      return;
    }

    const prevParts = Array.isArray(previousUserMessage.parts)
      ? (previousUserMessage.parts as any[])
      : [];
    const textPart = prevParts.find((p) => p.type === "text");
    const text = textPart?.text ?? "";

    if (!text) {
      toast.error("Previous user message has no text to retry.");
      return;
    }

    toast.info("Retrying this request...");
    sendMessage({ text });
  };

  useEffect(() => {
    // CRITICAL: We must check window.location directly because next/navigation searchParams
    // might be stale if we used window.history.replaceState to clean the URL without a router navigation.
    // If we rely on stale searchParams, a re-render/remount (e.g. StrictMode) will see the old params
    // and trigger sendMessage again.
    const currentSearchParams: {
      has: (name: string) => boolean;
      get: (name: string) => string | null;
    } =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : (searchParams as unknown as {
            has: (name: string) => boolean;
            get: (name: string) => string | null;
          });

    const hasMessageParam = currentSearchParams.has("message");
    const initial = currentSearchParams.get("message");
    const filesParam = currentSearchParams.get("files");

    if (hasMessageParam && initial && !initialMessageSent.current) {
      initialMessageSent.current = true;
      messagesLoaded.current = true; // Prevent loading history
      setIsLoadingHistory(false);

      // Use window.history to silently clean URL without triggering a re-render/navigation
      // This is crucial to prevent the effect from running again
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("message");
        url.searchParams.delete("files");
        window.history.replaceState({}, "", url.toString());
      }

      // Parse files from query params if present
      let files:
        | Array<{ url: string; name: string; type: string; publicId: string }>
        | undefined;
      if (filesParam) {
        try {
          files = JSON.parse(decodeURIComponent(filesParam));
        } catch (e) {
          console.error("Failed to parse files from query params", e);
        }
      }

      // Double check: if we somehow already have messages, don't send
      if (messages.length > 0) {
        setIsLoadingHistory(false);
        return;
      }

      if (files && files.length > 0) {
        // Persist user message
        if (chatId) {
          void fetch(`/api/chat/${chatId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "user",
              parts: [{ type: "text", text: initial || "See attached files" }],
            }),
          }).catch((err) => console.error("Failed to save user message:", err));
        }

        sendMessage({
          text: initial || "See attached files",
          files: files.map((file) => ({
            id: file.publicId,
            name: file.name,
            url: file.url,
            type: "file",
            mediaType: file.type || "application/octet-stream",
          })),
        });
      } else {
        // Persist user message
        if (chatId && initial) {
          void fetch(`/api/chat/${chatId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "user",
              parts: [{ type: "text", text: initial }],
            }),
          }).catch((err) => console.error("Failed to save user message:", err));
        }

        sendMessage({
          text: initial,
        });
      }
      setIsLoadingHistory(false);
    } else if (!hasMessageParam && !messagesLoaded.current) {
      // Load existing messages from the database if no initial message
      messagesLoaded.current = true;
      const loadMessages = async () => {
        setIsLoadingHistory(true);
        try {
          const response = await fetch(`/api/chat/${chatId}`);
          if (response.ok) {
            const chat = await response.json();
            if (chat.messages && chat.messages.length > 0) {
              setMessages(
                chat.messages.map((message: any) => ({
                  id: message.id,
                  role: message.role,
                  parts: Array.isArray(message.parts) ? message.parts : [],
                  createdAt: message.createdAt,
                }))
              );
            }
          }
        } catch (error) {
          console.error("Failed to load chat messages:", error);
        } finally {
          setIsLoadingHistory(false);
        }
      };

      loadMessages();
    } else {
      setIsLoadingHistory(false);
    }
  }, [chatId, searchParams, sendMessage, setMessages]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error("Failed to copy");
    }
  };

  const handleSend = async (
    text: string,
    files?: Array<{ url: string; name: string; type: string; publicId: string }>
  ) => {
    // Persist user message right after send
    if (text?.trim() && chatId) {
      void fetch(`/api/chat/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          parts: [{ type: "text", text }],
        }),
      }).catch((err) => console.error("Failed to save user message:", err));
    }

    if (files && files.length > 0) {
      // Send message with file attachments
      // The AI SDK supports experimental_attachments for images
      sendMessage({
        text: text || "See attached files",
        files: files.map((file) => {
          return {
            id: file.publicId,
            name: file.name,
            url: file.url,
            type: "file",
            mediaType: file.type || "application/octet-stream",
          };
        }),
      });
    } else {
      sendMessage({
        text,
      });
    }
  };

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
                  // Extract files from message (check both files property and parts)
                  const messageFiles = (message as any).files || [];
                  const fileParts =
                    parts.filter(
                      (part: any) =>
                        part.type === "file" || part.type === "attachment"
                    ) || [];

                  // Combine files from both sources
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
                      {/* Display file attachments if present */}
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
                              let text = part.text ?? "";
                              if (!text) return null;

                              // Filter out <title> tag from displayed text
                              const displayedText = text
                                .replace(/<title>.*?<\/title>/gs, "")
                                .trim();
                              if (!displayedText && text.includes("<title>"))
                                return null;

                              return (
                                <div key={key} className="flex flex-col gap-1">
                                  <MessageResponse className="[&_p]:leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1.5 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto">
                                    {displayedText}
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
                                part.reasoning ?? part.text ?? "";
                              const isStreaming = Boolean(part.isStreaming);

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

                            // Inline sources (if model emits a dedicated sources part)
                            if (part.type === "sources") {
                              const sources = part.sources ?? [];
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

                            // Inline tool calls (loading + results)
                            if (
                              typeof part.type === "string" &&
                              part.type.startsWith("tool-")
                            ) {
                              const toolCall = part;

                              // Web search tool
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
                                      ? `Searching web for \"${input.query}\"..`
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

                              // Extract web URL tool
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

                              // Image-to-image generation tool
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
                                      image?: string; // Cloudinary URL
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
                                  // Image is now a Cloudinary URL, not base64
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

                              // Image generation tool
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
                                      image?: string; // Cloudinary URL
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
                                  // Image is now a Cloudinary URL, not base64
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

                              // Text-to-Speech tool
                              if (toolCall.type === "tool-textToSpeech") {
                                const input = toolCall.input as
                                  | {
                                      text?: string;
                                    }
                                  | undefined;
                                const output = toolCall.output as
                                  | {
                                      success?: boolean;
                                      audioUrl?: string; // Cloudinary URL
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

                              // Other tools – no custom UI yet
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
                                    onClick={() => handleCopy(textPart.text)}
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

                {status === "submitted" && (
                  <Message from="assistant" key="streaming-indicator">
                    <MessageContent>
                      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <span>Generating...</span>
                      </div>
                    </MessageContent>
                  </Message>
                )}
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
            <ChatInput onSend={handleSend} placeholder="Send a message" />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatSkeleton() {
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

function ChatInputSkeleton() {
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

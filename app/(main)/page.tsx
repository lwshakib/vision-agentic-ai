"use client";

import { useMemo, useState } from "react";
import ChatInput from "@/components/chat-input";
import { useRouter, useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import {
  ChatConversationView,
  type ChatMessage,
} from "@/components/chat-conversation";

type FileInfo = {
  url: string;
  name: string;
  type: string;
  publicId: string;
};

export default function PromptInputWithActions() {
  const userName = "Professor";
  const router = useRouter();
  const searchParams = useSearchParams();

  const isTemporaryChat = searchParams?.get("temporary-chat") === "true";

  if (isTemporaryChat) {
    return <TemporaryChat />;
  }

  const handleSend = async (message: string, files?: FileInfo[]) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Failed to start chat");
      return;
    }

    // Build query params
    const params = new URLSearchParams();
    params.set("message", message);

    // Add files if present
    if (files && files.length > 0) {
      params.set("files", encodeURIComponent(JSON.stringify(files)));
    }

    router.push(`/~/${data.chatId}?${params.toString()}`);
  };

  return (
    <div className="bg-background min-h-screen w-full flex flex-col items-center justify-center px-4 py-6 text-center">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Good to see you, {userName}.
          </p>
          <p className="text-lg font-medium mt-1">
            What&apos;s the agenda today, or what are you working on?
          </p>
        </div>

        <div className="w-full max-w-(--breakpoint-md) mx-auto">
          <ChatInput onSend={handleSend} />
        </div>
      </div>
    </div>
  );
}

function TemporaryChat() {
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory] = useState(false);

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/generate",
      }),
    []
  );

  const { sendMessage, messages, status } = useChat({
    transport: chatTransport,
    onError: (err) => {
      console.error("Temporary chat error:", err);
      const message =
        (err as any)?.message ||
        (typeof err === "string"
          ? err
          : "Something went wrong while sending your message.");

      setError(message);
      toast.error(message);
    },
  });

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
    if (files && files.length > 0) {
      sendMessage({
        text: text || "See attached files",
        files: files.map((file) => ({
          id: file.publicId,
          name: file.name,
          url: file.url,
          type: "file",
          mediaType: file.type || "application/octet-stream",
        })),
      });
    } else {
      sendMessage({
        text,
      });
    }
  };

  return (
    <ChatConversationView
      messages={messages as unknown as ChatMessage[]}
      status={status}
      isLoadingHistory={isLoadingHistory}
      onSend={handleSend}
      onCopy={handleCopy}
    />
  );
}

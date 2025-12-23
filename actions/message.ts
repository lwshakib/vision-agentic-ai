import prisma from "@/lib/prisma";
import { MessageRole } from "@/generated/prisma/client";
import { getUser } from "./user";

export async function saveMessage({
  chatId,
  role,
  parts,
}: {
  chatId: string;
  role: "user" | "assistant";
  parts: any;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify chat belongs to user
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  const message = await prisma.message.create({
    data: {
      chatId,
      role: role === "user" ? MessageRole.user : MessageRole.assistant,
      parts,
    },
  });

  return message;
}

export async function saveUserMessage({
  chatId,
  parts,
}: {
  chatId: string;
  parts: any;
}) {
  return saveMessage({
    chatId,
    role: "user",
    parts,
  });
}

export async function saveAssistantMessage({
  chatId,
  parts,
}: {
  chatId: string;
  parts: any;
}) {
  return saveMessage({
    chatId,
    role: "assistant",
    parts,
  });
}

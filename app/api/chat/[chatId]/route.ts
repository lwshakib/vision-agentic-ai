import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { MessageRole } from "@/generated/prisma/client";
import { getUser } from "@/actions/user";

type Params = {
  params: Promise<{ chatId: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { chatId } = await params;

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json(chat);
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { chatId } = await params;
  const existingChat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
  });

  if (!existingChat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const body = await req.json();
  const role: "user" | "assistant" =
    body?.role === "assistant" ? "assistant" : "user";
  const messageText =
    typeof body?.message === "string" ? body.message.trim() : "";
  const parts = Array.isArray(body?.parts) ? body.parts : undefined;

  if (!parts && !messageText) {
    return NextResponse.json(
      { error: "Message text or parts are required" },
      { status: 400 }
    );
  }

  const persistedParts =
    parts && parts.length > 0 ? parts : [{ type: "text", text: messageText }];

  const created = await prisma.message.create({
    data: {
      chatId: existingChat.id,
      role: role === "assistant" ? MessageRole.assistant : MessageRole.user,
      parts: persistedParts,
    },
  });

  return NextResponse.json(created);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const body = await req.json();
  const projectId =
    typeof body?.projectId === "string" && body.projectId.length > 0
      ? body.projectId
      : null;

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
    select: { id: true },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  const updated = await prisma.chat.update({
    where: { id: chatId },
    data: {
      projectId,
      isOnProject: !!projectId,
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      isOnProject: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
    select: { id: true },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await prisma.chat.delete({
    where: { id: chatId },
  });

  return NextResponse.json({ success: true });
}

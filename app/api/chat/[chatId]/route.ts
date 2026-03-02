/**
 * Chat Instance API Route
 * This route handles operations on a specific chat identified by its chatId.
 * It supports fetching, updating, and deleting individual chats and their messages.
 */

import { NextResponse, NextRequest } from 'next/server';
// Import the prisma client for database operations.
import prisma from '@/lib/prisma';
// Import MessageRole enum from the generated prisma client for consistent role naming.
import { MessageRole } from '@/generated/prisma/client';
// Import the current user's retrieval action.
import { getUser } from '@/actions/user';
// Import utility for dynamically generating a concise title for new chats.
import { generateChatTitle } from '@/llm/generate-title';

/**
 * Type definition for the route parameters, accommodating Nextjs 15+ promise-based params.
 */
type Params = {
  params: Promise<{ chatId: string }>;
};

/**
 * GET Handler - Retrieves a specific chat and its full message history.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  // Ensure the request is originating from an authenticated user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve the chatId from route parameters.
  const { chatId } = await params;

  // Query the database for the chat, ensuring it belongs to the current user.
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
    // Include the message history in the response, ordered by creation time.
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  // Handle case where chat doesn't exist or isn't accessible to the user.
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  // Return the chat object with its messages.
  return NextResponse.json(chat);
}

/**
 * POST Handler - Appends a new message (user or assistant) to a specific chat.
 */
export async function POST(req: NextRequest, { params }: Params) {
  // Authentication check.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await params;

  // Validate that the chat exists and is owned by the user.
  const existingChat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
    include: {
      _count: {
        select: { messages: true }, // Used to determine if this is the first message.
      },
    },
  });

  if (!existingChat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  // Parse payload from the request body.
  const body = await req.json();
  const role: 'user' | 'assistant' =
    body?.role === 'assistant' ? 'assistant' : 'user';
  const messageText =
    typeof body?.message === 'string' ? body.message.trim() : '';
  const parts = Array.isArray(body?.parts) ? body.parts : undefined;

  // Validation: either text or structured parts are required.
  if (!parts && !messageText) {
    return NextResponse.json(
      { error: 'Message text or parts are required' },
      { status: 400 },
    );
  }

  // Construct the structured parts array for persistence.
  const persistedParts =
    parts && parts.length > 0 ? parts : [{ type: 'text', text: messageText }];

  // Create the new message in the database.
  const created = await prisma.message.create({
    data: {
      chatId: existingChat.id,
      role: role === 'assistant' ? MessageRole.assistant : MessageRole.user,
      parts: persistedParts,
    },
  });

  // Automatically generate a descriptive title if this is the user's very first message in the chat.
  let generatedTitle: string | undefined = undefined;
  if (
    role === 'user' &&
    existingChat._count.messages === 0 &&
    (existingChat.title === 'New chat' || !existingChat.title)
  ) {
    // Find the primary text component of the message to use as input for the title generator.
    const firstTextPart = persistedParts.find(
      (p: Record<string, unknown>) => p.type === 'text',
    );
    if (firstTextPart?.text) {
      generatedTitle = await generateChatTitle(firstTextPart.text);
      // Update the chat record with the new title.
      await prisma.chat.update({
        where: { id: chatId },
        data: { title: generatedTitle },
      });
    }
  }

  // Return the created message object and optionally the updated title.
  return NextResponse.json({ ...created, title: generatedTitle });
}

/**
 * PATCH Handler - Updates metadata of a specific chat (e.g., assigning it to a project).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  // Authentication check.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await params;
  const body = await req.json();
  const projectId =
    typeof body?.projectId === 'string' && body.projectId.length > 0
      ? body.projectId
      : null;

  // Ensure chat existence and ownership.
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
    select: { id: true },
  });

  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  // If a projectId is provided, ensure that project also belongs to the user.
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  }

  // Update the chat record with the project association.
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

/**
 * DELETE Handler - Permanently removes a chat and all its associated messages.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  // Authentication check.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await params;

  // Ownership verification check.
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
    select: { id: true },
  });

  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  // Trigger cascade delete (messages will be deleted if configured in DB, else manual handling)
  await prisma.chat.delete({
    where: { id: chatId },
  });

  return NextResponse.json({ success: true });
}

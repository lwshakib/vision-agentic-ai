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
// Import the dynamic text generation utility.
import { generateText } from '@/llm/generate-text';

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
  const inputRole = body?.role as string;
  let role: MessageRole = MessageRole.user;

  if (inputRole === 'assistant') role = MessageRole.assistant;
  else if (inputRole === 'system') role = MessageRole.system;
  else if (inputRole === 'tool') role = MessageRole.tool;
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
      role: role,
      parts: persistedParts,
    },
  });

  // Return the created message object.
  const responseData: Record<string, unknown> = created as unknown as Record<
    string,
    unknown
  >;

  // Automatically generate a descriptive title if this is the assistant's very first message in the chat.
  // This ensures the sidebar doesn't just show 'New chat' forever.
  if (
    role === 'assistant' &&
    existingChat._count.messages === 1 &&
    (existingChat.title === 'New chat' || !existingChat.title)
  ) {
    // Retrieve the user's opening message to serve as the context for title generation.
    const userMessage = await prisma.message.findFirst({
      where: {
        chatId: existingChat.id,
        role: MessageRole.user,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (userMessage) {
      const userParts = userMessage.parts as Array<{
        type: string;
        text?: string;
      }>;
      const firstTextPart = userParts.find((p) => p.type === 'text');
      if (firstTextPart?.text) {
        // Use the model to summarize the opening prompt into a title
        const generatedTitle = await generateChatTitle(firstTextPart.text);
        // Persist the new title in the database
        await prisma.chat.update({
          where: { id: chatId },
          data: { title: generatedTitle },
        });
        responseData.title = generatedTitle;
      }
    }
  }

  return NextResponse.json(responseData);
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

/**
 * Generates a short, descriptive title (3-5 words) based on the opening message.
 * @param firstMessage - The starting prompt from the user.
 */
async function generateChatTitle(firstMessage: string): Promise<string> {
  try {
    // Call the model with specific instructions for title creation using GLM-4.7-Flash.
    const { text } = await generateText({
      messages: [
        {
          role: 'user',
          content: `Extract a very short, concise, and descriptive title (3-5 words maximum) for a chat started with this message. Do not use quotes or special characters: "${firstMessage}"`,
        },
      ],
    });

    /**
     * Post-processing:
     * - Remove any lingering quotes or special formatting characters.
     * - Truncate to a reasonable character limit for UI safety.
     * - Fallback to 'New Chat' if the model returns an empty or invalid string.
     */
    return (
      text
        .replace(/["'˙.]/g, '')
        .trim()
        .slice(0, 50) || 'New Chat'
    );
  } catch (error) {
    // If title generation fails, use a generic fallback instead of crashing.
    console.error('Failed to generate chat title:', error);
    return 'New Chat';
  }
}

/**
 * Message Database Actions
 * This module handles the persistence of chat messages to the database using Prisma.
 * It includes security checks to ensure users only modify their own chats.
 */

import prisma from '@/lib/prisma';
import { MessageRole } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { getUser } from './user';

/**
 * Core function to save a message (either user or assistant) to a chat session.
 */
export async function saveMessage({
  chatId,
  role,
  parts,
}: {
  chatId: string;
  role: 'user' | 'assistant';
  parts: Prisma.InputJsonValue;
}) {
  // Step 1: Authenticate the user from headers.
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Step 2: Security check - Verify the target chat belongs to the authenticated user.
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
    },
  });

  if (!chat) {
    throw new Error('Chat not found');
  }

  // Step 3: Create the message record in the database
  const message = await prisma.message.create({
    data: {
      chatId,
      // Map simple strings to Prisma-generated enums for type safety
      role: role === 'user' ? MessageRole.user : MessageRole.assistant,
      // Parts is stored as a JSON object to allow for flexible multimodal data (text, images, tool results)
      parts,
    },
  });

  return message;
}

/**
 * Convenience wrapper for saving a user's prompt.
 */
export async function saveUserMessage({
  chatId,
  parts,
}: {
  chatId: string;
  parts: Prisma.InputJsonValue;
}) {
  return saveMessage({
    chatId,
    role: 'user',
    parts,
  });
}

/**
 * Convenience wrapper for saving an AI's response.
 */
export async function saveAssistantMessage({
  chatId,
  parts,
}: {
  chatId: string;
  parts: Prisma.InputJsonValue;
}) {
  return saveMessage({
    chatId,
    role: 'assistant',
    parts,
  });
}

/**
 * Global Chat API Route
 * This route handles operations that affect multiple chats or initiate new ones.
 */

import { NextResponse } from 'next/server';
// Import the prisma client for database access.
import prisma from '@/lib/prisma';
// Import utility to retrieve the current authenticated user's session.
import { getUser } from '@/actions/user';

/**
 * GET Handler - Retrieves a list of all general-purpose chats (not associated with a specific project) for the user.
 */
export async function GET() {
  // Authentication check: only logged-in users can list their chats.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Query the database for chats belonging to this user that are not categorized under a project.
  const chats = await prisma.chat.findMany({
    where: {
      userId: user.id,
      isOnProject: false, // Only fetch standalone chats.
    },
    orderBy: { createdAt: 'desc' }, // Show the most recently created chats first.
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  // Return the list of chat metadata objects.
  return NextResponse.json(chats);
}

/**
 * POST Handler - Creates a new, blank chat session for the current user.
 */
export async function POST(req: Request) {
  // Authentication check.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse optional projectId from request body.
  const body = await req.json().catch(() => ({}));
  const projectId = typeof body?.projectId === 'string' ? body.projectId : null;

  // Create a new chat record in the database with a placeholder title.
  const chat = await prisma.chat.create({
    data: {
      userId: user.id,
      title: 'New chat', // Default title, typically updated after the first message is processed
      projectId,
      isOnProject: !!projectId, // Flag to distinguish project chats from general chats
    },
    select: {
      id: true, // Returning only the ID is sufficient for the client to perform a redirect
    },
  });

  // Return the ID of the newly created chat.
  return NextResponse.json({ chatId: chat.id });
}

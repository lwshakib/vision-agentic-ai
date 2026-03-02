/**
 * Project-Specific Chats API Route
 * This route allows for listing all chats that belong to a particular project.
 */

import { NextResponse, NextRequest } from 'next/server';
// Import the prisma client for database interaction.
import prisma from '@/lib/prisma';
// Import utility for retrieving the current user's session.
import { getUser } from '@/actions/user';

/**
 * Type definition for the route parameters, utilizing Next.js 15+ promise-based params.
 */
type Params = {
  params: Promise<{ projectId: string }>;
};

/**
 * GET Handler - Returns a list of all chats associated with the specified project ID.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  // Ensure the user is authorized before proceeding.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve the projectId from route dynamic segments.
  const { projectId } = await params;

  // Security Verification: Check if the project actually exists and belongs to the current user.
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
    select: { id: true },
  });

  // If the project doesn't exist or doesn't belong to the user, return a 404.
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Fetch all chats scoped to the verified projectId and userId.
  const chats = await prisma.chat.findMany({
    where: {
      projectId,
      userId: user.id,
    },
    orderBy: { createdAt: 'desc' }, // Order by newest first.
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  // Return the collection of chat objects.
  return NextResponse.json(chats);
}

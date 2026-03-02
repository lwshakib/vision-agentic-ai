/**
 * Single Project API Route
 * Provides metadata and management for a specific project.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUser } from '@/actions/user';

type Params = {
  params: Promise<{ projectId: string }>;
};

/**
 * GET Handler - Retrieves a specific project if it belongs to the current user.
 */
export async function GET(_req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}

/**
 * PATCH Handler - Updates project metadata (e.g., title).
 */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json();
  const title = typeof body?.title === 'string' ? body.title.trim() : null;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: {
      id: projectId,
      userId: user.id,
    },
    data: {
      title,
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE Handler - Removes a project and all its associated chats.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;

  await prisma.project.delete({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  return new NextResponse(null, { status: 204 });
}

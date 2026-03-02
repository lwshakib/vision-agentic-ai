/**
 * Global Projects API Route
 * This route allows for managing projects (groups of related chats).
 */

import { NextResponse } from 'next/server';
// Import utility for retrieving the current user's session.
import { getUser } from '@/actions/user';
// Import bridge to the database.
import prisma from '@/lib/prisma';

/**
 * GET Handler - Lists all projects belonging to the current user.
 */
export async function GET() {
  // Ensure the user is logged in.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Query the database for projects associated with the current user ID.
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }, // Sorted by most recent.
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  // Return the array of project metadata objects.
  return NextResponse.json(projects);
}

/**
 * POST Handler - Creates a new project.
 */
export async function POST(req: Request) {
  // Ensure authentication.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse the incoming request body for project configuration.
  const body = await req.json();
  const title = typeof body?.title === 'string' ? body.title.trim() : '';

  // Validation: A project must have a title.
  if (!title) {
    return NextResponse.json(
      { error: 'Project title is required' },
      { status: 400 },
    );
  }

  // Create the project in the database and associate it with the user.
  const project = await prisma.project.create({
    data: {
      title,
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  // Return the newly created project data with a 201 Created status.
  return NextResponse.json(project, { status: 201 });
}

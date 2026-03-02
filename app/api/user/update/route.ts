import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * API Route: /api/user/update
 * Handles manual updates to user profile fields (name, email, image).
 * Used when better-auth built-in methods are not sufficient or for direct DB sync.
 */
export async function PATCH(req: Request) {
  // Validate the current session.
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, email, image } = await req.json();

    // Perform a partial update on the User record.
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(image !== undefined && { image }),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    console.error('Update user error:', error);
    // Handle unique constraint violations (e.g., email already in use).
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 },
    );
  }
}

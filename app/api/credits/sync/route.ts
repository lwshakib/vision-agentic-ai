import { NextResponse } from 'next/server';
import { getUser } from '@/actions/user';
import { checkAndManageCredits } from '@/actions/credits';

/**
 * GET Handler - Synchronizes and returns the current user's message credits.
 * This route triggers the daily reset logic if applicable.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageCredits } = await checkAndManageCredits(user.id);

    return NextResponse.json({ messageCredits });
  } catch (error) {
    console.error('Error syncing credits:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

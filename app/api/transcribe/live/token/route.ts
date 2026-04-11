import { NextResponse } from 'next/server';
import { aiService } from '@/services/ai.services';
import { getUser } from '@/actions/user';

/**
 * GET Handler - Provides a short-lived token and WebSocket URL for live transcription.
 * This ensures that the frontend can safely establish a WebSocket connection
 * without exposing the permanent AI Gateway API Key.
 */
export async function GET() {
  try {
    // Step 1: Authenticate the user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Request the short-lived token from the AI Gateway via AiService.
    const token = await aiService.getShortLivedToken();

    // Step 3: Construct the WebSocket URL.
    const wsUrl = aiService.getFluxWorkerUrl(token);

    // Step 4: Return the token and the ready-to-use WebSocket URL.
    return NextResponse.json({
      token,
      url: wsUrl,
    });
  } catch (error) {
    console.error('[API_LIVE_TOKEN_ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate live transcription token' },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { aiService } from '@/services/ai.services';

/**
 * Provides a short-lived signed token for Flux ASR via Cloudflare AI Gateway.
 * Uses the centralized AiService to generate the token and construct the WebSocket URL.
 */
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const token = await aiService.getShortLivedToken();
    const url = aiService.getFluxWorkerUrl(token);

    return NextResponse.json({
      url,
      // We also return token here just in case the hook needs it, but the url already has it
      token,
    });
  } catch (err) {
    console.error('Failed to get ASR token:', err);
    return new NextResponse('Server Configuration Error', { status: 500 });
  }
}

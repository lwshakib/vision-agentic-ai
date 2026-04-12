import { NextResponse } from 'next/server';
import { aiService } from '@/services/ai.services';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * Fetches a short-lived token from Cloudflare AI Gateway
 * and returns the pre-configured WebSocket URL for Flux ASR.
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
    return NextResponse.json({
      url: aiService.getFluxWorkerUrl(token),
    });
  } catch (error) {
    console.error('Failed to generate Flux token:', error);
    return new NextResponse('Gateway Configuration Error', { status: 500 });
  }
}

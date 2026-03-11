import { NextResponse } from 'next/server';
import { CLOUDFLARE_API_KEY, FLUX_WORKER_URL } from '@/lib/env';

export async function GET() {
  if (!FLUX_WORKER_URL || !CLOUDFLARE_API_KEY) {
    return NextResponse.json(
      { error: 'ASR configuration missing' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: FLUX_WORKER_URL,
    token: CLOUDFLARE_API_KEY
  });
}

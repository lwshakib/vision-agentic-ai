import { NextResponse } from 'next/server';
import { FLUX_WORKER_URL } from '@/lib/env';

/**
 * Flux ASR Configuration
 * This route now simply provides the Worker URL.
 * Authentication is handled at the Cloudflare Edge via session cookies,
 * eliminating the need for tokens or secrets to be exposed to the browser.
 */
export async function GET(req: Request) {
  const host = req.headers.get('host');
  const protocol = req.url.startsWith('https') ? 'wss' : 'ws';

  // Point to the internal proxy defined in next.config.ts
  const proxiedUrl = `${protocol}://${host}/api/flux/stream`;

  return NextResponse.json({
    url: proxiedUrl,
    token: null, // Token is handled by the server-side rewrite
  });
}

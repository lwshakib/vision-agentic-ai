import { NextResponse } from 'next/server';
import { FLUX_WORKER_URL } from '@/lib/env';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import crypto from 'crypto';

/**
 * Generates a short-lived signed ticket for Flux ASR.
 * This prevents exposing the master API key to the client.
 */
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const secret = process.env.FLUX_JWT_SECRET;
  if (!secret) {
    console.error('Missing FLUX_JWT_SECRET');
    return new NextResponse('Server Configuration Error', { status: 500 });
  }

  // 1. Create a payload (expires in 5 minutes)
  const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 mins
  const payload = JSON.stringify({ uid: session.user.id, exp: expiresAt });
  const base64Payload = Buffer.from(payload).toString('base64url');

  // 2. Sign the payload using HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', secret)
    .update(base64Payload)
    .digest('base64url');

  // 3. The "Ticket" is payload.signature
  const ticket = `${base64Payload}.${signature}`;

  return NextResponse.json({
    url: FLUX_WORKER_URL,
    token: ticket,
  });
}

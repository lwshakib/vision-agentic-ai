import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from '@/services/s3.services';

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const url = await s3Service.getSignedUrl(key);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[API_S3_SIGNED_URL] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    const { key, contentType } = await req.json();

    if (!key || !contentType) {
      return NextResponse.json(
        { error: 'Missing key or contentType' },
        { status: 400 },
      );
    }

    const url = await getPresignedUrl(key, contentType);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[API_S3_PRESIGNED_URL] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}

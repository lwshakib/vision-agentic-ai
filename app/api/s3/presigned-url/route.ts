import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from '@/services/s3.services';

export async function POST(req: NextRequest) {
  try {
    const { key, contentType } = await req.json();

    if (!key || !contentType) {
      return NextResponse.json(
        { error: 'Missing key or contentType' },
        { status: 400 },
      );
    }

    const url = await s3Service.getPresignedUrl(key, contentType);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[API_S3_PRESIGNED_URL] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

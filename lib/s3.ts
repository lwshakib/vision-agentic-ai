import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_ENDPOINT,
  AWS_S3_BUCKET_NAME,
} from '@/lib/env';

const client =
  AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
    ? new S3Client({
        region: AWS_REGION || 'auto',
        endpoint: AWS_ENDPOINT,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
        forcePathStyle: true,
      })
    : null;

/**
 * Generates a presigned URL for uploading a file directly to S3/R2 from the client.
 */
export async function getPresignedUrl(key: string, contentType: string) {
  if (!client) throw new Error('AWS S3 credentials are not configured');

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getS3SignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * Generates a time-limited signed URL for reading a private file from S3/R2.
 */
export async function getSignedUrl(key: string) {
  if (!client) throw new Error('AWS S3 credentials are not configured');

  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
  });

  return await getS3SignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * Direct server-side upload of a buffer to S3/R2.
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string,
) {
  if (!client) throw new Error('AWS S3 credentials are not configured');

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);

  return getSignedUrl(key);
}

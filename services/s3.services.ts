import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_ENDPOINT,
  AWS_S3_BUCKET_NAME,
} from '@/lib/env';

class S3Service {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: AWS_REGION || 'auto',
      endpoint: AWS_ENDPOINT,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID || '',
        secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true, // Required for Cloudflare R2
    });
  }

  /**
   * Generates a presigned URL for uploading a file directly to S3/R2 from the client.
   * @param key - The destination path/filename in the bucket.
   * @param contentType - The mime type of the file.
   * @returns The combined upload URL.
   */
  public async getPresignedUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  /**
   * Generates a time-limited signed URL for reading a private file from S3/R2.
   * @param key - The file path in the bucket.
   * @returns The signed read URL.
   */
  public async getSignedUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  /**
   * Direct server-side upload of a buffer to S3/R2.
   * Useful for persisting AI-generated assets like TTS audio or processed images.
   * @param buffer - The binary data to upload.
   * @param key - The destination path in the bucket.
   * @param contentType - The mime type of the data.
   * @returns The signed URL for reading the newly uploaded file.
   */
  public async uploadFile(buffer: Buffer, key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);

    // Return the signed read URL for immediate use.
    return this.getSignedUrl(key);
  }
}

export const s3Service = new S3Service();

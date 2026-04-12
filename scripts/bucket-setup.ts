import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

/**
 * Bucket Setup Script
 * Ensures the target S3/R2 bucket exists and is properly configured for the application.
 */

dotenv.config();

const {
  AWS_REGION,
  AWS_ENDPOINT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME,
} = process.env;

const client = new S3Client({
  region: AWS_REGION || 'auto',
  endpoint: AWS_ENDPOINT,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID || '',
    secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

async function main() {
  if (!AWS_S3_BUCKET_NAME) {
    console.error(
      '\u001b[31m[Error] AWS_S3_BUCKET_NAME is not defined in environment variables.\u001b[0m',
    );
    process.exit(1);
  }

  console.log(
    `\n\u001b[34m[Setup] Checking bucket: ${AWS_S3_BUCKET_NAME}...\u001b[0m`,
  );

  try {
    await client.send(new HeadBucketCommand({ Bucket: AWS_S3_BUCKET_NAME }));
    console.log(
      `\u001b[32m[Info] Bucket "${AWS_S3_BUCKET_NAME}" already exists.\u001b[0m`,
    );
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(
        `\u001b[33m[Setup] Bucket "${AWS_S3_BUCKET_NAME}" not found. Creating...\u001b[0m`,
      );
      await client.send(
        new CreateBucketCommand({ Bucket: AWS_S3_BUCKET_NAME }),
      );
      console.log(
        `\u001b[32m[Success] Bucket "${AWS_S3_BUCKET_NAME}" created successfully.\u001b[0m`,
      );
    } else {
      console.error(
        '\u001b[31m[Error] Checking/Creating bucket:\u001b[0m',
        error,
      );
      process.exit(1);
    }
  }

  // Configure CORS for web access (Image display, file uploads)
  try {
    console.log('\u001b[34m[Setup] Configuring CORS for bucket...\u001b[0m');
    await client.send(
      new PutBucketCorsCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      }),
    );
    console.log('\u001b[32m[Success] CORS configured successfully.\u001b[0m');
  } catch (error) {
    console.warn(
      '\u001b[33m[Warning] Could not configure CORS:\u001b[0m',
      error,
    );
  }

  console.log('\n\u001b[32m[Complete] Bucket setup finished.\u001b[0m\n');
}

main().catch(console.error);

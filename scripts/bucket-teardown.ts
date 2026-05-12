import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

/**
 * Bucket Teardown Script
 * Deletes all objects within the target S3/R2 bucket and then deletes the bucket itself.
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
    `\n\u001b[35m[Teardown] Starting teardown for bucket: ${AWS_S3_BUCKET_NAME}...\u001b[0m`,
  );

  // 1. Check if bucket exists
  try {
    await client.send(new HeadBucketCommand({ Bucket: AWS_S3_BUCKET_NAME }));
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (
      (error as any).name === 'NotFound' ||
      (error as any).$metadata?.httpStatusCode === 404
    ) {
      console.log(
        `\u001b[32m[Info] Bucket "${AWS_S3_BUCKET_NAME}" does not exist. Nothing to teardown.\u001b[0m\n`,
      );
      return;
    }
    throw error;
  }

  // 2. Clear all objects (S3 requires a bucket to be empty before deletion)
  try {
    console.log(
      `\u001b[34m[Teardown] Listing objects in "${AWS_S3_BUCKET_NAME}"...\u001b[0m`,
    );
    const listResponse = await client.send(
      new ListObjectsV2Command({ Bucket: AWS_S3_BUCKET_NAME }),
    );

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log(
        `\u001b[33m[Teardown] Deleting ${listResponse.Contents.length} objects...\u001b[0m`,
      );

      const deleteParams = {
        Bucket: AWS_S3_BUCKET_NAME,
        Delete: {
          Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
          Quiet: false,
        },
      };

      await client.send(new DeleteObjectsCommand(deleteParams));
      console.log('\u001b[32m[Success] All objects deleted.\u001b[0m');
    } else {
      console.log('\u001b[32m[Info] Bucket is already empty.\u001b[0m');
    }
  } catch (error) {
    console.error(
      '\u001b[31m[Error] Failed to clear bucket objects:\u001b[0m',
      error,
    );
    process.exit(1);
  }

  // 3. Delete the bucket
  try {
    console.log(
      `\u001b[34m[Teardown] Deleting bucket "${AWS_S3_BUCKET_NAME}"...\u001b[0m`,
    );
    await client.send(new DeleteBucketCommand({ Bucket: AWS_S3_BUCKET_NAME }));
    console.log(`\u001b[32m[Success] Bucket deleted successfully.\u001b[0m`);
  } catch (error) {
    console.error('\u001b[31m[Error] Failed to delete bucket:\u001b[0m', error);
    process.exit(1);
  }

  console.log('\n\u001b[32m[Complete] Bucket teardown finished.\u001b[0m\n');
}

main().catch(console.error);

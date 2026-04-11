/**
 * S3 Upload Module
 * 
 * This module uploads files to the project's S3-compatible storage (Cloudflare R2) 
 * using presigned URLs. It provides progress tracking via XMLHttpRequest and 
 * returns the final accessible URL and storage key for each upload.
 */

/**
 * Represents the progress state of an ongoing file upload.
 */
export type UploadProgress = {
  /** Upload completion percentage (0–100). */
  percentage: number;
  /** Bytes uploaded so far. */
  loaded: number;
  /** Total file size in bytes. */
  total: number;
};

/**
 * Result returned after a successful upload.
 */
type UploadResult = {
  /** The publicly accessible (signed) URL of the uploaded file. */
  secureUrl: string;
  /** The storage key (path) of the file in the bucket, used for future operations. */
  publicId: string;
};

/**
 * Generates a unique storage key for the file based on timestamp and a random suffix.
 * Files are organized under the `uploads/` prefix.
 * @param file - The file to generate a key for.
 * @returns A unique S3-compatible object key.
 */
function generateFileKey(file: File): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `uploads/${timestamp}-${randomSuffix}-${sanitizedName}`;
}

/**
 * Uploads a file to S3/R2 storage using a presigned URL.
 * Provides real-time progress tracking through an optional callback.
 * 
 * Flow:
 * 1. Request a presigned upload URL from the backend API.
 * 2. Upload the file directly to S3/R2 using the presigned URL (with XHR for progress).
 * 3. Request a signed read URL from the backend for serving the file.
 * 
 * @param file - The File object to upload.
 * @param onProgress - Optional callback invoked with upload progress updates.
 * @returns A promise resolving to the upload result containing the secure URL and public ID.
 */
export async function uploadToS3(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  const key = generateFileKey(file);

  // Step 1: Get a presigned upload URL from the backend.
  const presignedRes = await fetch('/api/s3/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType: file.type }),
  });

  if (!presignedRes.ok) {
    throw new Error('Failed to get presigned upload URL');
  }

  const { url: presignedUrl } = await presignedRes.json();

  // Step 2: Upload the file directly to S3/R2 using XMLHttpRequest for progress tracking.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          percentage: Math.round((event.loaded / event.total) * 100),
          loaded: event.loaded,
          total: event.total,
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during file upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('File upload was aborted'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });

  // Step 3: Get a signed read URL for the uploaded file.
  const signedRes = await fetch('/api/s3/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });

  if (!signedRes.ok) {
    throw new Error('Failed to get signed read URL');
  }

  const { url: secureUrl } = await signedRes.json();

  return {
    secureUrl,
    publicId: key,
  };
}

/**
 * Cloudinary Client-Side Upload Utility
 * This module provides functions for uploading files directly from the browser to Cloudinary.
 * It handles signature retrieval, resource typing, and progress tracking via XMLHttpRequest.
 */

/**
 * Interface representing the current state of a file upload.
 */
export interface UploadProgress {
  loaded: number; // Bytes already sent.
  total: number; // Total file size.
  percentage: number; // calculated 0-100 value.
}

/**
 * Interface for the successful upload result.
 */
export interface UploadResult {
  url: string; // The URL for the uploaded asset.
  publicId: string; // The specific identifier in Cloudinary.
  secureUrl: string; // The HTTPS URL for the uploaded asset.
}

/**
 * Performs a direct client-side upload to Cloudinary.
 * @param file - The native Browser File object to upload.
 * @param onProgress - Optional callback to monitor upload stats.
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  // Step 1: Securely fetch a signed upload configuration from our backend.
  // We do this to avoid exposing API secrets in the frontend.
  const signatureResponse = await fetch('/api/cloudinary/signature');
  if (!signatureResponse.ok) {
    throw new Error('Failed to get upload signature');
  }

  const { data } = await signatureResponse.json();
  const { signature, cloudName, timestamp, folder, apiKey } = data;

  // Step 2: Determine resource type (different endpoints for images vs. videos).
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';

  // Step 3: Prepare the multi-part form data for the Cloudinary API.
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  // Step 4: Execute the upload using XMLHttpRequest to enable granular progress monitoring.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Attach listener for real-time progress updates.
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100),
        };
        onProgress(progress);
      }
    });

    // Handle successfully finished uploads.
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url || response.url,
            publicId: response.public_id,
            secureUrl: response.secure_url || response.url,
          });
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        // Log errors if the API returned a non-200 status.
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle network interruptions or connectivity errors.
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    // Handle manual cancellations.
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Step 5: Initialize the request and fire the upload.
    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    );
    xhr.send(formData);
  });
}

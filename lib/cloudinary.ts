/**
 * Cloudinary Media Management Utility
 * Provides a single point of interaction for uploading images and audio to Cloudinary.
 */

import { v2 as cloudinary } from 'cloudinary';

// Authentication and configuration using server-side environment variables.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Persists an audio buffer to Cloudinary.
 * @param buffer - The binary audio data.
 * @returns Object with the secure URL and public ID.
 */
export async function saveAudioToCloudinary(buffer: Buffer) {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'vision-agentic-ai/audio',
          resource_type: 'video', // Cloudinary handles audio as type 'video'.
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error('Audio upload returned no result'));
          }
        }
      )
      .end(buffer);
  });
}

/**
 * Persists an image (either as a local path/URL or a Buffer) to Cloudinary.
 * @param file - The image path, URL, or binary Buffer.
 * @returns Object with the secure URL and public ID.
 */
export async function saveImageToCloudinary(file: string | Buffer) {
  const options = {
    folder: 'vision-agentic-ai/images',
    resource_type: 'image' as const,
  };

  if (Buffer.isBuffer(file)) {
    return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(options, (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          } else {
            reject(new Error('Image buffer upload returned no result'));
          }
        })
        .end(file);
    });
  }

  // Handle URL or file path uploads.
  const result = await cloudinary.uploader.upload(file, options);
  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
}

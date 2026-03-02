/**
 * Cloudinary Server-Side Upload Utility
 * Used for uploading generated images or server-processed media to Cloudinary.
 */

import { v2 as cloudinary } from 'cloudinary';

/**
 * Configure the Cloudinary SDK using backend credentials.
 * These are kept secret on the server.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a raw image Buffer directly to Cloudinary.
 * @param imageBuffer - The binary data of the image.
 * @returns An object containing the secure URL and public ID of the uploaded asset.
 */
export async function saveImageToCloudinary(imageBuffer: Buffer) {
  return new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    // Use Cloudinary's upload_stream to handle binary buffers efficiently.
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'vision-agentic-ai', // Target folder name in Cloudinary.
          resource_type: 'image', // Explicitly define as an image.
        },
        (error, result) => {
          if (error) {
            // Reject the promise if something goes wrong.
            reject(error);
          } else if (result) {
            // Resolve with the important URLs from the result.
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          } else {
            reject(new Error('Upload returned no result'));
          }
        },
      )
      // Pipe the buffer into the stream and close it.
      .end(imageBuffer);
  });
}

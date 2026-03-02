/**
 * Cloudinary Signature API Route
 * This route generates temporary signed signatures for secure client-side uploads to Cloudinary.
 * Signing requests on the server prevents leaking the API Secret to the frontend.
 */

import { NextRequest, NextResponse } from 'next/server';
// Import utility to verify the user's session.
import { getUser } from '@/actions/user';
// Import the Cloudinary Node.js SDK for signature generation.
import { v2 as cloudinary } from 'cloudinary';

/**
 * Configure the Cloudinary default instance with credentials from environment variables.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET Handler - Provides upload parameters and a cryptographic signature to the client.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse specific upload options (like destination folder) from the URL query string.
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'vision-agentic-ai'; // Default folder name.

    // Cloudinary requires a UNIX timestamp (in seconds) for every signed request.
    const timestamp = Math.floor(Date.now() / 1000);

    /**
     * Generate a secure signature based on the provided parameters and the API Secret.
     * This signature verifies that the upload request was authorized by the server.
     */
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET!,
    );

    // Return all necessary data for the client-side upload script.
    return NextResponse.json({
      data: {
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        timestamp,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY,
      },
    });
  } catch (error) {
    // Log unexpected errors and return a generic error response.
    console.error('Error generating Cloudinary signature:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

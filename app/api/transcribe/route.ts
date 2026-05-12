import { NextRequest, NextResponse } from 'next/server';
// Import the centralized AI service.
import { transcribeAudio } from '@/llm';

/**
 * POST Handler - Processes an audio file and returns the transcribed text.
 */
export async function POST(req: NextRequest) {
  try {
    // Extract the raw base64 audio data from the request payload.
    const { audioData } = await req.json();

    // Validation check for the audio data presence and format.
    if (!audioData || typeof audioData !== 'string') {
      return NextResponse.json(
        {
          error:
            'Missing or invalid audioData (base64 string) in request body.',
        },
        { status: 400 },
      );
    }

    // Convert the base64 string back into a binary Buffer for transmission.
    const buffer = Buffer.from(audioData, 'base64');

    // Use the centralized transcription service.
    const transcript = await transcribeAudio(buffer);

    // Return the final text string to the client.
    return NextResponse.json({ transcript });
  } catch (err) {
    // Catch-all for unexpected processing or network errors.
    console.error('Transcription route error:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected error while processing audio.',
      },
      { status: 500 },
    );
  }
}

/**
 * Audio Transcription API Route
 * This route handles the conversion of spoken audio into text using the Deepgram API.
 * It expects a base64 encoded audio string in the request body.
 */

import { NextRequest, NextResponse } from 'next/server';
// Import the server-side only Deepgram API key from environment configuration.
import { DEEPGRAM_API_KEY } from '@/lib/env';

/**
 * POST Handler - Processes an audio file and returns the transcribed text.
 */
export async function POST(req: NextRequest) {
  // Guard clause: ensure the necessary API key is configured.
  if (!DEEPGRAM_API_KEY) {
    return NextResponse.json(
      { error: 'Deepgram API key is not configured on the server.' },
      { status: 500 },
    );
  }

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

    /**
     * Invoke Deepgram's Pre-recorded Transcription API.
     * We use the 'nova-3' model which is optimized for high accuracy and speed.
     */
    const dgRes = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-3&language=en',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/webm', // Specify the expected input format.
        },
        body: buffer, // Send the raw binary audio data.
      },
    );

    // Error handling for the Deepgram API call.
    if (!dgRes.ok) {
      const text = await dgRes.text().catch(() => '');
      console.error('Deepgram HTTP error:', dgRes.status, text);
      return NextResponse.json(
        { error: 'Error while transcribing audio.' },
        { status: 500 },
      );
    }

    /**
     * Parse the complex nested response from Deepgram to find the primary transcript.
     */
    const json = (await dgRes.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
          }>;
        }>;
      };
    };

    // Extract the first alternative of the first channel as our final transcript string.
    const transcript =
      json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? '';

    // Log the results for debugging/monitoring purposes.
    if (transcript) {
      console.log('Deepgram transcript:', transcript);
    } else {
      console.log('Deepgram returned empty transcript');
    }

    // Return the final text string to the client.
    return NextResponse.json({ transcript });
  } catch (err) {
    // Catch-all for unexpected processing or network errors.
    console.error('Transcription route error:', err);
    return NextResponse.json(
      { error: 'Unexpected error while processing audio.' },
      { status: 500 },
    );
  }
}

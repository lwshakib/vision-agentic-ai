/**
 * Text-to-Speech API Route
 * Provides a secure endpoint for converting AI responses to speech.
 */
// Import the localized TTS tool implementation.
import { textToSpeechTool } from '@/services/tool.services';
import { NextResponse } from 'next/server';
import { getUser } from '@/actions/user';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, voice } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const result = await textToSpeechTool.execute({
      text,
      voice: voice || 'orpheus',
    });

    if (!result.success) {
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }

    return NextResponse.json({
      audioUrl: result.audioUrl,
      text: text, // The tool doesn't echo back the text, so we return the input text directly
    });
  } catch (error) {
    console.error('[TTS_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * Text-to-Speech API Route
 * Provides a secure endpoint for converting AI responses to speech.
 */
// Import the centralized AI service.
import { aiService } from '@/services/ai.services';
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

    const result = await aiService.textToSpeech(text, voice || 'orpheus');

    if (!result.success) {
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }

    return NextResponse.json({
      audioUrl: result.audioUrl,
      text: result.text,
    });
  } catch (error) {
    console.error('[TTS_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * AI Generation API Route
 * This route serves as the engine for all streaming AI interactions.
 * It leverages the project's internal LLM orchestration to provide real-time responses.
 */

// Import the centralized AI service.
import { streamText } from '@/llm';
import { NextResponse } from 'next/server';
// Import utility for retrieving the current user's session.
import { getUser } from '@/actions/user';
import { checkAndManageCredits, consumeCredit } from '@/actions/credits';

/**
 * Configure the route's maximum execution duration.
 * This is crucial for long-running streaming responses common in complex AI tasks.
 */
export const maxDuration = 30; // Seconds.

/**
 * POST Handler - Receives message history and streams back the AI's response components.
 */
export async function POST(req: Request) {
  try {
    // Authenticate the incoming request.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body for current context and message history.
    const body = await req.json();
    const { messages, isVoiceMode } = body;

    // Credit Management
    const { canProceed } = await checkAndManageCredits(user.id);

    if (!canProceed) {
      return NextResponse.json(
        {
          error: 'Credit exhausted',
          message:
            'You have reached your daily limit of 10 messages. Please upgrade to Pro or wait until tomorrow.',
        },
        { status: 403 },
      );
    }

    // Trigger the core LLM streaming process with optional voice mode formatting.
    const stream = await streamText(messages, {
      isVoiceMode: Boolean(isVoiceMode),
      sessionId: user.id,
    });

    // Decrement the user's daily credit balance upon successful start of generation
    const updatedUser = await consumeCredit(user.id);

    // Return the stream with appropriate headers for Server-Sent Events (SSE)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
        Connection: 'keep-alive',
        'X-Message-Credits': updatedUser.messageCredits.toString(),
      },
    });
  } catch (error: unknown) {
    // Log failures and return an appropriate 500 error code.
    console.error('Error in chat API:', error);

    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 },
    );
  }
}

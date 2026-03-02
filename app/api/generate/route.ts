/**
 * AI Generation API Route
 * This route serves as the engine for all streaming AI interactions.
 * It leverages the project's internal LLM orchestration to provide real-time responses.
 */

// Import the internal utility for handling LLM streaming logic.
import { streamText } from '@/llm/streamText';
import { NextResponse } from 'next/server';
// Import utility for retrieving the current user's session.
import { getUser } from '@/actions/user';

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

    // Parse the request body for the current message history.
    const body = await req.json();
    const { messages } = body;

    // Trigger the core LLM streaming process.
    const result = await streamText(messages);

    /**
     * Convert the raw stream result into a format optimized for the frontend UI.
     * This includes specific flags for structured intelligence like reasoning passes and source citations.
     */
    const response = result.toUIMessageStreamResponse({
      sendReasoning: true, // Enable step-by-step thinking visibility.
      sendSources: true, // Enable web search or document citations.
    });

    // Return the stream directly to the client.
    return response;
  } catch (error: unknown) {
    // Log failures and return an appropriate 500 error code.
    console.error('Error in chat API:', error);

    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 },
    );
  }
}

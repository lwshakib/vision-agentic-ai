import { streamText } from "@/llm/streamText";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages } = body;

    const result = await streamText(messages);

    // Create a custom response that saves the assistant message after streaming
    const response = result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });

    return response;
  } catch (error: any) {
    console.error("Error in chat API:", error);

    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}

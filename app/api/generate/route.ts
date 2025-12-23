import { streamText } from "@/llm/streamText";
import { NextResponse } from "next/server";
import { getUser } from "@/actions/user";
import prisma from "@/lib/prisma";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = req.headers.get("X-Chat-Id");
    const body = await req.json();
    const { messages } = body;

    const result = await streamText(messages, async ({ text }) => {
      if (chatId && text) {
        const titleMatch = text.match(/<title>(.*?)<\/title>/);
        if (titleMatch) {
          const title = titleMatch[1].trim();
          await prisma.chat
            .update({
              where: { id: chatId },
              data: { title },
            })
            .catch((err) =>
              console.error("Failed to update chat title in onFinish:", err)
            );
        }
      }
    });

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

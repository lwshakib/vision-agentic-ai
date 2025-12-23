import { NextRequest, NextResponse } from "next/server";
import { DEEPGRAM_API_KEY } from "@/env";

export async function POST(req: NextRequest) {
  if (!DEEPGRAM_API_KEY) {
    return NextResponse.json(
      { error: "Deepgram API key is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const { audioData } = await req.json();

    if (!audioData || typeof audioData !== "string") {
      return NextResponse.json(
        {
          error:
            "Missing or invalid audioData (base64 string) in request body.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(audioData, "base64");

    // Call Deepgram's HTTP API directly with the raw audio bytes
    const dgRes = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3&language=en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/webm",
        },
        body: buffer,
      }
    );

    if (!dgRes.ok) {
      const text = await dgRes.text().catch(() => "");
      console.error("Deepgram HTTP error:", dgRes.status, text);
      return NextResponse.json(
        { error: "Error while transcribing audio." },
        { status: 500 }
      );
    }

    const json: any = await dgRes.json();
    const transcript =
      json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";

    if (transcript) {
      console.log("Deepgram transcript:", transcript);
    } else {
      console.log("Deepgram returned empty transcript");
    }

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("Transcription route error:", err);
    return NextResponse.json(
      { error: "Unexpected error while processing audio." },
      { status: 500 }
    );
  }
}

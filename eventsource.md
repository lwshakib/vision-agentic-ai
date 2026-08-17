# Implementation Guide: Real-Time SSE Streaming in Next.js

This guide explains how to implement real-time unidirectional streaming from a Next.js App Router Route Handler to a React frontend using standard **Server-Sent Events (SSE)** and the browser's native **`EventSource`** API.

Using native `EventSource` on the client and proper headers on the server prevents browsers and proxy servers from buffering stream data, enabling instantaneous chunk-by-chunk rendering.

---

## 1. Backend Implementation (Next.js Route Handler)

Create a Route Handler (e.g. `app/api/stream/route.ts`). You need to:
1. Format streamed chunks as SSE event frames (`data: <payload>\n\n`).
2. Run data generation asynchronously inside the stream's `pull` method (using an `AsyncGenerator`) to prevent start-up buffering.
3. Configure the HTTP headers to instruct the browser and intermediate servers to disable buffering.

### Backend Code Template

```typescript
// app/api/stream/route.ts
import { NextRequest } from "next/server";

// Force Next.js to evaluate this route dynamically and avoid static pre-rendering
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

/**
 * Converts an async generator/iterator into a standard Web ReadableStream.
 * Handles chunk delivery through the stream's pull mechanism.
 */
function iteratorToStream(iterator: AsyncGenerator<Uint8Array, void, unknown>) {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();

        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (err) {
        console.error("Stream pipe error:", err);
        controller.error(err);
      }
    },
  });
}

/**
 * Async generator yielding data in SSE syntax.
 */
async function* makeIterator() {
  const items = ["Initializing system...", "Loading modules...", "Processing inputs...", "Task complete."];

  for (const item of items) {
    // 1. Format the data as JSON wrapped in the SSE protocol data envelope
    const payload = JSON.stringify({ text: item + " " });
    yield encoder.encode(`data: ${payload}\n\n`);

    // 2. Introduce artificial delay or await your database/AI responses
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // 3. Send a terminal flag to notify the browser EventSource to close
  yield encoder.encode("data: [DONE]\n\n");
}

export async function GET(request: NextRequest) {
  const iterator = makeIterator();
  const stream = iteratorToStream(iterator);

  return new Response(stream, {
    headers: {
      // Required SSE Content-Type
      "Content-Type": "text/event-stream; charset=utf-8",
      
      // Prevent browser-side caching
      "Cache-Control": "no-cache, no-transform",
      
      // Persistent Connection
      "Connection": "keep-alive",
      
      // Bypass buffering on reverse proxies (e.g. Nginx, Cloudflare)
      "X-Accel-Buffering": "no",
      
      // Stop the browser from sniffing the MIME type (which causes buffering)
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

---

## 2. Client-Side Implementation (React Component)

To consume the stream on the frontend, use the native `EventSource` API. Since `EventSource` is built specifically for Server-Sent Events, the browser executes the `onmessage` callback as soon as it parses a `\n\n` chunk separator, bypassing body buffer queues.

### Client Code Template

```tsx
import React, { useState, useEffect, useRef } from "react";

export default function StreamViewer() {
  const [streamedText, setStreamedText] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "streaming" | "completed" | "error">("idle");
  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up connection on component unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startStream = () => {
    // 1. Close existing connection if active
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStreamedText("");
    setStatus("streaming");

    // 2. Open connection
    const eventSource = new EventSource("/api/stream");
    eventSourceRef.current = eventSource;

    // 3. Register Event Listeners
    eventSource.onopen = () => {
      console.log("SSE Connection opened");
    };

    eventSource.onmessage = (event) => {
      // 4. Check for final termination signal
      if (event.data === "[DONE]") {
        eventSource.close();
        eventSourceRef.current = null;
        setStatus("completed");
        return;
      }

      try {
        const parsed = JSON.parse(event.data);
        const textChunk = parsed.text || "";
        
        // Append chunk immediately to trigger React state updates
        setStreamedText((prev) => prev + textChunk);
      } catch (err) {
        console.error("Failed to parse event data packet:", err);
      }
    };

    eventSource.onerror = () => {
      // Inspect state to determine if it was a clean finish or a network drop
      if (eventSource.readyState === EventSource.CLOSED) {
        setStatus((prev) => (prev === "completed" ? "completed" : "error"));
      } else {
        setStatus("error");
        eventSource.close();
        eventSourceRef.current = null;
      }
    };
  };

  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStatus("idle");
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-zinc-900 text-zinc-100 rounded-lg shadow-md">
      <h2 className="text-lg font-bold mb-4">Native SSE Terminal</h2>
      
      <div className="h-64 p-4 mb-4 bg-black rounded font-mono text-xs overflow-y-auto whitespace-pre-wrap">
        {streamedText || <span className="text-zinc-600">Standby...</span>}
      </div>

      <div className="flex gap-2 justify-end">
        {status === "streaming" ? (
          <button onClick={stopStream} className="px-4 py-2 bg-red-600 text-white rounded">
            Cancel
          </button>
        ) : (
          <button onClick={startStream} className="px-4 py-2 bg-blue-600 text-white rounded">
            Start Stream
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## 3. Important Design Considerations & Gotchas

> [!WARNING]
> ### 1. Connection Limits (HTTP/1.1 vs HTTP/2)
> When using HTTP/1.1 (the default in some local development proxies or older environments), browsers limit the maximum number of concurrent persistent connections per domain to **6**. Opening multiple stream tabs can lock up the browser.
> * **Fix:** Make sure your production environment supports **HTTP/2** (or HTTP/3), which multiplexes connections and does not suffer from this limit.

> [!IMPORTANT]
> ### 2. The termination check (`[DONE]`)
> Unlike a Web socket or a standard HTTP response, a closed SSE connection natively triggers the browser to attempt an automatic retry/reconnect. If you don't explicitly handle the end of stream:
> * The server will run out of iterations and close the stream.
> * The browser `EventSource` will enter `onerror`, wait a few seconds, and call the Route Handler again, creating a **permanent reconnect loop**.
> * **Fix:** Always send a dedicated terminal signal (`data: [DONE]\n\n`) and call `eventSource.close()` inside the client message handler when it is read.

> [!TIP]
> ### 3. CORS Configurations
> If your API is hosted on a different domain than your frontend client, you must allow CORS. When initializing `EventSource`, pass authorization cookies using the `withCredentials` option:
> ```typescript
> const eventSource = new EventSource("https://api.domain.com/stream", {
>   withCredentials: true,
> });
> ```
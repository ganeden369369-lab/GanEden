/** CORS headers shared by every edge function response. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** JSON response helper that always carries the CORS headers. */
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export interface Sse {
  /** The Response to return from the function handler; its body streams SSE frames. */
  response: Response;
  /** Enqueue one `event: <event>\ndata: <json>\n\n` frame. */
  send(event: string, data: unknown): void;
  /** End the stream. */
  close(): void;
}

/**
 * Creates a Server-Sent Events response backed by a TransformStream.
 * `send`/`close` are synchronous — writes are queued on the underlying
 * writable stream in call order.
 */
export function createSse(): Sse {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const response = new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...corsHeaders,
    },
  });

  function send(event: string, data: unknown): void {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    // Fire-and-forget: writing after the stream is closed (e.g. client
    // disconnected) rejects asynchronously — swallow it rather than crash.
    writer.write(encoder.encode(frame)).catch(() => {});
  }

  function close(): void {
    writer.close().catch(() => {});
  }

  return { response, send, close };
}

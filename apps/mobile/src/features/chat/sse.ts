/** One parsed `event: <name>\ndata: <json>\n\n` frame. */
export type SseFrame = { event: string; data: unknown };

/**
 * Parses a `text/event-stream` body into `{ event, data }` frames, buffering
 * across chunk boundaries (a chunk can split mid-line, including mid `data:`
 * line, or mid CRLF). Frames are delimited by a blank line (`\n\n`, or
 * `\r\n\r\n` — the buffer is CRLF-normalized to `\n` on every append, so
 * both line-ending styles parse identically); `data:` lines are JSON-parsed
 * (joined with `\n` when a frame carries more than one, per the SSE spec);
 * comment lines (starting with `:`) are ignored; a frame with no `data:`
 * line is dropped.
 */
export async function* parseSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    if (done) buffer += decoder.decode();
    buffer = buffer.replace(/\r\n/g, '\n');

    let sepIndex = buffer.indexOf('\n\n');
    while (sepIndex !== -1) {
      const rawFrame = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const frame = parseFrame(rawFrame);
      if (frame) yield frame;
      sepIndex = buffer.indexOf('\n\n');
    }

    if (done) return;
  }
}

function parseFrame(rawFrame: string): SseFrame | null {
  let event = 'message';
  const dataLines: string[] = [];

  // The buffer is CRLF-normalized to `\n` before frames are sliced off, so a
  // plain `\n` split is all a line needs here.
  for (const line of rawFrame.split('\n')) {
    if (line.length === 0 || line.startsWith(':')) continue; // blank / comment
    if (line.startsWith('event:')) {
      event = stripLeadingSpace(line.slice('event:'.length));
    } else if (line.startsWith('data:')) {
      dataLines.push(stripLeadingSpace(line.slice('data:'.length)));
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: JSON.parse(dataLines.join('\n')) };
}

function stripLeadingSpace(value: string): string {
  return value.startsWith(' ') ? value.slice(1) : value;
}

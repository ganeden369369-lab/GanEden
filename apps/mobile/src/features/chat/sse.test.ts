import { parseSseStream } from './sse';

/** A minimal `ReadableStreamDefaultReader` that yields one chunk per `read()` call. */
function readerFromChunks(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    read: async () => {
      if (index >= chunks.length) return { done: true, value: undefined };
      const value = encoder.encode(chunks[index]);
      index += 1;
      return { done: false, value };
    },
    releaseLock: () => {},
    cancel: async () => {},
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

async function collect(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<{ event: string; data: unknown }[]> {
  const events: { event: string; data: unknown }[] = [];
  for await (const evt of parseSseStream(reader)) {
    events.push(evt);
  }
  return events;
}

describe('parseSseStream', () => {
  it('parses two frames split across 3 chunks, including a split mid data: line', async () => {
    const frame1 =
      'event: meta\ndata: {"chatId":"c1","userMessageId":"u1","assistantMessageId":null,"remaining":5}\n\n';
    const frame2 = 'event: delta\ndata: {"text":"hello"}\n\n';
    const full = frame1 + frame2;

    // Cut #1 lands inside frame1's `data:` line (mid "chatId" value).
    const cut1 = frame1.indexOf('"chatId"') + 4;
    // Cut #2 lands partway into frame2, after cut1.
    const cut2 = frame1.length + 10;
    expect(cut1).toBeGreaterThan(0);
    expect(cut2).toBeGreaterThan(cut1);

    const chunks = [full.slice(0, cut1), full.slice(cut1, cut2), full.slice(cut2)];
    const events = await collect(readerFromChunks(chunks));

    expect(events).toEqual([
      { event: 'meta', data: { chatId: 'c1', userMessageId: 'u1', assistantMessageId: null, remaining: 5 } },
      { event: 'delta', data: { text: 'hello' } },
    ]);
  });

  it('ignores comment lines within a frame', async () => {
    const chunks = [': keep-alive\n\n', 'event: cap\ndata: {"remaining":0}\n\n'];
    const events = await collect(readerFromChunks(chunks));

    expect(events).toEqual([{ event: 'cap', data: { remaining: 0 } }]);
  });

  it('defaults to event "message" when no event: line is present', async () => {
    const chunks = ['data: {"text":"hi"}\n\n'];
    const events = await collect(readerFromChunks(chunks));

    expect(events).toEqual([{ event: 'message', data: { text: 'hi' } }]);
  });

  it('yields completed frames and stops cleanly when the stream ends mid-frame with no trailing blank line', async () => {
    const complete = 'event: delta\ndata: {"text":"a"}\n\nevent: delta\ndata: {"text":"b"}\n\n';
    const partial = 'event: delta\ndata: {"text":"c"'; // no closing brace, no trailing \n\n
    const events = await collect(readerFromChunks([complete + partial]));

    expect(events).toHaveLength(2);
    expect(events).toEqual([
      { event: 'delta', data: { text: 'a' } },
      { event: 'delta', data: { text: 'b' } },
    ]);
  });

  it('parses a CRLF-framed two-event stream (\\r\\n line endings and \\r\\n\\r\\n frame separators)', async () => {
    const full = 'event: meta\r\ndata: {"chatId":"c1"}\r\n\r\nevent: delta\r\ndata: {"text":"hi"}\r\n\r\n';
    const events = await collect(readerFromChunks([full]));

    expect(events).toEqual([
      { event: 'meta', data: { chatId: 'c1' } },
      { event: 'delta', data: { text: 'hi' } },
    ]);
  });

  it('parses a CRLF-framed stream split across chunk boundaries, including a split mid \\r\\n', async () => {
    const full = 'event: meta\r\ndata: {"chatId":"c1"}\r\n\r\nevent: delta\r\ndata: {"text":"hi"}\r\n\r\n';
    // Cut lands between the \r and \n of the first frame's terminating \r\n\r\n.
    const cut = full.indexOf('}\r\n\r\n') + 2; // after "}\r", before "\n\r\n"
    const chunks = [full.slice(0, cut), full.slice(cut)];
    const events = await collect(readerFromChunks(chunks));

    expect(events).toEqual([
      { event: 'meta', data: { chatId: 'c1' } },
      { event: 'delta', data: { text: 'hi' } },
    ]);
  });
});

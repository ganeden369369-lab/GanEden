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
    const reader = readerFromChunks(chunks);

    const events: { event: string; data: unknown }[] = [];
    for await (const evt of parseSseStream(reader)) {
      events.push(evt);
    }

    expect(events).toEqual([
      { event: 'meta', data: { chatId: 'c1', userMessageId: 'u1', assistantMessageId: null, remaining: 5 } },
      { event: 'delta', data: { text: 'hello' } },
    ]);
  });

  it('ignores comment lines and stops cleanly when the stream ends without a trailing frame', async () => {
    const chunks = [': keep-alive\n\n', 'event: cap\ndata: {"remaining":0}\n\n'];
    const reader = readerFromChunks(chunks);

    const events: { event: string; data: unknown }[] = [];
    for await (const evt of parseSseStream(reader)) {
      events.push(evt);
    }

    expect(events).toEqual([{ event: 'cap', data: { remaining: 0 } }]);
  });
});

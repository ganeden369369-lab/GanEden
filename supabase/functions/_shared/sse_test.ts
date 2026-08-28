import { strict as assert } from 'node:assert';
import { createSse } from './sse.ts';

Deno.test('createSse sets SSE + CORS headers', () => {
  const sse = createSse();
  assert.equal(sse.response.headers.get('Content-Type'), 'text/event-stream; charset=utf-8');
  assert.equal(sse.response.headers.get('Cache-Control'), 'no-cache');
  assert.equal(sse.response.headers.get('Connection'), 'keep-alive');
  assert.equal(sse.response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(
    sse.response.headers.get('Access-Control-Allow-Headers'),
    'authorization, x-client-info, apikey, content-type',
  );
  sse.close();
});

Deno.test('two sends produce two well-formed SSE frames in order', async () => {
  const sse = createSse();

  sse.send('meta', { chatId: 'abc', remaining: 3 });
  sse.send('delta', { text: 'hello' });
  sse.close();

  const body = await sse.response.text();

  const expected =
    `event: meta\ndata: ${JSON.stringify({ chatId: 'abc', remaining: 3 })}\n\n` +
    `event: delta\ndata: ${JSON.stringify({ text: 'hello' })}\n\n`;

  assert.equal(body, expected);
});

Deno.test('send after close is a no-op that does not throw synchronously', () => {
  const sse = createSse();
  sse.close();
  // Writing to a closed writer rejects asynchronously; send() must not throw.
  assert.doesNotThrow(() => sse.send('done', { status: 'complete' }));
});

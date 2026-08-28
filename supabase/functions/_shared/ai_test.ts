import { strict as assert } from 'node:assert';
import { z } from 'zod';
import { MemoryExtractionSchema, buildMemoryExtractionInput, buildTitlePrompt } from '@gan-eden/prompts';
import { MockProvider, ProviderError, estimateUsd, getProvider, usageOf } from './ai.ts';

/** Local stand-in for `packages/prompts/src/quotes.ts`'s `QuoteBatchSchema` (Task 2) — same shape, defined here so Task 1 doesn't depend on Task 2. */
const QuoteBatchSchema = z.object({
  quotes: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        text: z.string().min(1).max(200),
        theme: z.string().min(1),
      }),
    )
    .min(1),
});

Deno.test('getProvider defaults to the mock provider when AI_PROVIDER is unset', () => {
  const provider = getProvider({});
  assert.equal(provider.name, 'mock');
});

Deno.test("getProvider({AI_PROVIDER:'mock'}) returns a provider named 'mock'", () => {
  const provider = getProvider({ AI_PROVIDER: 'mock' });
  assert.equal(provider.name, 'mock');
});

Deno.test('getProvider returns the anthropic provider when configured', () => {
  const provider = getProvider({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-test' });
  assert.equal(provider.name, 'anthropic');
});

Deno.test('MockProvider.streamChat concatenates deltas to the returned text and includes the name (EN)', async () => {
  const provider = new MockProvider();
  const chunks: string[] = [];

  const result = await provider.streamChat({
    system: {
      stablePrefix: 'You are Eden...',
      userBlock: ['About this user:', 'Name: Maya', 'Numbers:', '- life_path: 7'].join('\n'),
    },
    messages: [{ role: 'user', content: 'I feel stuck in my relationship.' }],
    maxTokens: 500,
    onDelta: (t) => chunks.push(t),
  });

  assert.equal(chunks.join(''), result.text);
  assert.ok(result.text.includes('Maya'), 'reply should include the user first name');
  assert.equal(result.stopReason, 'end_turn');
  assert.equal(result.model, 'mock');
  assert.ok(result.outputTokens > 0);
  assert.ok(result.inputTokens > 0);
});

Deno.test('MockProvider.streamChat replies in Hebrew for a Hebrew userBlock and includes the name', async () => {
  const provider = new MockProvider();
  const chunks: string[] = [];

  const result = await provider.streamChat({
    system: {
      stablePrefix: 'את עדן...',
      userBlock: ['על המשתמשת:', 'שם: מאיה', 'מספרים:', '- life_path: 7'].join('\n'),
    },
    messages: [{ role: 'user', content: 'אני תקועה בזוגיות שלי.' }],
    maxTokens: 500,
    onDelta: (t) => chunks.push(t),
  });

  assert.equal(chunks.join(''), result.text);
  assert.ok(result.text.includes('מאיה'), 'reply should include the user first name');
});

Deno.test('MockProvider.streamChat stops emitting deltas once the signal is aborted', async () => {
  const provider = new MockProvider();
  const controller = new AbortController();
  const chunks: string[] = [];

  const result = await provider.streamChat({
    system: {
      stablePrefix: 'You are Eden...',
      userBlock: ['About this user:', 'Name: Maya', 'Numbers:', '- life_path: 7'].join('\n'),
    },
    messages: [{ role: 'user', content: 'Tell me something long and detailed, please.' }],
    maxTokens: 500,
    signal: controller.signal,
    onDelta: (t) => {
      chunks.push(t);
      if (chunks.length === 2) controller.abort();
    },
  });

  // The loop checks the signal between tokens, so exactly the 2 chunks
  // that were already in flight when abort() fired get through.
  assert.equal(chunks.length, 2);
  assert.equal(result.text, chunks.join(''));
  // A full (unaborted) reply is much longer than 2 word-chunks — confirms
  // streaming genuinely stopped early rather than the reply being short.
  const fullReply = await new MockProvider().streamChat({
    system: {
      stablePrefix: 'You are Eden...',
      userBlock: ['About this user:', 'Name: Maya', 'Numbers:', '- life_path: 7'].join('\n'),
    },
    messages: [{ role: 'user', content: 'Tell me something long and detailed, please.' }],
    maxTokens: 500,
    onDelta: () => {},
  });
  assert.ok(
    fullReply.text.split(/\s+/).length > 10,
    'expected the full mock reply to be much longer than the aborted 2-chunk one',
  );
});

Deno.test('MockProvider.complete returns JSON parseable by MemoryExtractionSchema for a memory prompt', async () => {
  const provider = new MockProvider();
  const { system, user } = buildMemoryExtractionInput({
    language: 'en',
    existingSummary: '',
    existingFacts: [],
    exchange: {
      user: 'My mother has been sick and it is stressing me out, I also started a new job.',
      assistant: 'I hear you — that sounds like a lot to carry at once.',
    },
  });

  const result = await provider.complete({ system, user, maxTokens: 500 });
  const parsed = MemoryExtractionSchema.parse(JSON.parse(result.text));

  assert.ok(parsed.facts.length >= 1);
  assert.ok(parsed.summary.length > 0);
  assert.equal(result.model, 'mock');
});

Deno.test('MockProvider.complete returns schema-valid (empty) facts for a 2-char user line', async () => {
  const provider = new MockProvider();
  const { system, user } = buildMemoryExtractionInput({
    language: 'en',
    existingSummary: '',
    existingFacts: [],
    exchange: {
      user: 'hi',
      assistant: 'Hi there!',
    },
  });

  const result = await provider.complete({ system, user, maxTokens: 500 });
  const parsed = MemoryExtractionSchema.parse(JSON.parse(result.text));

  assert.deepEqual(parsed.facts, []);
});

Deno.test('MockProvider.complete extracts the CURRENT exchange, not a stale User: line embedded in a prior mock summary', async () => {
  const provider = new MockProvider();

  // Simulates turn 2+: `existingSummary` is turn 1's stored mock summary,
  // which itself must never contain "User: ..." scaffold text (regression
  // coverage for a bug where it did, and every later turn kept
  // re-extracting turn 1's facts forever instead of the new exchange's).
  const { system, user } = buildMemoryExtractionInput({
    language: 'en',
    existingSummary: 'Recent: User: this looks like an old exchange line, not real prose',
    existingFacts: ['Hi Eden', 'I met someone new'],
    exchange: { user: 'Continuing the same chat', assistant: 'Some reply text.' },
  });

  const result = await provider.complete({ system, user, maxTokens: 500 });
  const parsed = MemoryExtractionSchema.parse(JSON.parse(result.text));

  assert.ok(
    parsed.facts.some((f) => f.text.includes('Continuing the same chat')),
    `expected a fact derived from the new exchange, got: ${JSON.stringify(parsed.facts)}`,
  );
  assert.ok(
    !parsed.summary.includes('old exchange line'),
    `mock summary must not carry forward stale embedded prompt text, got: "${parsed.summary}"`,
  );
});

Deno.test('MockProvider.complete returns a <=4-word title for a title prompt', async () => {
  const provider = new MockProvider();
  const { system, user } = buildTitlePrompt({
    language: 'en',
    firstUserMessage: 'I want to understand my life path number better please',
  });

  const result = await provider.complete({ system, user, maxTokens: 50 });
  const words = result.text.trim().split(/\s+/).filter(Boolean);

  assert.ok(words.length <= 4, `expected <=4 words, got: "${result.text}"`);
  assert.ok(words.length >= 1);
});

Deno.test('estimateUsd computes cost from the price table', () => {
  assert.equal(estimateUsd('claude-sonnet-5', 1_000_000, 1_000_000), 12);
  assert.equal(estimateUsd('claude-opus-5', 1_000_000, 1_000_000), 30);
  assert.equal(estimateUsd('claude-sonnet-5', 500_000, 0), 1);
  assert.equal(estimateUsd('unknown-model', 1_000_000, 1_000_000), 12);
});

Deno.test("estimateUsd('mock', ...) is always $0", () => {
  assert.equal(estimateUsd('mock', 1_000_000, 1_000_000), 0);
  assert.equal(estimateUsd('mock', 0, 0), 0);
});

// --- complete(): schema/kind (Task 1) --------------------------------------

Deno.test('MockProvider.complete with kind:"memory" + schema returns .data matching MemoryExtractionSchema', async () => {
  const provider = new MockProvider();
  const { system, user } = buildMemoryExtractionInput({
    language: 'en',
    existingSummary: '',
    existingFacts: [],
    exchange: {
      user: 'My mother has been sick and it is stressing me out, I also started a new job.',
      assistant: 'I hear you — that sounds like a lot to carry at once.',
    },
  });

  const result = await provider.complete({
    system,
    user,
    maxTokens: 500,
    schema: MemoryExtractionSchema,
    kind: 'memory',
  });

  assert.ok(result.data, 'expected .data to be set for a schema-bearing call');
  assert.ok(result.data!.facts.length >= 1);
  assert.ok(result.data!.summary.length > 0);
  // .text still carries the same JSON, unchanged from the pre-schema shape.
  assert.deepEqual(JSON.parse(result.text), result.data);
});

Deno.test('MockProvider.complete with kind:"title" (no schema) leaves .data undefined', async () => {
  const provider = new MockProvider();
  const { system, user } = buildTitlePrompt({
    language: 'en',
    firstUserMessage: 'I want to understand my life path number better please',
  });

  const result = await provider.complete({ system, user, maxTokens: 50, kind: 'title' });

  assert.equal(result.data, undefined);
  const words = result.text.trim().split(/\s+/).filter(Boolean);
  assert.ok(words.length <= 4 && words.length >= 1);
});

const NO_EMOJI = /\p{Extended_Pictographic}/u;

Deno.test('MockProvider.complete with kind:"quotes" builds one <=200-char, emoji-free quote per date, containing the first name', async () => {
  const provider = new MockProvider();
  const system = ['You are Eden...', 'About this user:', 'Name: Maya'].join('\n');
  const user = ['Plan:', '2026-08-28 | 5 | career', '2026-08-29 | 6 | relationships', '2026-08-30 | 1 | growth'].join(
    '\n',
  );

  const result = await provider.complete({
    system,
    user,
    maxTokens: 2000,
    schema: QuoteBatchSchema,
    kind: 'quotes',
  });

  assert.ok(result.data, 'expected .data to be set for a schema-bearing call');
  assert.equal(result.data!.quotes.length, 3);
  const dates = result.data!.quotes.map((q) => q.date);
  assert.deepEqual(dates, ['2026-08-28', '2026-08-29', '2026-08-30']);
  for (const quote of result.data!.quotes) {
    assert.ok(quote.text.length <= 200, `expected <=200 chars, got ${quote.text.length}: "${quote.text}"`);
    assert.ok(quote.text.includes('Maya'), `expected the quote to include the first name, got: "${quote.text}"`);
    assert.ok(!NO_EMOJI.test(quote.text), `expected no emoji, got: "${quote.text}"`);
  }
});

Deno.test('MockProvider.complete with kind:"quotes" skips malformed plan lines rather than throwing', async () => {
  const provider = new MockProvider();
  const system = 'You are Eden...';
  const user = ['not a plan line', '', '2026-09-01 | 3 | health'].join('\n');

  const result = await provider.complete({
    system,
    user,
    maxTokens: 2000,
    schema: QuoteBatchSchema,
    kind: 'quotes',
  });

  assert.equal(result.data!.quotes.length, 1);
  assert.equal(result.data!.quotes[0]!.date, '2026-09-01');
});

Deno.test('MockProvider.complete throws ProviderError("parse") when schema-validated output does not satisfy the schema', async () => {
  const provider = new MockProvider();
  // MockProvider's kind:'memory' output is always {facts, summary} JSON — a
  // schema demanding a field that can never appear guarantees a mismatch.
  const impossibleSchema = z.object({ neverPresent: z.literal('nope') });

  await assert.rejects(
    () =>
      provider.complete({
        system: '"facts"',
        user: 'User: hello there',
        maxTokens: 50,
        schema: impossibleSchema,
        kind: 'memory',
      }),
    (err: unknown) => {
      assert.ok(err instanceof ProviderError);
      assert.equal((err as ProviderError).code, 'parse');
      return true;
    },
  );
});

Deno.test('MockProvider.complete: a ProviderError("parse") from a schema the mock output cannot satisfy carries non-zero usage (billable via usageOf)', async () => {
  const provider = new MockProvider();
  const impossibleSchema = z.object({ neverPresent: z.literal('nope') });

  let caught: unknown;
  try {
    await provider.complete({
      system: '"facts"',
      user: 'User: hello there, this is a real exchange with real content',
      maxTokens: 50,
      schema: impossibleSchema,
      kind: 'memory',
    });
    assert.fail('expected provider.complete to throw');
  } catch (err) {
    caught = err;
  }

  assert.ok(caught instanceof ProviderError);
  const usage = usageOf(caught);
  assert.ok(usage, 'expected the thrown ProviderError to carry usage');
  assert.equal(usage!.model, 'mock');
  assert.ok(usage!.inputTokens > 0, `expected non-zero inputTokens, got ${usage!.inputTokens}`);
  assert.ok(usage!.outputTokens > 0, `expected non-zero outputTokens, got ${usage!.outputTokens}`);
});

Deno.test('usageOf returns null for a non-ProviderError and for a ProviderError with no usage', () => {
  assert.equal(usageOf(new Error('some other failure')), null);
  assert.equal(usageOf(new ProviderError('parse', 'no usage attached')), null);
  assert.equal(usageOf('not even an Error'), null);
});

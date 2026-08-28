import { strict as assert } from 'node:assert';
import { MemoryExtractionSchema, buildMemoryExtractionInput, buildTitlePrompt } from '@gan-eden/prompts';
import { MockProvider, estimateUsd, getProvider } from './ai.ts';

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

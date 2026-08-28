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

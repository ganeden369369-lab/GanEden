import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamResult {
  text: string;
  stopReason: 'end_turn' | 'refusal' | 'max_tokens' | 'error';
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/** Discriminates how `MockProvider.complete` should synthesize a deterministic reply — ignored by `AnthropicProvider`, which only branches on `schema`. */
export type CompleteKind = 'memory' | 'title' | 'quotes' | 'compat';

export interface CompleteArgs<T> {
  system: string;
  user: string;
  maxTokens: number;
  /** Anthropic `output_config.effort` — ignored by `MockProvider`. */
  effort?: 'low' | 'medium' | 'high';
  /** When given, the reply is parsed/validated as structured output and returned as `data`. */
  schema?: z.ZodType<T>;
  kind?: CompleteKind;
  signal?: AbortSignal;
}

export interface CompleteResult<T> {
  text: string;
  data?: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/** Thrown by `complete()` when a `schema` was given but the reply couldn't be parsed/validated against it. */
export class ProviderError extends Error {
  constructor(
    public readonly code: 'parse',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ProviderError';
  }
}

export interface AiProvider {
  name: 'mock' | 'anthropic';
  streamChat(args: {
    system: { stablePrefix: string; userBlock: string };
    messages: ChatTurn[];
    maxTokens: number;
    onDelta: (t: string) => void;
    signal?: AbortSignal;
  }): Promise<StreamResult>;
  complete<T = unknown>(args: CompleteArgs<T>): Promise<CompleteResult<T>>;
}

/** claude-* model id -> $/MTok (input, output). */
const PRICE_TABLE: Record<string, { in: number; out: number }> = {
  'claude-sonnet-5': { in: 2, out: 10 },
  'claude-opus-5': { in: 5, out: 25 },
  /** MockProvider's model id — local dev / tests never cost anything. */
  mock: { in: 0, out: 0 },
};

export function estimateUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICE_TABLE[model] ?? PRICE_TABLE['claude-sonnet-5']!;
  return (inputTokens / 1_000_000) * price.in + (outputTokens / 1_000_000) * price.out;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function truncate(text: string, max = 60): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max).trim()}…` : trimmed;
}

const HEBREW_CHARS = /[֐-׿]/;

function detectLanguage(userBlock: string): 'he' | 'en' {
  const explicit = userBlock.match(/^Language:\s*(he|en)\b/im);
  if (explicit?.[1]) {
    return explicit[1].toLowerCase() as 'he' | 'en';
  }
  return HEBREW_CHARS.test(userBlock) ? 'he' : 'en';
}

function extractFirstName(userBlock: string): string {
  const match = userBlock.match(/^(?:Name|שם):\s*(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function buildMockReply(lastUserMessage: string, name: string, lang: 'he' | 'en'): string {
  const quoted = truncate(lastUserMessage);
  const namePrefixHe = name ? `${name}, ` : '';
  const namePrefixEn = name ? `${name}, ` : '';

  if (lang === 'he') {
    return [
      `${namePrefixHe}אני שומעת אותך. מה שסיפרת לי — "${quoted}" — זה בהחלט משהו שכדאי לתת לו מקום, ולא להמעיט בערכו.`,
      'המספרים שלך מראים נטייה, לא גזירת גורל — יש לך בחירה בכל צעד, ואת לא לבד בתהליך הזה.',
      'מה הכי מרגיש דחוף לך עכשיו בעניין הזה?',
    ].join('\n\n');
  }

  return [
    `${namePrefixEn}I hear you. What you shared — "${quoted}" — is worth giving real space, not brushing aside.`,
    'Your numbers show a tendency, not a fixed fate — you have a choice at every step, and you are not alone in this.',
    'What feels most pressing to you about this right now?',
  ].join('\n\n');
}

/**
 * The *current* turn's `User: ...` line from a `buildMemoryExtractionInput`
 * prompt. Deliberately takes the LAST match, not the first: once a mock
 * summary has been stored and fed back in as `existingSummary`, the
 * "Existing summary: ..." section earlier in the prompt can itself contain
 * literal `User:`/`Eden:` text (see `buildMockSummary`'s doc comment) —
 * the real new exchange is always appended last by
 * `buildMemoryExtractionInput`.
 */
function extractUserLine(userText: string): string {
  const matches = [...userText.matchAll(/^User:\s*(.*)$/gm)];
  return matches.at(-1)?.[1]?.trim() ?? '';
}

type FactCategory = 'person' | 'situation' | 'preference';

function splitIntoFacts(userLine: string): Array<{ category: FactCategory; text: string }> {
  if (!userLine) {
    return [{ category: 'situation', text: 'No additional context shared in this exchange.' }];
  }

  const segments = userLine
    .split(/(?<=[.!?])\s+|,\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .slice(0, 2);

  if (segments.length === 0) {
    // Every segment (and thus the whole line) is shorter than the
    // schema's 3-character minimum for a fact's text — nothing to
    // extract. An empty facts array is schema-valid.
    return [];
  }

  const pool: FactCategory[] = ['situation', 'preference'];

  return segments.map((text, i) => ({
    category: pool[i % pool.length]!,
    text: text.slice(0, 300),
  }));
}

/**
 * A deterministic, self-contained mock "summary" for the current exchange
 * only — never the raw prompt text (which would embed `User:`/`Eden:`
 * scaffold lines that `extractUserLine` would later have to see past once
 * this summary is stored and re-fed as `existingSummary` on the next
 * turn — a real, previously-shipped bug: memory extraction silently froze
 * after the first turn because the stored "summary" polluted every
 * following extraction prompt with a stale `User:` line).
 */
function buildMockSummary(userLine: string): string {
  return userLine ? `Recent: ${truncate(userLine, 180)}` : 'No summary yet.';
}

function extractTitle(userText: string): string {
  const idx = userText.indexOf(': ');
  const message = idx >= 0 ? userText.slice(idx + 2) : userText;
  const words = message.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  return words.join(' ') || 'Chat';
}

/**
 * `kind: 'quotes'` prompts pass the requested batch as one `date |
 * personalDay | theme` line per day (see `packages/prompts/src/quotes.ts`,
 * Task 2). Blank/malformed lines are skipped rather than throwing — the
 * mock never fails a request, it just produces fewer rows.
 */
function parseQuotePlanLines(userText: string): Array<{ date: string; personalDay: string; theme: string }> {
  return userText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d{4}-\d{2}-\d{2}\s*\|/.test(line))
    .map((line) => {
      const [date, personalDay, theme] = line.split('|').map((part) => part.trim());
      return { date: date ?? '', personalDay: personalDay || '', theme: theme || 'growth' };
    });
}

/** Deterministic, ≤200-char, emoji-free quote text for one day of a mock batch. */
function buildMockQuoteText(date: string, personalDay: string, theme: string, name: string): string {
  const namePrefix = name ? `${name}, ` : '';
  const text = `${namePrefix}on ${date} your personal day ${personalDay} is calling you toward ${theme}. Trust the pace you are moving at.`;
  return text.length > 200 ? text.slice(0, 200).trim() : text;
}

/**
 * Deterministic, network-free provider used for local dev and all
 * automated tests (`AI_PROVIDER=mock`, the default).
 */
export class MockProvider implements AiProvider {
  readonly name = 'mock' as const;

  async streamChat(args: {
    system: { stablePrefix: string; userBlock: string };
    messages: ChatTurn[];
    maxTokens: number;
    onDelta: (t: string) => void;
    signal?: AbortSignal;
  }): Promise<StreamResult> {
    const lang = detectLanguage(args.system.userBlock);
    const name = extractFirstName(args.system.userBlock);
    const lastUserMessage =
      [...args.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const replyText = buildMockReply(lastUserMessage, name, lang);

    const tokens = replyText.split(/(\s+)/).filter((t) => t.length > 0);
    let text = '';
    for (const token of tokens) {
      if (args.signal?.aborted) break;
      args.onDelta(token);
      text += token;
      await delay(15);
    }

    const inputTokens =
      wordCount(args.system.stablePrefix) +
      wordCount(args.system.userBlock) +
      args.messages.reduce((sum, m) => sum + wordCount(m.content), 0);

    return {
      text,
      stopReason: 'end_turn',
      inputTokens,
      outputTokens: wordCount(text),
      model: 'mock',
    };
  }

  async complete<T = unknown>(args: CompleteArgs<T>): Promise<CompleteResult<T>> {
    // `kind` drives dispatch when given (memory.ts and chat-send's title
    // call always pass it); the "facts" sniff is kept as a fallback so any
    // caller that hasn't been updated yet still gets memory-shaped mock
    // output instead of silently falling through to the title branch.
    const kind: CompleteKind = args.kind ?? (args.system.includes('"facts"') ? 'memory' : 'title');

    let text: string;
    let data: T | undefined;

    switch (kind) {
      case 'memory': {
        text = JSON.stringify({
          facts: splitIntoFacts(extractUserLine(args.user)),
          summary: buildMockSummary(extractUserLine(args.user)),
        });
        break;
      }
      case 'quotes': {
        const name = extractFirstName(args.system) || extractFirstName(args.user);
        const plan = parseQuotePlanLines(args.user);
        const quotes = plan.map((day) => ({
          date: day.date,
          text: buildMockQuoteText(day.date, day.personalDay, day.theme, name),
          theme: day.theme,
        }));
        data = { quotes } as unknown as T;
        text = JSON.stringify(data);
        break;
      }
      case 'compat': {
        // Reserved for future schema-only callers with no dedicated mock
        // shape yet — an empty object is the most schema-agnostic stand-in.
        data = {} as T;
        text = '{}';
        break;
      }
      case 'title':
      default: {
        text = extractTitle(args.user);
        break;
      }
    }

    if (args.schema) {
      const toValidate = data ?? JSON.parse(text);
      const parsed = args.schema.safeParse(toValidate);
      if (!parsed.success) {
        throw new ProviderError(
          'parse',
          `MockProvider: kind '${kind}' output failed schema validation: ${parsed.error.message}`,
        );
      }
      data = parsed.data;
    }

    return Promise.resolve({
      text,
      data,
      inputTokens: wordCount(args.system) + wordCount(args.user),
      outputTokens: wordCount(text),
      model: 'mock',
    });
  }
}

function mapStopReason(reason: Anthropic.Message['stop_reason']): StreamResult['stopReason'] {
  switch (reason) {
    case 'refusal':
      return 'refusal';
    case 'max_tokens':
      return 'max_tokens';
    default:
      return 'end_turn';
  }
}

/**
 * Real provider — reviewed but not executed in this environment (no API
 * key available locally). Follows the Global Constraints call shape from
 * docs/superpowers/plans/2026-08-28-phase-2-chat.md exactly.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;
  private readonly client: Anthropic;
  private readonly chatModel: string;
  private readonly genModel: string;

  constructor(env: Record<string, string | undefined>) {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY ?? '' });
    this.chatModel = env.CHAT_MODEL ?? 'claude-sonnet-5';
    this.genModel = env.GEN_MODEL ?? 'claude-sonnet-5';
  }

  async streamChat(args: {
    system: { stablePrefix: string; userBlock: string };
    messages: ChatTurn[];
    maxTokens: number;
    onDelta: (t: string) => void;
    signal?: AbortSignal;
  }): Promise<StreamResult> {
    try {
      const stream = this.client.messages.stream(
        {
          model: this.chatModel,
          max_tokens: args.maxTokens,
          system: [
            {
              type: 'text',
              text: args.system.stablePrefix,
              cache_control: { type: 'ephemeral' },
            },
            { type: 'text', text: args.system.userBlock },
          ],
          messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
          thinking: { type: 'adaptive' },
          output_config: { effort: 'low' },
        },
        { signal: args.signal },
      );

      let text = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text;
          args.onDelta(event.delta.text);
        }
      }

      const final = await stream.finalMessage();

      return {
        text,
        stopReason: mapStopReason(final.stop_reason),
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        model: final.model,
      };
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        // The caller only sees `stopReason: 'error'` — log the status and
        // message here or the actual cause is lost.
        console.error('anthropic', err.status, err.message);
        return {
          text: '',
          stopReason: 'error',
          inputTokens: 0,
          outputTokens: 0,
          model: this.chatModel,
        };
      }
      throw err;
    }
  }

  async complete<T = unknown>(args: CompleteArgs<T>): Promise<CompleteResult<T>> {
    try {
      if (args.schema) {
        // KNOWN CONCERN (see Task 1 report): `zodOutputFormat` is typed
        // against `zod/v4`'s `ZodType`, not the classic `zod` (v3) package
        // this repo's schemas are built with (`packages/prompts` needs to
        // stay on zod 3 — see Global Constraints). The two are structurally
        // incompatible: `zodOutputFormat` internally calls zod/v4's
        // `toJSONSchema` on the object passed in, which reads v4-only
        // internals a v3 `ZodType` doesn't have, so this throws at runtime
        // for every real schema today, not just a type-checker complaint.
        // Cast through `unknown` to keep the call shape exactly as spec'd
        // (`client.messages.parse({ ..., output_config: { effort, format:
        // zodOutputFormat(schema) } })`) — this throws at runtime (caught
        // below, like any other provider-call failure) rather than being
        // silently swallowed. Unexercised locally (no API key); needs a
        // zod-version resolution before Task 2 turns on real Anthropic
        // structured output for quotes.
        const response = await this.client.messages.parse(
          {
            model: this.genModel,
            max_tokens: args.maxTokens,
            system: args.system,
            messages: [{ role: 'user', content: args.user }],
            thinking: { type: 'adaptive' },
            output_config: {
              effort: args.effort,
              format: zodOutputFormat(args.schema as unknown as Parameters<typeof zodOutputFormat>[0]),
            },
          },
          { signal: args.signal },
        );

        if (response.parsed_output === null) {
          throw new ProviderError('parse', 'Anthropic returned no parsed_output for a structured complete() call');
        }

        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('');

        return {
          text,
          data: response.parsed_output as T,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          model: response.model,
        };
      }

      const response = await this.client.messages.create(
        {
          model: this.genModel,
          max_tokens: args.maxTokens,
          system: args.system,
          messages: [{ role: 'user', content: args.user }],
        },
        { signal: args.signal },
      );

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return {
        text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: response.model,
      };
    } catch (err) {
      // `complete()` has no error-shaped return value — callers handle the
      // throw — but the cause still needs to reach the logs.
      if (err instanceof Anthropic.APIError) {
        console.error('anthropic', err.status, err.message);
      }
      throw err;
    }
  }
}

export function getProvider(env: Record<string, string | undefined>): AiProvider {
  if (env.AI_PROVIDER === 'anthropic') {
    return new AnthropicProvider(env);
  }
  return new MockProvider();
}

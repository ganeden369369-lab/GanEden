import Anthropic from '@anthropic-ai/sdk';

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

export interface AiProvider {
  name: 'mock' | 'anthropic';
  streamChat(args: {
    system: { stablePrefix: string; userBlock: string };
    messages: ChatTurn[];
    maxTokens: number;
    onDelta: (t: string) => void;
    signal?: AbortSignal;
  }): Promise<StreamResult>;
  complete(args: { system: string; user: string; maxTokens: number }): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
  }>;
}

/** claude-* model id -> $/MTok (input, output). */
const PRICE_TABLE: Record<string, { in: number; out: number }> = {
  'claude-sonnet-5': { in: 2, out: 10 },
  'claude-opus-5': { in: 5, out: 25 },
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

function extractUserLine(userText: string): string {
  const match = userText.match(/^User:\s*(.*)$/m);
  return match?.[1]?.trim() ?? '';
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

  const pool: FactCategory[] = ['situation', 'preference'];
  const source = segments.length > 0 ? segments : [userLine];

  return source.map((text, i) => ({
    category: pool[i % pool.length]!,
    text: text.slice(0, 300),
  }));
}

function extractTitle(userText: string): string {
  const idx = userText.indexOf(': ');
  const message = idx >= 0 ? userText.slice(idx + 2) : userText;
  const words = message.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  return words.join(' ') || 'Chat';
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

  async complete(args: { system: string; user: string; maxTokens: number }): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
  }> {
    const isMemoryPrompt = args.system.includes('"facts"');

    const text = isMemoryPrompt
      ? JSON.stringify({
          facts: splitIntoFacts(extractUserLine(args.user)),
          summary: args.user.slice(0, 200),
        })
      : extractTitle(args.user);

    return Promise.resolve({
      text,
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

  async complete(args: { system: string; user: string; maxTokens: number }): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
  }> {
    const response = await this.client.messages.create({
      model: this.genModel,
      max_tokens: args.maxTokens,
      system: args.system,
      messages: [{ role: 'user', content: args.user }],
    });

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
  }
}

export function getProvider(env: Record<string, string | undefined>): AiProvider {
  if (env.AI_PROVIDER === 'anthropic') {
    return new AnthropicProvider(env);
  }
  return new MockProvider();
}

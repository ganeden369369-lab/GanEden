import { describe, expect, it } from 'vitest';
import type { NumerologyProfile } from '@gan-eden/shared';
import { GOALS } from '@gan-eden/shared';
import { QuoteBatchSchema, buildQuotesPrompt, type QuotePlanDay } from './quotes.ts';

/** Mirrors `MockProvider`'s `parseQuotePlanLines` in `supabase/functions/_shared/ai.ts` — used to
 * confirm `buildQuotesPrompt`'s user text is actually parseable the way the mock parses it. */
function parseQuotePlanLines(
  userText: string,
): Array<{ date: string; personalDay: string; theme: string }> {
  return userText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d{4}-\d{2}-\d{2}\s*\|/.test(line))
    .map((line) => {
      const [date, personalDay, theme] = line.split('|').map((part) => part.trim());
      return { date: date ?? '', personalDay: personalDay || '', theme: theme || 'growth' };
    });
}

function makePlan(overrides: Partial<QuotePlanDay>[] = []): QuotePlanDay[] {
  const base: QuotePlanDay[] = [
    { date: '2026-08-28', personalDay: 5, personalMonth: 4, theme: 'find_partner' },
    { date: '2026-08-29', personalDay: 6, personalMonth: 4, theme: 'improve_relationship' },
    { date: '2026-08-30', personalDay: 7, personalMonth: 4, theme: 'grow_as_woman' },
    { date: '2026-09-01', personalDay: 9, personalMonth: 5, theme: 'heal_past' },
  ];
  return overrides.length > 0 ? (overrides as QuotePlanDay[]) : base;
}

const numbers: NumerologyProfile = {
  lifePath: 7,
  expression: 3,
  soulUrge: 9,
  personality: 1,
  birthday: 22,
  methodId: 'pythagorean-reduced-gematria',
  engineVersion: '0.1.0',
};

const meanings = {
  'life_path:7': { title: 'The Seeker', body: 'Introspective and analytical.' },
};

describe('QuoteBatchSchema', () => {
  it('accepts a valid batch', () => {
    const result = QuoteBatchSchema.safeParse({
      quotes: [
        {
          date: '2026-08-28',
          text: 'You are exactly where you need to be today.',
          theme: 'confidence',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects text shorter than 20 characters', () => {
    const result = QuoteBatchSchema.safeParse({
      quotes: [{ date: '2026-08-28', text: 'Too short.', theme: 'confidence' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects text longer than 200 characters', () => {
    const result = QuoteBatchSchema.safeParse({
      quotes: [{ date: '2026-08-28', text: 'x'.repeat(201), theme: 'confidence' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a theme outside GOALS', () => {
    const result = QuoteBatchSchema.safeParse({
      quotes: [
        {
          date: '2026-08-28',
          text: 'You are exactly where you need to be today.',
          theme: 'growth',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts every GOALS value as a theme', () => {
    for (const theme of GOALS) {
      const result = QuoteBatchSchema.safeParse({
        quotes: [
          { date: '2026-08-28', text: 'You are exactly where you need to be today.', theme },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects a malformed date', () => {
    const result = QuoteBatchSchema.safeParse({
      quotes: [
        {
          date: '28-08-2026',
          text: 'You are exactly where you need to be today.',
          theme: 'confidence',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty quotes array', () => {
    const result = QuoteBatchSchema.safeParse({ quotes: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 31 quotes', () => {
    const quotes = Array.from({ length: 32 }, (_, i) => ({
      date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
      text: 'You are exactly where you need to be today.',
      theme: 'confidence' as const,
    }));
    const result = QuoteBatchSchema.safeParse({ quotes });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 31 quotes', () => {
    const quotes = Array.from({ length: 31 }, (_, i) => ({
      date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
      text: 'You are exactly where you need to be today.',
      theme: 'confidence' as const,
    }));
    const result = QuoteBatchSchema.safeParse({ quotes });
    expect(result.success).toBe(true);
  });
});

describe('buildQuotesPrompt', () => {
  it('reuses buildSystemPrompt persona content in the system prompt', () => {
    const { system } = buildQuotesPrompt({
      language: 'en',
      firstName: 'Maya',
      numbers,
      meanings,
      goals: ['find_partner'],
      relationshipStatus: 'single',
      plan: makePlan(),
    });
    expect(system).toContain('You are Eden');
    expect(system).toContain('Safety rules');
  });

  it('states the quote rules: length, no emoji, second person, one thought, vary openings', () => {
    const { system } = buildQuotesPrompt({
      language: 'en',
      firstName: 'Maya',
      numbers,
      meanings,
      goals: ['find_partner'],
      relationshipStatus: 'single',
      plan: makePlan(),
    });
    expect(system).toMatch(/200 characters/);
    expect(system).toMatch(/emoji/i);
    expect(system).toMatch(/second person/i);
    expect(system).toMatch(/one (complete )?thought/i);
    expect(system).toMatch(/vary/i);
  });

  it('includes the first name so a mock/real provider can address her by name', () => {
    const { system, user } = buildQuotesPrompt({
      language: 'en',
      firstName: 'Maya',
      numbers,
      meanings,
      goals: ['find_partner'],
      relationshipStatus: 'single',
      plan: makePlan(),
    });
    expect(`${system}\n${user}`).toMatch(/^Name:\s*Maya$/m);
  });

  it('produces Hebrew system content for language "he"', () => {
    const { system } = buildQuotesPrompt({
      language: 'he',
      firstName: 'מאיה',
      numbers,
      meanings,
      goals: ['find_partner'],
      relationshipStatus: 'single',
      plan: makePlan(),
    });
    expect(system).toContain('את עדן');
    expect(`${system}`).toMatch(/^שם:\s*מאיה$/m);
  });

  it('overrides the reused chat-formatting rules (reply length, question-back) for both languages', () => {
    const { system: en } = buildQuotesPrompt({
      language: 'en',
      firstName: 'Maya',
      numbers,
      meanings,
      goals: ['find_partner'],
      relationshipStatus: 'single',
      plan: makePlan(),
    });
    expect(en).toContain(
      'This is not a conversation. Ignore the reply-length and question-back guidance above. Each quote is a single complete thought, never a question, never addressed as a reply.',
    );

    const { system: he } = buildQuotesPrompt({
      language: 'he',
      firstName: 'מאיה',
      numbers,
      meanings,
      goals: ['find_partner'],
      relationshipStatus: 'single',
      plan: makePlan(),
    });
    expect(he).toContain(
      'זו לא שיחה. התעלמי מההנחיות לגבי אורך התשובה ושאלה בחזרה שמופיעות למעלה. כל ציטוט הוא מחשבה שלמה אחת, לעולם לא שאלה, ולעולם לא מנוסח כתגובה.',
    );
  });

  it('emits exactly `date | personalDay | theme` lines the mock provider can parse, one per plan day', () => {
    const plan = makePlan();
    const { user } = buildQuotesPrompt({
      language: 'en',
      firstName: 'Maya',
      numbers,
      meanings,
      goals: ['find_partner'],
      relationshipStatus: 'single',
      plan,
    });

    const parsed = parseQuotePlanLines(user);
    expect(parsed).toHaveLength(plan.length);
    for (let i = 0; i < plan.length; i++) {
      expect(parsed[i]!.date).toBe(plan[i]!.date);
      expect(parsed[i]!.personalDay).toBe(String(plan[i]!.personalDay));
      expect(parsed[i]!.theme).toBe(plan[i]!.theme);
    }
  });

  it('groups plan lines under a personal-month heading, without breaking the parseable date lines', () => {
    const plan = makePlan();
    const { user } = buildQuotesPrompt({
      language: 'en',
      firstName: 'Maya',
      numbers,
      meanings,
      goals: ['find_partner'],
      relationshipStatus: 'single',
      plan,
    });
    expect(user).toContain('4:');
    expect(user).toContain('5:');
    // Still exactly one parseable line per plan day despite the headings.
    expect(parseQuotePlanLines(user)).toHaveLength(plan.length);
  });
});

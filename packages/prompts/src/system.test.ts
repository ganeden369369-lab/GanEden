import { describe, expect, it } from 'vitest';
import type { NumerologyProfile } from '@gan-eden/shared';
import { buildSystemPrompt, type PromptContext } from './system.ts';

function makeCtx(overrides: Partial<PromptContext> = {}): PromptContext {
  const numbers: NumerologyProfile = {
    lifePath: 7,
    expression: 3,
    soulUrge: 9,
    personality: 1,
    birthday: 22,
    methodId: 'pythagorean-reduced-gematria',
    engineVersion: '0.1.0',
  };
  return {
    language: 'en',
    firstName: 'Noa',
    numbers,
    meanings: {
      'life_path:7': { title: 'The Seeker', body: 'Introspective and analytical.' },
      'expression:3': { title: 'The Communicator', body: 'Creative and expressive.' },
    },
    cycles: { personalYear: 4, personalMonth: 2, personalDay: 9 },
    relationshipStatus: 'single',
    goals: ['find_partner'],
    memorySummary: '',
    todayIso: '2026-08-28',
    ...overrides,
  };
}

describe('buildSystemPrompt', () => {
  it('produces a byte-identical stablePrefix for two contexts differing only in user data', () => {
    const a = buildSystemPrompt(
      makeCtx({ firstName: 'Noa', relationshipStatus: 'single', goals: ['find_partner'] }),
    );
    const b = buildSystemPrompt(
      makeCtx({
        firstName: 'Maya',
        relationshipStatus: 'married',
        goals: ['heal_past', 'confidence'],
        numbers: {
          lifePath: 1,
          expression: 8,
          soulUrge: 5,
          personality: 6,
          birthday: 3,
          methodId: 'pythagorean-reduced-gematria',
          engineVersion: '0.1.0',
        },
        cycles: { personalYear: 9, personalMonth: 1, personalDay: 1 },
        memorySummary: 'Some memory',
        todayIso: '2026-01-01',
      }),
    );
    expect(a.stablePrefix).toBe(b.stablePrefix);
  });

  it('produces a different stablePrefix between languages', () => {
    const en = buildSystemPrompt(makeCtx({ language: 'en' }));
    const he = buildSystemPrompt(makeCtx({ language: 'he' }));
    expect(en.stablePrefix).not.toBe(he.stablePrefix);
  });

  it('includes all meanings for the language sorted by key in the stablePrefix', () => {
    const { stablePrefix } = buildSystemPrompt(makeCtx());
    const indexLifePath = stablePrefix.indexOf('life_path 7: The Seeker');
    const indexExpression = stablePrefix.indexOf('expression 3: The Communicator');
    expect(indexLifePath).toBeGreaterThan(-1);
    expect(indexExpression).toBeGreaterThan(-1);
    // sorted by key => 'expression:3' before 'life_path:7'
    expect(indexExpression).toBeLessThan(indexLifePath);
  });

  it('userBlock contains the name and all five numbers', () => {
    const { userBlock } = buildSystemPrompt(makeCtx({ firstName: 'Noa' }));
    expect(userBlock).toContain('Noa');
    expect(userBlock).toContain('7');
    expect(userBlock).toContain('3');
    expect(userBlock).toContain('9');
    expect(userBlock).toContain('1');
    expect(userBlock).toContain('22');
  });

  it('userBlock shows "No memory yet" when memorySummary is empty', () => {
    const { userBlock } = buildSystemPrompt(makeCtx({ memorySummary: '' }));
    expect(userBlock.toLowerCase()).toContain('no memory yet');
  });

  it('userBlock includes the provided memory summary when present', () => {
    const { userBlock } = buildSystemPrompt(makeCtx({ memorySummary: 'Likes long walks.' }));
    expect(userBlock).toContain('Likes long walks.');
  });
});

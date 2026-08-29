import { describe, expect, it } from 'vitest';
import { starterPrompts } from './starters.ts';

describe('starterPrompts', () => {
  for (const language of ['en', 'he'] as const) {
    it(`returns 3-4 unique strings for ${language}`, () => {
      const result = starterPrompts(language, ['find_partner'], false);
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.length).toBeLessThanOrEqual(4);
      expect(new Set(result).size).toBe(result.length);
    });
  }

  it('puts the continue-from-last-time prompt first when hasMemory is true', () => {
    const withMemory = starterPrompts('en', ['confidence'], true);
    const withoutMemory = starterPrompts('en', ['confidence'], false);
    expect(withMemory[0]).not.toBe(withoutMemory[0]);
    expect(withMemory[0]?.toLowerCase()).toMatch(/last time|continue/);
  });

  it('puts the Hebrew continue prompt first when hasMemory is true', () => {
    const result = starterPrompts('he', ['grow_as_woman'], true);
    expect(result[0]).toMatch(/פעם הקודמת|נמשיך/);
  });

  it('matches goal-specific prompts first for a known goal', () => {
    const result = starterPrompts('en', ['heal_past'], false);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});

import { describe, expect, it } from 'vitest';
import { compatibility } from './compatibility.ts';
import { computeProfile } from './profile.ts';

const her = computeProfile({ fullName: 'Dana', script: 'latin', dob: '1992-03-21' });
const him = computeProfile({ fullName: 'Tom', script: 'latin', dob: '1990-07-15' });

describe('compatibility', () => {
  it('is symmetric', () => {
    expect(compatibility(her, him).score).toBe(compatibility(him, her).score);
  });
  it('returns a 0-100 score and a harmony band', () => {
    const r = compatibility(her, him);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(['high', 'medium', 'low']).toContain(r.harmony);
    expect(r.lifePathPair).toEqual([her.lifePath, him.lifePath]);
  });
  it('same life path scores high', () => {
    expect(compatibility(him, him).harmony).toBe('high');
  });
  it('handles zero-valued numbers (neutral affinity)', () => {
    const bryn = computeProfile({ fullName: 'Bryn', script: 'latin', dob: '1990-07-15' });
    const result = compatibility(bryn, him);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['high', 'medium', 'low']).toContain(result.harmony);
  });

  it('assigns harmony bands correctly with explicit scores', () => {
    // Low harmony: affinities 1/1/1 → score 33 → 'low'
    const lowA: typeof her = {
      lifePath: 1,
      expression: 2,
      soulUrge: 2,
      personality: 1,
      birthday: 1,
      methodId: 'default',
      engineVersion: 'default-0.1.0',
    };
    const lowB: typeof her = {
      lifePath: 2,
      expression: 1,
      soulUrge: 1,
      personality: 2,
      birthday: 2,
      methodId: 'default',
      engineVersion: 'default-0.1.0',
    };
    const lowResult = compatibility(lowA, lowB);
    expect(lowResult.score).toBe(33);
    expect(lowResult.harmony).toBe('low');

    // Medium harmony: affinities 2/2/2 → score 67 → 'medium'
    const medA: typeof her = {
      lifePath: 1,
      expression: 1,
      soulUrge: 1,
      personality: 1,
      birthday: 1,
      methodId: 'default',
      engineVersion: 'default-0.1.0',
    };
    const medB: typeof her = {
      lifePath: 7,
      expression: 7,
      soulUrge: 7,
      personality: 7,
      birthday: 7,
      methodId: 'default',
      engineVersion: 'default-0.1.0',
    };
    const medResult = compatibility(medA, medB);
    expect(medResult.score).toBe(67);
    expect(medResult.harmony).toBe('medium');

    // High harmony: same profile vs itself → affinities 3/3/3 → score 100 → 'high'
    const highResult = compatibility(him, him);
    expect(highResult.score).toBe(100);
    expect(highResult.harmony).toBe('high');
  });
});

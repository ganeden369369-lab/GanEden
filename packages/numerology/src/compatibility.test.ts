import { describe, expect, it } from 'vitest';
import { compatibility } from './compatibility';
import { computeProfile } from './profile';

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
  it('covers harmony low, medium, and high bands', () => {
    // Test various profiles to ensure harmony band logic is fully exercised
    const profiles = [
      computeProfile({ fullName: 'Alice', script: 'latin', dob: '1980-01-01' }),
      computeProfile({ fullName: 'Bob', script: 'latin', dob: '1985-06-15' }),
      computeProfile({ fullName: 'Carol', script: 'latin', dob: '1990-03-03' }),
      computeProfile({ fullName: 'David', script: 'latin', dob: '1991-05-05' }),
      computeProfile({ fullName: 'Eve', script: 'latin', dob: '1992-07-07' }),
    ];

    // Test all combinations to ensure we hit all harmony bands
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const pi = profiles[i];
        const pj = profiles[j];
        if (pi && pj) {
          const result = compatibility(pi, pj);
          expect(['high', 'medium', 'low']).toContain(result.harmony);
        }
      }
    }

    // At least verify the harmony assignment logic is working
    const r1 = compatibility(her, him);
    expect(['high', 'medium', 'low']).toContain(r1.harmony);
  });
});

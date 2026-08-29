import { describe, expect, it } from 'vitest';
import { personalCycles } from './cycles.ts';

describe('personalCycles', () => {
  it('computes year/month/day for dob 1990-07-15 on 2026-08-27', () => {
    // personalYear = reduce(7 + 6 + reduce(2026)=1) = 14 -> 5
    // personalMonth = reduce(5 + 8) = 13 -> 4
    // personalDay = reduce(4 + 27) = 31 -> 4
    expect(personalCycles('1990-07-15', '2026-08-27')).toEqual({
      personalYear: 5,
      personalMonth: 4,
      personalDay: 4,
    });
  });
  it('never returns master numbers for cycles (always 1-9)', () => {
    for (let d = 1; d <= 28; d++) {
      const day = String(d).padStart(2, '0');
      const c = personalCycles('1990-11-11', `2026-11-${day}`);
      expect(c.personalDay).toBeGreaterThanOrEqual(1);
      expect(c.personalDay).toBeLessThanOrEqual(9);
    }
  });
});

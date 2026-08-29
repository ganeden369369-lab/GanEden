import { describe, expect, it } from 'vitest';
import { computeProfile } from './profile.ts';

describe('computeProfile (default method)', () => {
  it('computes John, 1990-07-15', () => {
    const p = computeProfile({ fullName: 'John', script: 'latin', dob: '1990-07-15' });
    expect(p.lifePath).toBe(5); // 7 + (1+5=6) + (1990->1) = 14 -> 5
    expect(p.birthday).toBe(6);
    expect(p.expression).toBe(2); // 20 -> 2
    expect(p.soulUrge).toBe(6);
    expect(p.personality).toBe(5); // 14 -> 5
    expect(p.methodId).toBe('default');
    expect(p.engineVersion).toBe('default-0.1.0');
  });
  it('keeps master numbers during life path summation', () => {
    // 11 (master, kept) + 11 (master) + 1975 -> 22 (master) => 44 -> 8
    expect(computeProfile({ fullName: 'A', script: 'latin', dob: '1975-11-11' }).lifePath).toBe(8);
    // 1990-11-02: 11 + 2 + 1 = 14 -> 5 ; 2000-11-09: 11 + 9 + 2 = 22 (master)
    expect(computeProfile({ fullName: 'A', script: 'latin', dob: '2000-11-09' }).lifePath).toBe(22);
  });
  it('throws on an invalid date', () => {
    expect(() => computeProfile({ fullName: 'A', script: 'latin', dob: '1990-13-01' })).toThrow();
  });
  it('throws on invalid date format', () => {
    expect(() => computeProfile({ fullName: 'A', script: 'latin', dob: '1990/13/01' })).toThrow();
  });
  it('throws on invalid day of month', () => {
    expect(() => computeProfile({ fullName: 'A', script: 'latin', dob: '1990-02-30' })).toThrow();
  });
});

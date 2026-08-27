import { describe, expect, it } from 'vitest';
import { digitSum, reduce } from './reduce';

describe('digitSum', () => {
  it('sums digits', () => {
    expect(digitSum(1990)).toBe(19);
    expect(digitSum(7)).toBe(7);
    expect(digitSum(0)).toBe(0);
  });
});

describe('reduce', () => {
  it('reduces to a single digit', () => {
    expect(reduce(1990)).toBe(1); // 19 -> 10 -> 1
    expect(reduce(15)).toBe(6);
  });
  it('keeps master numbers', () => {
    expect(reduce(11)).toBe(11);
    expect(reduce(29)).toBe(11); // 2+9
    expect(reduce(22)).toBe(22);
    expect(reduce(33)).toBe(33);
  });
  it('respects a custom master list', () => {
    expect(reduce(11, [])).toBe(2);
  });
  it('throws on negative input', () => {
    expect(() => reduce(-1)).toThrow();
  });
  it('throws on non-integer input', () => {
    expect(() => reduce(1.5)).toThrow(RangeError);
    expect(() => reduce(Number.NaN)).toThrow(RangeError);
  });
});

import { describe, expect, it } from 'vitest';
import { nameSums, normalizeName } from './name.ts';

describe('normalizeName', () => {
  it('lowercases and strips non-letters (latin)', () => {
    expect(normalizeName('John-Paul  Smith!', 'latin')).toBe('johnpaulsmith');
  });
  it('maps Hebrew final forms and strips niqqud/spaces', () => {
    expect(normalizeName('עדן הרוש', 'he')).toBe('עדנהרוש');
    expect(normalizeName('שָׁלוֹם', 'he')).toBe('שלומ');
    expect(normalizeName('ץףךםן', 'he')).toBe('צפכמנ');
  });
});

describe('nameSums (default method)', () => {
  it('sums a latin name: JOHN = 1+6+8+5', () => {
    expect(nameSums('John', 'latin')).toEqual({ all: 20, vowels: 6, consonants: 14 });
  });
  it('sums a hebrew name: עדן = 7+4+5 (reduced gematria)', () => {
    // ע=70->7, ד=4, ן->נ=50->5 ; vowel letters (אהוי) none here
    expect(nameSums('עדן', 'he')).toEqual({ all: 16, vowels: 0, consonants: 16 });
  });
  it('treats א ה ו י as vowel letters in hebrew', () => {
    // הרוש: ה=5(v) ר=200->2 ו=6(v) ש=300->3
    expect(nameSums('הרוש', 'he')).toEqual({ all: 16, vowels: 11, consonants: 5 });
  });
  it('ignores characters not in the table', () => {
    expect(nameSums('J0hn', 'latin')).toEqual({ all: 14, vowels: 0, consonants: 14 });
  });
});

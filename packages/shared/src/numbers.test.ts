import { describe, expect, it } from 'vitest';
import { NUMBER_I18N, NUMBER_KEYS, NumerologyProfileSchema, parseNumbers } from './numbers';

const valid = {
  lifePath: 7,
  expression: 11,
  soulUrge: 3,
  personality: 9,
  birthday: 5,
  methodId: 'pythagorean',
  engineVersion: '1.0.0',
};

describe('parseNumbers', () => {
  it('parses a valid numerology profile', () => {
    expect(parseNumbers(valid)).toEqual(valid);
  });

  it('rejects a profile missing a key', () => {
    const missing: Record<string, unknown> = { ...valid };
    delete missing.birthday;
    expect(() => parseNumbers(missing)).toThrow();
  });

  it('rejects a negative number', () => {
    expect(() => parseNumbers({ ...valid, lifePath: -1 })).toThrow();
  });
});

describe('NumerologyProfileSchema', () => {
  it('is the schema parseNumbers uses', () => {
    expect(NumerologyProfileSchema.parse(valid)).toEqual(valid);
  });
});

describe('NUMBER_KEYS / NUMBER_I18N', () => {
  it('has an i18n key for every number key', () => {
    for (const key of NUMBER_KEYS) {
      expect(NUMBER_I18N[key]).toBeTruthy();
    }
  });
});

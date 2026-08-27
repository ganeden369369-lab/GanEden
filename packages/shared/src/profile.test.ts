import { describe, expect, it } from 'vitest';
import { ProfileInputSchema } from './profile';

const valid = {
  fullName: 'עדן הרוש',
  script: 'he',
  dob: '1995-04-10',
  language: 'he',
  relationshipStatus: 'single',
  goals: ['find_partner', 'grow_as_woman'],
};

describe('ProfileInputSchema', () => {
  it('accepts a valid profile', () => {
    expect(ProfileInputSchema.parse(valid)).toEqual(valid);
  });
  it('requires at least one goal', () => {
    expect(() => ProfileInputSchema.parse({ ...valid, goals: [] })).toThrow();
  });
  it('rejects a malformed date', () => {
    expect(() => ProfileInputSchema.parse({ ...valid, dob: '10/04/1995' })).toThrow();
  });
  it('trims and rejects an empty name', () => {
    expect(() => ProfileInputSchema.parse({ ...valid, fullName: '   ' })).toThrow();
  });
});

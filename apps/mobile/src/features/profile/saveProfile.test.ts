import { buildProfileRow } from './saveProfile';

describe('buildProfileRow', () => {
  it('maps input to a profiles row with computed numbers', () => {
    const row = buildProfileRow(
      {
        fullName: 'John',
        script: 'latin',
        dob: '1990-07-15',
        language: 'en',
        relationshipStatus: 'single',
        goals: ['find_partner'],
      },
      'user-1',
    );
    expect(row.user_id).toBe('user-1');
    expect(row.full_name).toBe('John');
    expect(row.full_name_script).toBe('latin');
    expect(row.dob).toBe('1990-07-15');
    expect(row.goals).toEqual(['find_partner']);
    expect(row.engine_version).toBe('default-0.1.0');
    expect(row.numbers).toMatchObject({ lifePath: 5, expression: 2, soulUrge: 6, personality: 5, birthday: 6 });
  });
});

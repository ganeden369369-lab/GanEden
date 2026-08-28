import { strict as assert } from 'node:assert';
import type { Goal } from '@gan-eden/shared';
import { GOALS } from '@gan-eden/shared';
import { personalCycles } from '@gan-eden/numerology';
import { buildQuotePlan } from './quotes.ts';

const DOB = '1990-07-15';
const TODAY = '2026-08-27';
const ALL_GOALS = [...GOALS] as Goal[];

Deno.test('buildQuotePlan returns 30 rows for a 30-day default with no existing dates', () => {
  const plan = buildQuotePlan({ dob: DOB, goals: ALL_GOALS, existingDates: [], today: TODAY });
  assert.equal(plan.length, 30);
  assert.equal(plan[0]!.date, '2026-08-27');
  // 30 days from 2026-08-27 crosses into September.
  assert.equal(plan[plan.length - 1]!.date, '2026-09-25');
});

Deno.test('buildQuotePlan skips dates already present in existingDates', () => {
  const existing = new Set(['2026-08-27', '2026-08-28', '2026-09-01']);
  const plan = buildQuotePlan({
    dob: DOB,
    goals: ALL_GOALS,
    existingDates: existing,
    today: TODAY,
  });
  assert.equal(plan.length, 27);
  for (const day of plan) {
    assert.equal(existing.has(day.date), false, `expected ${day.date} to be excluded`);
  }
});

Deno.test('buildQuotePlan also accepts a plain array for existingDates', () => {
  const plan = buildQuotePlan({
    dob: DOB,
    goals: ALL_GOALS,
    existingDates: ['2026-08-27'],
    today: TODAY,
    days: 5,
  });
  assert.equal(plan.length, 4);
  assert.ok(!plan.some((d) => d.date === '2026-08-27'));
});

Deno.test('buildQuotePlan rotation covers every goal at least once over 30 days', () => {
  const plan = buildQuotePlan({ dob: DOB, goals: ALL_GOALS, existingDates: [], today: TODAY });
  const seenThemes = new Set(plan.map((d) => d.theme));
  for (const goal of ALL_GOALS) {
    assert.ok(seenThemes.has(goal), `expected theme ${goal} to appear in a 30-day plan`);
  }
});

Deno.test('buildQuotePlan rotates themes by day offset from today, cycling through the given goals in order', () => {
  const goals: Goal[] = ['find_partner', 'confidence'];
  const plan = buildQuotePlan({ dob: DOB, goals, existingDates: [], today: TODAY, days: 4 });
  assert.deepEqual(
    plan.map((d) => d.theme),
    ['find_partner', 'confidence', 'find_partner', 'confidence'],
  );
});

Deno.test("buildQuotePlan keeps a date's theme stable across calls regardless of which dates already exist", () => {
  const goals: Goal[] = ['find_partner', 'confidence', 'heal_past'];
  const fullPlan = buildQuotePlan({ dob: DOB, goals, existingDates: [], today: TODAY, days: 6 });
  const themeByDate = new Map(fullPlan.map((d) => [d.date, d.theme]));

  // Pretend the 2nd and 4th days already exist (e.g. from an earlier
  // batch) and ask for a top-up over the same window.
  const existing = [fullPlan[1]!.date, fullPlan[3]!.date];
  const topUp = buildQuotePlan({ dob: DOB, goals, existingDates: existing, today: TODAY, days: 6 });

  assert.equal(topUp.length, 4);
  for (const day of topUp) {
    assert.equal(day.theme, themeByDate.get(day.date));
  }
});

Deno.test('buildQuotePlan computes personalDay/personalMonth via personalCycles for each date', () => {
  const plan = buildQuotePlan({ dob: DOB, goals: ALL_GOALS, existingDates: [], today: TODAY, days: 10 });
  for (const day of plan) {
    const cycles = personalCycles(DOB, day.date);
    assert.equal(day.personalDay, cycles.personalDay);
    assert.equal(day.personalMonth, cycles.personalMonth);
  }
});

Deno.test('buildQuotePlan throws when goals is empty', () => {
  assert.throws(() => buildQuotePlan({ dob: DOB, goals: [], existingDates: [], today: TODAY }), RangeError);
});

Deno.test('buildQuotePlan throws on a malformed today', () => {
  assert.throws(() => buildQuotePlan({ dob: DOB, goals: ALL_GOALS, existingDates: [], today: '27-08-2026' }));
});

Deno.test('buildQuotePlan respects a custom days count', () => {
  const plan = buildQuotePlan({
    dob: DOB,
    goals: ALL_GOALS,
    existingDates: [],
    today: TODAY,
    days: 7,
  });
  assert.equal(plan.length, 7);
});

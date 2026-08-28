import type { Goal } from '@gan-eden/shared';
import { parseDate, personalCycles } from '@gan-eden/numerology';

/** One day of a quote generation plan — the input `buildQuotesPrompt` (`@gan-eden/prompts`) turns into a batch request. */
export interface QuotePlanDay {
  date: string;
  personalDay: number;
  personalMonth: number;
  theme: Goal;
}

/** `iso` plus `days` calendar days, in UTC so no local-timezone/DST drift affects the date math. */
function addDaysIso(iso: string, days: number): string {
  const { y, m, d } = parseDate(iso);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Builds the next `days` calendar days (default 30) starting at `today`,
 * skipping any date already present in `existingDates`, with each day's
 * personal day/month computed via `personalCycles` and its theme rotating
 * across `goals`.
 *
 * Theme rotation is keyed off the day's OFFSET from `today` (`i %
 * goals.length`), not off its position in the returned array — so a given
 * calendar date always gets the same theme no matter which other dates in
 * the window are already filled. That makes repeated top-up calls
 * (`< 7 future quotes remain`) idempotent: the theme for a date that
 * already exists never changes, and a date that gets filled in later still
 * lands on the theme it would have gotten in the original batch.
 */
export function buildQuotePlan(args: {
  dob: string;
  goals: Goal[];
  existingDates: Iterable<string>;
  today: string;
  days?: number;
}): QuotePlanDay[] {
  const { dob, goals, today, days = 30 } = args;
  if (goals.length === 0) {
    throw new RangeError('buildQuotePlan requires at least one goal');
  }
  // Validates `today`'s shape up front, the same way the rest of the
  // numerology layer does (parseDate throws RangeError on a bad format).
  parseDate(today);

  const existing =
    args.existingDates instanceof Set ? args.existingDates : new Set(args.existingDates);

  const plan: QuotePlanDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysIso(today, i);
    if (existing.has(date)) continue;
    const cycles = personalCycles(dob, date);
    const theme = goals[i % goals.length]!;
    plan.push({
      date,
      personalDay: cycles.personalDay,
      personalMonth: cycles.personalMonth,
      theme,
    });
  }
  return plan;
}

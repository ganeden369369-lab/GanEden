import { parseDate } from './profile.ts';
import { reduce } from './reduce.ts';

export interface PersonalCycles {
  personalYear: number;
  personalMonth: number;
  personalDay: number;
}

const NO_MASTERS: readonly number[] = [];

export function personalCycles(dob: string, on: string): PersonalCycles {
  const b = parseDate(dob);
  const t = parseDate(on);
  const personalYear = reduce(reduce(b.m, NO_MASTERS) + reduce(b.d, NO_MASTERS) + reduce(t.y, NO_MASTERS), NO_MASTERS);
  const personalMonth = reduce(personalYear + t.m, NO_MASTERS);
  const personalDay = reduce(personalMonth + t.d, NO_MASTERS);
  return { personalYear, personalMonth, personalDay };
}

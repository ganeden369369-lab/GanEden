import type { Method, Script } from './method.ts';
import { DEFAULT_METHOD } from './methods/default.ts';
import { nameSums } from './name.ts';
import { reduce } from './reduce.ts';
import { ENGINE_VERSION } from './version.ts';

export interface NumerologyProfile {
  lifePath: number;
  expression: number;
  soulUrge: number;
  personality: number;
  birthday: number;
  methodId: string;
  engineVersion: string;
}

export interface ProfileSource {
  fullName: string;
  script: Script;
  dob: string; // YYYY-MM-DD
}

export function parseDate(iso: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`expected YYYY-MM-DD, got ${iso}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`invalid date ${iso}`);
  }
  return { y, m: mo, d };
}

export function computeProfile(src: ProfileSource, method: Method = DEFAULT_METHOD): NumerologyProfile {
  const { y, m, d } = parseDate(src.dob);
  const masters = method.masters;
  const lifePath = reduce(reduce(m, masters) + reduce(d, masters) + reduce(y, masters), masters);
  const sums = nameSums(src.fullName, src.script, method);
  return {
    lifePath,
    expression: reduce(sums.all, masters),
    soulUrge: reduce(sums.vowels, masters),
    personality: reduce(sums.consonants, masters),
    birthday: reduce(d, masters),
    methodId: method.id,
    engineVersion: ENGINE_VERSION,
  };
}

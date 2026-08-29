import type { Method, Script } from './method.ts';
import { DEFAULT_METHOD } from './methods/default.ts';

const HEBREW_FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

export function normalizeName(name: string, script: Script): string {
  if (script === 'latin') {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }
  return name
    .replace(/[\u0591-\u05C7]/g, '') // niqqud + cantillation
    .replace(/[ךםןףץ]/g, (c) => HEBREW_FINALS[c] ?? c)
    .replace(/[^\u05D0-\u05EA]/g, '');
}

export interface NameSums {
  all: number;
  vowels: number;
  consonants: number;
}

export function nameSums(name: string, script: Script, method: Method = DEFAULT_METHOD): NameSums {
  const table = method.letters[script];
  const vowelSet = method.vowels[script];
  let all = 0;
  let vowels = 0;
  for (const ch of normalizeName(name, script)) {
    const v = table[ch];
    if (v === undefined) continue;
    all += v;
    if (vowelSet.has(ch)) vowels += v;
  }
  return { all, vowels, consonants: all - vowels };
}

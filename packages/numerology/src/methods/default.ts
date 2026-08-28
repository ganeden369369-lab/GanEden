import type { Method } from '../method.ts';

// Pythagorean: A=1 … I=9, J=1 … R=9, S=1 … Z=8
const LATIN: Record<string, number> = {};
for (let i = 0; i < 26; i++) LATIN[String.fromCharCode(97 + i)] = (i % 9) + 1;

// Reduced gematria: א=1 … ט=9, י=10→1 … צ=90→9, ק=100→1 … ת=400→4
const HEBREW: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 1, כ: 2, ל: 3, מ: 4, נ: 5, ס: 6, ע: 7, פ: 8, צ: 9,
  ק: 1, ר: 2, ש: 3, ת: 4,
};

/**
 * Default method (standard Pythagorean / reduced gematria).
 * REPLACE the tables and vowel sets with the Mentor's method once documented;
 * bump ENGINE_VERSION when you do.
 */
export const DEFAULT_METHOD: Method = {
  id: 'default',
  masters: [11, 22, 33],
  letters: { latin: LATIN, he: HEBREW },
  vowels: { latin: new Set(['a', 'e', 'i', 'o', 'u']), he: new Set(['א', 'ה', 'ו', 'י']) },
};

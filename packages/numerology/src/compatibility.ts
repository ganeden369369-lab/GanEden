import type { NumerologyProfile } from './profile';
import { reduce } from './reduce';

export interface Compatibility {
  score: number; // 0-100
  lifePathPair: [number, number];
  harmony: 'high' | 'medium' | 'low';
}

/**
 * Pair affinity table for single-digit life paths (1..9), symmetric.
 * Values are 0..3 (3 = natural harmony). Data — replace with the Mentor's rules.
 */
const AFFINITY: number[][] = [
  // 1  2  3  4  5  6  7  8  9
  [3, 1, 3, 1, 3, 1, 2, 2, 2], // 1
  [1, 3, 1, 3, 1, 3, 1, 3, 2], // 2
  [3, 1, 3, 1, 3, 2, 1, 1, 3], // 3
  [1, 3, 1, 3, 1, 2, 3, 3, 1], // 4
  [3, 1, 3, 1, 3, 1, 3, 1, 2], // 5
  [1, 3, 2, 2, 1, 3, 1, 2, 3], // 6
  [2, 1, 1, 3, 3, 1, 3, 1, 1], // 7
  [2, 3, 1, 3, 1, 2, 1, 3, 1], // 8
  [2, 2, 3, 1, 2, 3, 1, 1, 3], // 9
];

function single(n: number): number {
  return reduce(n, []);
}

export function compatibility(a: NumerologyProfile, b: NumerologyProfile): Compatibility {
  const la = single(a.lifePath);
  const lb = single(b.lifePath);
  const lifeAffinity = AFFINITY[la - 1]![lb - 1]!; // 0..3
  const soulAffinity = AFFINITY[single(a.soulUrge) - 1]![single(b.soulUrge) - 1]!;
  const exprAffinity = AFFINITY[single(a.expression) - 1]![single(b.expression) - 1]!;
  const raw = lifeAffinity * 0.5 + soulAffinity * 0.3 + exprAffinity * 0.2; // 0..3
  const score = Math.round((raw / 3) * 100);
  const harmony = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { score, lifePathPair: [a.lifePath, b.lifePath], harmony };
}

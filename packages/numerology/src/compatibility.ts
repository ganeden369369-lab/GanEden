import type { NumerologyProfile } from './profile.ts';
import { reduce } from './reduce.ts';

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

function affinity(a: number, b: number): number {
  const x = single(a);
  const y = single(b);
  if (x < 1 || x > 9 || y < 1 || y > 9) return 2; // no signal → neutral
  return AFFINITY[x - 1]![y - 1]!;
}

export function compatibility(a: NumerologyProfile, b: NumerologyProfile): Compatibility {
  const lifeAffinity = affinity(a.lifePath, b.lifePath); // 0..3
  const soulAffinity = affinity(a.soulUrge, b.soulUrge);
  const exprAffinity = affinity(a.expression, b.expression);
  const raw = lifeAffinity * 0.5 + soulAffinity * 0.3 + exprAffinity * 0.2; // 0..3
  const score = Math.round((raw / 3) * 100);
  const harmony = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { score, lifePathPair: [a.lifePath, b.lifePath], harmony };
}

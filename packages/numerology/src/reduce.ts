export const DEFAULT_MASTERS: readonly number[] = [11, 22, 33];

export function digitSum(n: number): number {
  let total = 0;
  for (const ch of String(n)) total += Number(ch);
  return total;
}

export function reduce(n: number, masters: readonly number[] = DEFAULT_MASTERS): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`reduce: expected non-negative integer, got ${n}`);
  let value = n;
  while (value > 9 && !masters.includes(value)) value = digitSum(value);
  return value;
}

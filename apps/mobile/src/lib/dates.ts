export function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** Formats an ISO timestamp as a short relative string ("2h ago"), locale-aware. */
export function relativeTime(iso: string, locale: 'en' | 'he'): string {
  try {
    const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
      if (Math.abs(diffSec) >= secondsInUnit) {
        return rtf.format(-Math.round(diffSec / secondsInUnit), unit);
      }
    }
    return rtf.format(0, 'minute');
  } catch {
    return iso.slice(0, 10);
  }
}

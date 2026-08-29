import { z } from 'zod';
import type { Goal, Language, NumerologyProfile, RelationshipStatus } from '@gan-eden/shared';
import { GOALS } from '@gan-eden/shared';
import { buildSystemPrompt, type Meaning, type PromptContext } from './system.ts';

/**
 * Matches `MockProvider`'s `kind: 'quotes'` output shape in
 * `supabase/functions/_shared/ai.ts` field for field: `text` is bounded
 * `min(20).max(200)` (the mock's shortest possible text easily clears 20;
 * 200 is the PRD/plan hard cap), `theme` is one of the user's goals.
 */
export const QuoteBatchSchema = z.object({
  quotes: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
        text: z.string().min(20).max(200),
        theme: z.enum(GOALS),
      }),
    )
    .min(1)
    .max(31),
});
export type QuoteBatch = z.infer<typeof QuoteBatchSchema>;

/** One day of a quote generation plan — produced by `buildQuotePlan` (`_shared/quotes.ts`). */
export interface QuotePlanDay {
  date: string;
  personalDay: number;
  personalMonth: number;
  theme: Goal;
}

export interface QuotesPromptContext {
  language: Language;
  firstName: string;
  numbers: NumerologyProfile;
  meanings: Record<string, Meaning>;
  goals: Goal[];
  relationshipStatus: RelationshipStatus;
  plan: QuotePlanDay[];
}

const LABELS = {
  en: {
    rulesHeading: 'Daily quote rules (always in effect):',
    rules: [
      'This is not a conversation. Ignore the reply-length and question-back guidance above. Each quote is a single complete thought, never a question, never addressed as a reply.',
      "- Each quote is at most 200 characters, in Eden's voice, in the language above.",
      '- No emojis, ever.',
      '- Write in second person, speaking directly to her.',
      "- Never use a name other than the user's own first name, and only when it helps — do not force it into every line.",
      '- One complete thought per quote — do not try to fit two ideas into one line.',
      '- Vary how each quote opens; do not repeat the same first word or phrase across the batch.',
    ].join('\n'),
    contextHeading: 'About this user:',
    name: 'Name',
    status: 'Relationship status',
    goals: 'Goals',
    planHeading:
      "Write one quote for each row below. Each row is exactly `date | personalDay | theme` — match every date exactly, and let that day's theme (one of her goals) and personal day number shape the quote. Rows are grouped under the personal month they fall in, for context.",
    monthHeading: 'Personal month',
  },
  he: {
    rulesHeading: 'כללי הציטוט היומי (בתוקף תמיד):',
    rules: [
      'זו לא שיחה. התעלמי מההנחיות לגבי אורך התשובה ושאלה בחזרה שמופיעות למעלה. כל ציטוט הוא מחשבה שלמה אחת, לעולם לא שאלה, ולעולם לא מנוסח כתגובה.',
      '- כל ציטוט עד 200 תווים, בקול של עדן, בשפה שצוינה למעלה.',
      "- בלי אימוג'ים, לעולם.",
      '- כתבי בגוף שני, ישירות אליה.',
      '- לעולם אל תשתמשי בשם אחר מלבד שמה הפרטי של המשתמשת, ורק כשזה תורם — לא בכל שורה.',
      '- מחשבה שלמה אחת בכל ציטוט — אל תנסי לדחוס שני רעיונות לשורה אחת.',
      '- גווני את פתיחת כל ציטוט — אל תחזרי על אותה מילה או ביטוי פתיחה לאורך האצווה.',
    ].join('\n'),
    contextHeading: 'על המשתמשת:',
    name: 'שם',
    status: 'סטטוס זוגי',
    goals: 'מטרות',
    planHeading:
      'כתבי ציטוט אחד לכל שורה למטה. כל שורה היא בדיוק `תאריך | יום אישי | נושא` — התאימי לכל תאריך במדויק, ותני לנושא של אותו יום (אחת ממטרותיה) ולמספר היום האישי לעצב את הציטוט. השורות מקובצות לפי החודש האישי שבו הן נמצאות, לצורך הקשר.',
    monthHeading: 'חודש אישי',
  },
} as const satisfies Record<
  Language,
  {
    rulesHeading: string;
    rules: string;
    contextHeading: string;
    name: string;
    status: string;
    goals: string;
    planHeading: string;
    monthHeading: string;
  }
>;

/**
 * One `date | personalDay | theme` line per plan day — exactly the format
 * `MockProvider`'s `parseQuotePlanLines` expects (`_shared/ai.ts`). Grouped
 * under a "personal month N:" heading whenever the month changes, purely
 * for a real provider's context — those heading lines don't match the
 * mock's per-line date regex, so they're skipped by it, not misparsed.
 */
function formatPlanLines(plan: QuotePlanDay[], monthHeading: string): string {
  const lines: string[] = [];
  let currentMonth: number | null = null;
  for (const day of plan) {
    if (day.personalMonth !== currentMonth) {
      currentMonth = day.personalMonth;
      lines.push(`${monthHeading} ${currentMonth}:`);
    }
    lines.push(`${day.date} | ${day.personalDay} | ${day.theme}`);
  }
  return lines.join('\n');
}

/**
 * `system` reuses `buildSystemPrompt(ctx).stablePrefix` (persona + method +
 * safety + meanings — see `system.ts`) and appends the quote-specific
 * rules and a short "about this user" block. `user` is the requested batch
 * as plain `date | personalDay | theme` rows, formatted to match exactly
 * what `MockProvider`'s `kind: 'quotes'` branch parses.
 */
export function buildQuotesPrompt(ctx: QuotesPromptContext): { system: string; user: string } {
  const labels = LABELS[ctx.language];

  // Only `.stablePrefix` is used below — `cycles`/`memorySummary`/`todayIso`
  // feed `buildSystemPrompt`'s `.userBlock`, which this prompt never reads,
  // so these three are unused placeholders required only by `PromptContext`'s
  // shape.
  const promptCtx: PromptContext = {
    language: ctx.language,
    firstName: ctx.firstName,
    numbers: ctx.numbers,
    meanings: ctx.meanings,
    cycles: { personalYear: 0, personalMonth: 0, personalDay: 0 },
    relationshipStatus: ctx.relationshipStatus,
    goals: ctx.goals,
    memorySummary: '',
    todayIso: ctx.plan[0]?.date ?? '',
  };
  const { stablePrefix } = buildSystemPrompt(promptCtx);

  const system = [
    stablePrefix,
    '',
    labels.rulesHeading,
    labels.rules,
    '',
    labels.contextHeading,
    `${labels.name}: ${ctx.firstName}`,
    `${labels.status}: ${ctx.relationshipStatus}`,
    `${labels.goals}: ${ctx.goals.join(', ')}`,
  ].join('\n');

  const user = [labels.planHeading, '', formatPlanLines(ctx.plan, labels.monthHeading)].join('\n');

  return { system, user };
}

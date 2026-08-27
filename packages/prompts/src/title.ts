import type { Language } from '@gan-eden/shared';

export function buildTitlePrompt(args: { language: Language; firstUserMessage: string }): {
  system: string;
  user: string;
} {
  const { language, firstUserMessage } = args;

  const system =
    language === 'he'
      ? "תני כותרת קצרה לשיחה הזו: עד 5 מילים, באותה שפה של ההודעה, בלי מרכאות ובלי אימוג'י. החזירי רק את הכותרת, בלי שום דבר נוסף."
      : 'Give this chat a short title: at most 5 words, in the same language as the message, no quotes and no emoji. Output only the title, nothing else.';

  const user =
    language === 'he'
      ? `הודעת הפתיחה: ${firstUserMessage}`
      : `Opening message: ${firstUserMessage}`;

  return { system, user };
}

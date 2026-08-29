import type { Language } from '@gan-eden/shared';

/**
 * Mentor-voice copy that isn't a prompt (i.e. shown to the user, not sent
 * to the model). Keep in sync with the tone rules in
 * `@gan-eden/prompts` persona.ts.
 */
const STRINGS = {
  fallbackRefusal: {
    he: 'אני לא יכולה לענות על זה, אבל אני כאן. ספרי לי מה מרגיש לך הכי חשוב עכשיו.',
    en: "I can't answer that one, but I'm here. Tell me what feels most important right now.",
  },
} as const;

export function t(key: keyof typeof STRINGS, language: Language): string {
  return STRINGS[key][language];
}

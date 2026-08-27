import type { Language } from '@gan-eden/shared';

type Goal =
  | 'find_partner'
  | 'improve_relationship'
  | 'grow_as_woman'
  | 'heal_past'
  | 'understand_numbers'
  | 'confidence';

const GOAL_PROMPTS: Record<Language, Record<Goal, [string, string]>> = {
  en: {
    find_partner: [
      'What does my numerology say about finding the right partner?',
      'Why do I keep attracting the same type of person?',
    ],
    improve_relationship: [
      'How can I communicate better with my partner?',
      'What is my number telling me about my relationship right now?',
    ],
    grow_as_woman: [
      'What should I focus on for my own growth this year?',
      'What are my biggest strengths, based on my numbers?',
    ],
    heal_past: [
      'How do I start healing from my last relationship?',
      'What is holding me back from moving on?',
    ],
    understand_numbers: [
      'Can you explain what my life path number means?',
      'What is a personal year, and what does mine mean?',
    ],
    confidence: [
      'How can I feel more confident in myself?',
      'What does my personality number say about my confidence?',
    ],
  },
  he: {
    find_partner: [
      'מה המספרים שלי אומרים על למצוא את בן הזוג הנכון?',
      'למה אני כל הזמן נמשכת לאותו טיפוס של בן זוג?',
    ],
    improve_relationship: [
      'איך אני יכולה לתקשר טוב יותר עם בן הזוג שלי?',
      'מה המספר שלי אומר על הזוגיות שלי עכשיו?',
    ],
    grow_as_woman: [
      'על מה כדאי לי להתמקד בצמיחה האישית שלי השנה?',
      'מה החוזקות הכי גדולות שלי, לפי המספרים?',
    ],
    heal_past: ['איך אני מתחילה לרפא את עצמי מהזוגיות הקודמת?', 'מה עוצר אותי מלהמשיך הלאה?'],
    understand_numbers: [
      'את יכולה להסביר מה זה מספר נתיב החיים שלי?',
      'מה זו שנה אישית, ומה המשמעות של שלי?',
    ],
    confidence: [
      'איך אני יכולה להרגיש יותר בטוחה בעצמי?',
      'מה מספר האישיות שלי אומר על הביטחון העצמי שלי?',
    ],
  },
};

const GENERIC_PROMPT: Record<Language, string> = {
  en: 'What do you see in my numbers today?',
  he: 'מה את רואה במספרים שלי היום?',
};

const CONTINUE_PROMPT: Record<Language, string> = {
  en: 'Can we continue from last time?',
  he: 'אפשר להמשיך מהפעם הקודמת?',
};

export function starterPrompts(language: Language, goals: string[], hasMemory: boolean): string[] {
  const matched: string[] = [];
  for (const goal of goals) {
    const pair = GOAL_PROMPTS[language][goal as Goal];
    if (pair) matched.push(...pair);
  }

  const candidates = [
    ...matched,
    GENERIC_PROMPT[language],
    ...Object.values(GOAL_PROMPTS[language]).flat(),
  ];

  const unique: string[] = [];
  for (const candidate of candidates) {
    if (!unique.includes(candidate)) unique.push(candidate);
    if (unique.length >= 4) break;
  }

  if (hasMemory) {
    const withoutContinue = unique.filter((p) => p !== CONTINUE_PROMPT[language]);
    return [CONTINUE_PROMPT[language], ...withoutContinue].slice(0, 4);
  }

  return unique.slice(0, Math.max(3, Math.min(4, unique.length)));
}

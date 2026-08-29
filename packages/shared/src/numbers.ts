import { z } from 'zod';

export const NUMBER_KEYS = ['lifePath', 'expression', 'soulUrge', 'personality', 'birthday'] as const;
export type NumberKey = (typeof NUMBER_KEYS)[number];

export const NUMBER_I18N: Record<NumberKey, 'life_path' | 'expression' | 'soul_urge' | 'personality' | 'birthday'> = {
  lifePath: 'life_path',
  expression: 'expression',
  soulUrge: 'soul_urge',
  personality: 'personality',
  birthday: 'birthday',
};

export const NumerologyProfileSchema = z.object({
  lifePath: z.number().int().min(0),
  expression: z.number().int().min(0),
  soulUrge: z.number().int().min(0),
  personality: z.number().int().min(0),
  birthday: z.number().int().min(0),
  methodId: z.string(),
  engineVersion: z.string(),
});
export type NumerologyProfile = z.infer<typeof NumerologyProfileSchema>;

export function parseNumbers(json: unknown): NumerologyProfile {
  return NumerologyProfileSchema.parse(json);
}

export function safeParseNumbers(json: unknown): NumerologyProfile | null {
  const result = NumerologyProfileSchema.safeParse(json);
  return result.success ? result.data : null;
}

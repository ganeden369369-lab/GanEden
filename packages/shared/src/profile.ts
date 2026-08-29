import { z } from 'zod';

export const LANGUAGES = ['he', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const SCRIPTS = ['he', 'latin'] as const;
export type Script = (typeof SCRIPTS)[number];

export const RELATIONSHIP_STATUSES = ['single', 'dating', 'relationship', 'married'] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

export const GOALS = [
  'find_partner',
  'improve_relationship',
  'grow_as_woman',
  'heal_past',
  'understand_numbers',
  'confidence',
] as const;
export type Goal = (typeof GOALS)[number];

export const ProfileInputSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  script: z.enum(SCRIPTS),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  language: z.enum(LANGUAGES),
  relationshipStatus: z.enum(RELATIONSHIP_STATUSES),
  goals: z.array(z.enum(GOALS)).min(1),
});
export type ProfileInput = z.infer<typeof ProfileInputSchema>;

import { computeProfile } from '@gan-eden/numerology';
import type { Database, ProfileInput } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

export function buildProfileRow(input: ProfileInput, userId: string): ProfileInsert {
  const numbers = computeProfile({ fullName: input.fullName, script: input.script, dob: input.dob });
  return {
    user_id: userId,
    full_name: input.fullName,
    full_name_script: input.script,
    dob: input.dob,
    language: input.language,
    relationship_status: input.relationshipStatus,
    goals: input.goals,
    numbers: { ...numbers },
    engine_version: numbers.engineVersion,
  };
}

export async function saveProfile(input: ProfileInput, userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(buildProfileRow(input, userId));
  if (error) throw error;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, NumerologyProfile } from '@gan-eden/shared';
import { parseNumbers } from '@gan-eden/shared';
import { personalCycles, type PersonalCycles } from '@gan-eden/numerology';
import type { Meaning } from '@gan-eden/prompts';
import type { ChatTurn } from './ai.ts';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface ChatContext {
  profile: ProfileRow;
  numbers: NumerologyProfile;
  /** key `${number_type}:${value}`, in the profile's language. */
  meanings: Record<string, Meaning>;
  cycles: PersonalCycles;
  memorySummary: string;
  /** Last 30 messages of the chat, oldest first. Empty for a new chat. */
  recentMessages: ChatTurn[];
}

/** First token of a full name, e.g. "Maya Cohen" -> "Maya". */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

/**
 * Assembles everything `buildSystemPrompt` needs for one turn: the user's
 * profile + numbers, numerology meanings in her language, her current
 * personal cycles, her cross-chat memory summary, and (if `chatId` is an
 * existing chat) the chat's recent history.
 *
 * Call this BEFORE inserting the current turn's user message, so
 * `recentMessages` naturally excludes it — the caller appends the current
 * message itself when building the provider's `messages` array.
 */
export async function loadChatContext(
  admin: SupabaseClient<Database>,
  userId: string,
  chatId: string | null,
): Promise<ChatContext> {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (profileError || !profile) {
    throw new Error(`profile not found for user ${userId}: ${profileError?.message ?? 'no row'}`);
  }

  const numbers = parseNumbers(profile.numbers);

  const { data: meaningRows } = await admin
    .from('content_meanings')
    .select('number_type, value, title, body')
    .eq('language', profile.language);

  const meanings: Record<string, Meaning> = {};
  for (const row of meaningRows ?? []) {
    meanings[`${row.number_type}:${row.value}`] = { title: row.title, body: row.body };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const cycles = personalCycles(profile.dob, todayIso);

  const { data: summaryRow } = await admin
    .from('memory_summaries')
    .select('summary')
    .eq('user_id', userId)
    .maybeSingle();
  const memorySummary = summaryRow?.summary ?? '';

  let recentMessages: ChatTurn[] = [];
  if (chatId) {
    const { data: rows } = await admin
      .from('messages')
      .select('role, content, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(30);
    recentMessages = (rows ?? [])
      .slice()
      .reverse()
      .map((row) => ({ role: row.role as ChatTurn['role'], content: row.content }));
  }

  return { profile, numbers, meanings, cycles, memorySummary, recentMessages };
}

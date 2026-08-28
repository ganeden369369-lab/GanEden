import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Language } from '@gan-eden/shared';
import { buildMemoryExtractionInput, MemoryExtractionSchema } from '@gan-eden/prompts';
import { estimateUsd, type AiProvider } from './ai.ts';

/**
 * Hard ceiling on stored facts per user. At the cap, extraction still runs
 * and the summary is still refreshed (so nothing is forgotten), but no new
 * fact rows are inserted — unbounded growth would inflate every extraction
 * prompt and, through the summary, every chat turn.
 */
const MAX_FACTS = 100;

/** How many of the newest facts the extraction prompt is allowed to see. */
const PROMPT_FACTS = 40;

/** Strips ```json ... ``` / ``` ... ``` fences a model sometimes wraps JSON in. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ? fenced[1].trim() : trimmed;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Upserts `memory_summaries` with a facts_hash derived from all fact texts (sorted, joined by \n). */
export async function rebuildSummary(
  admin: SupabaseClient<Database>,
  userId: string,
  allFactTexts: string[],
  summary: string,
): Promise<void> {
  const factsHash = await sha256Hex([...allFactTexts].sort().join('\n'));
  const { error } = await admin
    .from('memory_summaries')
    .upsert({ user_id: userId, summary, facts_hash: factsHash, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/**
 * Runs after a turn completes (from `EdgeRuntime.waitUntil`, after the SSE
 * response has already closed): asks the provider to extract durable facts
 * + an updated summary from the exchange, inserts facts that aren't
 * already present (case-insensitive text match), and upserts the summary.
 *
 * Never throws — every failure is logged and swallowed, since there is no
 * client left listening by the time this runs.
 */
export async function extractAndStoreMemory(
  admin: SupabaseClient<Database>,
  provider: AiProvider,
  userId: string,
  chatId: string,
  language: Language,
  exchange: { user: string; assistant: string },
): Promise<void> {
  try {
    const { data: existingFactRows, error: factsReadError } = await admin
      .from('memory_facts')
      .select('text')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (factsReadError) throw factsReadError;
    // Newest first — the whole set is still used for dedup and the summary
    // hash, but only the newest slice is shown to the model.
    const existingFacts = (existingFactRows ?? []).map((row) => row.text);
    const atFactCap = existingFacts.length >= MAX_FACTS;

    const { data: summaryRow, error: summaryReadError } = await admin
      .from('memory_summaries')
      .select('summary')
      .eq('user_id', userId)
      .maybeSingle();
    if (summaryReadError) throw summaryReadError;
    const existingSummary = summaryRow?.summary ?? '';

    const { system, user } = buildMemoryExtractionInput({
      language,
      existingSummary,
      existingFacts: existingFacts.slice(0, PROMPT_FACTS),
      exchange,
    });

    const result = await provider.complete({ system, user, maxTokens: 700 });
    const { error: spendError } = await admin.rpc('add_spend', {
      p_usd: estimateUsd(result.model, result.inputTokens, result.outputTokens),
    });
    if (spendError) {
      console.error('extractAndStoreMemory: add_spend failed', spendError.message);
    }

    const parsed = MemoryExtractionSchema.safeParse(JSON.parse(stripCodeFences(result.text)));
    if (!parsed.success) {
      console.error('extractAndStoreMemory: schema validation failed', parsed.error.message);
      return;
    }

    const existingLower = new Set(existingFacts.map((f) => f.toLowerCase()));
    // At the cap the summary still gets refreshed below — only new fact
    // rows are dropped.
    const newFacts = atFactCap
      ? []
      : parsed.data.facts.filter((f) => !existingLower.has(f.text.toLowerCase()));

    if (newFacts.length > 0) {
      const { error: insertError } = await admin.from('memory_facts').insert(
        newFacts.map((f) => ({
          user_id: userId,
          category: f.category,
          text: f.text,
          source_chat_id: chatId,
        })),
      );
      if (insertError) {
        console.error('extractAndStoreMemory: failed to insert facts', insertError.message);
        return;
      }
    }

    await rebuildSummary(admin, userId, [...existingFacts, ...newFacts.map((f) => f.text)], parsed.data.summary);
  } catch (err) {
    console.error('extractAndStoreMemory: failed', err);
  }
}

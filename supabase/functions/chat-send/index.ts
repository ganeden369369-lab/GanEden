import { buildSystemPrompt, buildTitlePrompt, PERSONA_VERSION } from '@gan-eden/prompts';
import type { Language } from '@gan-eden/shared';
import { adminClient, getUser } from '../_shared/supabase.ts';
import { corsHeaders, createSse, jsonResponse } from '../_shared/sse.ts';
import { estimateUsd, getProvider, type ChatTurn } from '../_shared/ai.ts';
import { firstNameOf, loadChatContext } from '../_shared/context.ts';
import { extractAndStoreMemory } from '../_shared/memory.ts';
import { t } from '../_shared/copy.ts';

interface ChatSendBody {
  chatId?: string;
  text?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Present only when running under a Supabase-managed edge runtime (prod). Absent on plain Deno / `functions serve` in some versions. */
function getEdgeRuntime(): { waitUntil: (promise: Promise<unknown>) => void } | undefined {
  return (globalThis as { EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void } }).EdgeRuntime;
}

function sanitizeTitle(raw: string): string {
  return raw
    .trim()
    .replace(/^[\s"'“”‘’׳״]+|[\s"'“”‘’׳״]+$/g, '')
    .slice(0, 60)
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  // --- 1. auth + validation --------------------------------------------
  const auth = await getUser(req);
  if (!auth) {
    return jsonResponse(401, { error: 'auth' });
  }
  const userId = auth.user.id;

  let body: ChatSendBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'bad_request' });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (text.length < 1 || text.length > 2000) {
    return jsonResponse(400, { error: 'bad_request' });
  }
  const requestedChatId =
    typeof body.chatId === 'string' && body.chatId.length > 0 ? body.chatId : null;
  if (requestedChatId && !UUID_RE.test(requestedChatId)) {
    return jsonResponse(400, { error: 'bad_request' });
  }

  const admin = adminClient();

  // --- 2. free-tier cap + global budget ----------------------------------
  const { data: remaining, error: usageError } = await admin.rpc('check_and_increment_usage', {
    p_user: userId,
  });
  if (usageError) {
    console.error('chat-send: check_and_increment_usage failed', usageError.message);
    return jsonResponse(500, { error: 'internal' });
  }
  if (remaining === -1) {
    const sse = createSse();
    sse.send('cap', { remaining: 0 });
    sse.close();
    return sse.response;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const dailyBudget = Number(Deno.env.get('DAILY_BUDGET_USD') ?? '20');
  const { data: spendRow, error: spendReadError } = await admin
    .from('spend_daily')
    .select('usd')
    .eq('date', todayIso)
    .maybeSingle();
  if (spendReadError) {
    console.error('chat-send: failed to read spend_daily', spendReadError.message);
    return jsonResponse(500, { error: 'internal' });
  }
  if ((spendRow?.usd ?? 0) > dailyBudget) {
    const sse = createSse();
    sse.send('error', { code: 'budget', message: 'Daily budget exceeded.' });
    sse.close();
    return sse.response;
  }

  // --- 3. resolve the chat -------------------------------------------
  let chatId: string;
  if (requestedChatId) {
    const { data: chat, error: chatReadError } = await admin
      .from('chats')
      .select('id')
      .eq('id', requestedChatId)
      .eq('user_id', userId)
      .maybeSingle();
    if (chatReadError) {
      console.error('chat-send: failed to read chat', chatReadError.message);
      return jsonResponse(500, { error: 'internal' });
    }
    if (!chat) {
      return jsonResponse(404, { error: 'not_found' });
    }
    chatId = chat.id;
  } else {
    const { data: newChat, error: chatError } = await admin
      .from('chats')
      .insert({ user_id: userId, title: null })
      .select('id')
      .single();
    if (chatError || !newChat) {
      console.error('chat-send: failed to create chat', chatError?.message);
      return jsonResponse(500, { error: 'internal' });
    }
    chatId = newChat.id;
  }

  // --- 4. context (before inserting the current turn's user message, so
  //        recentMessages naturally excludes it) + the user message row ---
  // Both are wrapped together: a profile-load failure inside
  // loadChatContext (e.g. no profile row) or an insert failure must return
  // a normal 500 JSON response — nothing has streamed yet, so there's no
  // SSE contract to honor here.
  let ctx: Awaited<ReturnType<typeof loadChatContext>>;
  let userMessageId: string;
  try {
    ctx = await loadChatContext(admin, userId, chatId);

    const { data: userMessage, error: userMessageError } = await admin
      .from('messages')
      .insert({ chat_id: chatId, user_id: userId, role: 'user', content: text, status: 'complete' })
      .select('id')
      .single();
    if (userMessageError || !userMessage) {
      throw userMessageError ?? new Error('user message insert returned no row');
    }
    userMessageId = userMessage.id;
  } catch (err) {
    console.error('chat-send: failed to load context / insert user message', err);
    return jsonResponse(500, { error: 'internal' });
  }

  const provider = getProvider(Deno.env.toObject());
  const language = ctx.profile.language as Language;

  // --- 5. stream the reply over SSE ---------------------------------
  const sse = createSse();
  sse.send('meta', {
    chatId,
    userMessageId,
    assistantMessageId: null,
    remaining,
  });

  void (async () => {
    let streamedText = '';

    // Titles an untitled chat, then extracts memory facts/summary from the
    // exchange. Safe to call in the background (via EdgeRuntime.waitUntil)
    // or awaited inline — never throws.
    const runAfterTurn = async (finalAssistantText: string): Promise<void> => {
      try {
        const { data: chatRow } = await admin.from('chats').select('title').eq('id', chatId).maybeSingle();
        if (chatRow && !chatRow.title) {
          const titlePrompt = buildTitlePrompt({ language, firstUserMessage: text });
          const titleResult = await provider.complete({ ...titlePrompt, maxTokens: 30 });
          const sanitized = sanitizeTitle(titleResult.text);
          if (sanitized) {
            await admin.from('chats').update({ title: sanitized }).eq('id', chatId);
          }
        }
      } catch (err) {
        console.error('chat-send: afterTurn title generation failed', err);
      }

      await extractAndStoreMemory(admin, provider, userId, chatId, language, {
        user: text,
        assistant: finalAssistantText,
      });
    };

    try {
      const messages: ChatTurn[] = [...ctx.recentMessages, { role: 'user', content: text }];

      const result = await provider.streamChat({
        system: buildSystemPrompt({
          language,
          firstName: firstNameOf(ctx.profile.full_name),
          numbers: ctx.numbers,
          meanings: ctx.meanings,
          cycles: ctx.cycles,
          relationshipStatus: ctx.profile.relationship_status,
          goals: ctx.profile.goals,
          memorySummary: ctx.memorySummary,
          todayIso,
        }),
        messages,
        maxTokens: 1024,
        signal: req.signal,
        onDelta: (delta) => {
          // The write already failed once (client gone) — stop bothering.
          if (sse.closed) return;
          streamedText += delta;
          sse.send('delta', { text: delta });
        },
      });

      const aborted = req.signal.aborted;

      let assistantText = result.text;
      let dbStatus: 'complete' | 'partial' | 'error';
      // The SSE contract's `done` event only ever carries
      // status:'complete'|'partial' (never 'error') — the DB's `messages
      // .status` enum is broader and tracked separately. A turn with
      // nothing to show, or one the client is no longer around to hear
      // about, skips `done` entirely in favor of `error` or silence.
      let reportToClient = true;

      if (aborted) {
        // Client disconnected mid-stream. Nobody is listening — persist
        // what streamed so far and stop; don't attempt any more frames.
        assistantText = streamedText;
        dbStatus = streamedText.trim().length > 0 ? 'partial' : 'error';
        reportToClient = false;
      } else if (result.stopReason === 'refusal') {
        assistantText = t('fallbackRefusal', language);
        if (!sse.closed) sse.send('delta', { text: assistantText });
        dbStatus = 'complete';
      } else if (result.stopReason === 'error' || result.stopReason === 'max_tokens') {
        dbStatus = assistantText.trim().length > 0 ? 'partial' : 'error';
      } else {
        dbStatus = 'complete';
      }

      const { data: assistantMessage, error: assistantInsertError } = await admin
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: userId,
          role: 'assistant',
          content: assistantText,
          status: dbStatus,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          model: result.model,
          prompt_version: PERSONA_VERSION,
        })
        .select('id')
        .single();
      if (assistantInsertError) {
        console.error('chat-send: failed to insert assistant message', assistantInsertError.message);
      }

      await admin.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', chatId);

      // We have `result` (tokens + model) whenever streamChat resolved
      // normally — including the aborted-but-resolved-cleanly case — so
      // spend is recorded for every path that reaches here.
      const usd = estimateUsd(result.model, result.inputTokens, result.outputTokens);
      const { error: spendError } = await admin.rpc('add_spend', { p_usd: usd });
      if (spendError) {
        console.error('chat-send: add_spend failed', spendError.message);
      }

      if (!reportToClient) {
        // Aborted: no SSE frames. Still title/extract in the background,
        // but only if there's actually something to work from.
        if (assistantText.trim().length > 0) {
          const edgeRuntime = getEdgeRuntime();
          if (edgeRuntime) {
            edgeRuntime.waitUntil(runAfterTurn(assistantText));
          } else {
            await runAfterTurn(assistantText);
          }
        }
        sse.close();
        return;
      }

      if (dbStatus === 'error') {
        if (!sse.closed) {
          sse.send('error', { code: 'provider', message: 'The mentor could not generate a reply.' });
        }
        sse.close();
        return;
      }

      if (!sse.closed) {
        sse.send('done', { status: dbStatus, assistantMessageId: assistantMessage?.id ?? null, title: null });
      }

      const edgeRuntime = getEdgeRuntime();
      if (edgeRuntime) {
        sse.close();
        edgeRuntime.waitUntil(runAfterTurn(assistantText));
      } else {
        // No EdgeRuntime global (older/local runtime) — the isolate may
        // not survive after this handler returns, so run the background
        // work to completion before closing the stream.
        await runAfterTurn(assistantText);
        sse.close();
      }
    } catch (err) {
      const aborted = req.signal.aborted;
      if (aborted) {
        // The client is gone — this is very likely an abort-driven
        // rejection (e.g. the Anthropic SDK throwing on a signalled
        // request) rather than a genuine provider failure. No SSE frames;
        // persist whatever streamed, but we have no `result` here (the
        // call never resolved), so token/spend accounting is skipped —
        // there's nothing reliable to report.
        console.error('chat-send: generation aborted by client', err);
      } else {
        console.error('chat-send: generation failed', err);
        if (!sse.closed) {
          sse.send('error', {
            code: 'provider',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (streamedText.trim().length > 0) {
        const { error: partialInsertError } = await admin.from('messages').insert({
          chat_id: chatId,
          user_id: userId,
          role: 'assistant',
          content: streamedText,
          status: 'partial',
          prompt_version: PERSONA_VERSION,
        });
        if (partialInsertError) {
          console.error('chat-send: failed to persist partial message', partialInsertError.message);
        } else if (aborted) {
          const edgeRuntime = getEdgeRuntime();
          if (edgeRuntime) {
            edgeRuntime.waitUntil(runAfterTurn(streamedText));
          } else {
            await runAfterTurn(streamedText);
          }
        }
      }
      sse.close();
    }
  })();

  return sse.response;
});

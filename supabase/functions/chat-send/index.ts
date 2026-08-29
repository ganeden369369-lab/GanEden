import { buildSystemPrompt, buildTitlePrompt, PERSONA_VERSION } from '@gan-eden/prompts';
import type { Language } from '@gan-eden/shared';
import { adminClient, getUser } from '../_shared/supabase.ts';
import { corsHeaders, createSse, jsonResponse } from '../_shared/sse.ts';
import { estimateUsd, getProvider, usageOf, type ChatTurn } from '../_shared/ai.ts';
import { firstNameOf, loadChatContext } from '../_shared/context.ts';
import { extractAndStoreMemory } from '../_shared/memory.ts';
import { t } from '../_shared/copy.ts';
import { isUuid, isValidRetryMessage } from '../_shared/validate.ts';

interface ChatSendBody {
  chatId?: string;
  text?: string;
  /** Set by the client's retry button: reuse this user message instead of inserting a duplicate. Must name the chat's actual last message — see `isValidRetryMessage`. */
  retryOfMessageId?: string;
}

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
  if (requestedChatId && !isUuid(requestedChatId)) {
    return jsonResponse(400, { error: 'bad_request' });
  }
  const retryOfMessageId =
    typeof body.retryOfMessageId === 'string' && body.retryOfMessageId.length > 0
      ? body.retryOfMessageId
      : null;
  // A retry only makes sense against an existing chat's last message — bad
  // format, or a retry id with no chatId to retry it in, is a 400.
  if (retryOfMessageId && (!isUuid(retryOfMessageId) || !requestedChatId)) {
    return jsonResponse(400, { error: 'bad_request' });
  }

  const admin = adminClient();

  // The steps below are ordered so that nothing irreversible happens until
  // the request is known-good: ownership and retry validation (which can
  // still answer 404/400) run first, then the context load, and only then
  // the budget check and `check_and_increment_usage` — so a request that
  // was going to be rejected never burns a message off the daily cap, and
  // never creates a chat or deletes a row.

  // --- 2. verify the chat (existing chats only; a new one is created
  //        alongside the user message, once the cap has been cleared) ----
  let existingChatId: string | null = null;
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
    existingChatId = chat.id;
  }

  // --- 3. retry: reuse the last user message instead of inserting a
  //        duplicate, and drop the failed assistant rows it produced ------
  let reuseUserMessageId: string | null = null;
  let failedAssistantIds: string[] = [];
  if (retryOfMessageId && existingChatId) {
    const { data: lastMessage, error: lastMessageError } = await admin
      .from('messages')
      .select('id, role, user_id, content, created_at')
      .eq('chat_id', existingChatId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastMessageError) {
      console.error('chat-send: failed to read last user message for retry', lastMessageError.message);
      return jsonResponse(500, { error: 'internal' });
    }

    // Everything the failed attempt left behind after that user turn. A
    // valid retry has only failed assistant rows here (often exactly one,
    // sometimes none when the attempt died before persisting anything).
    let trailing: Array<{ id: string; role: string; status: string }> = [];
    if (lastMessage) {
      const { data: trailingRows, error: trailingError } = await admin
        .from('messages')
        .select('id, role, status')
        .eq('chat_id', existingChatId)
        .gt('created_at', lastMessage.created_at)
        .order('created_at', { ascending: true });
      if (trailingError) {
        console.error('chat-send: failed to read trailing messages for retry', trailingError.message);
        return jsonResponse(500, { error: 'internal' });
      }
      trailing = trailingRows ?? [];
    }

    if (!isValidRetryMessage(lastMessage, trailing, retryOfMessageId, userId, text)) {
      return jsonResponse(400, { error: 'bad_request' });
    }
    reuseUserMessageId = lastMessage!.id;
    failedAssistantIds = trailing.map((row) => row.id);
  }

  // --- 4. context ------------------------------------------------------
  // Loaded before the current turn's user message is inserted, so
  // `recentMessages` naturally excludes it. A failure here (e.g. no
  // profile row) is a normal 500 JSON response — nothing has streamed yet,
  // so there's no SSE contract to honor.
  let ctx: Awaited<ReturnType<typeof loadChatContext>>;
  try {
    ctx = await loadChatContext(admin, userId, existingChatId);
  } catch (err) {
    console.error('chat-send: failed to load context', err);
    return jsonResponse(500, { error: 'internal' });
  }

  // --- 5. global budget + free-tier cap --------------------------------
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

  const { data: remaining, error: usageError } = await admin.rpc('check_and_increment_usage', {
    p_user: userId,
    p_limit: Number(Deno.env.get('FREE_DAILY_MESSAGES') ?? 5),
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

  // --- 6. the chat row (if new), the failed rows this retry replaces, and
  //        the user message row -----------------------------------------
  let chatId: string;
  let userMessageId: string;
  try {
    if (failedAssistantIds.length > 0) {
      // Service role: the failed assistant turn(s) this retry replaces are
      // removed before generating, so the chat never accumulates dead rows
      // and `messages` stays a clean user/assistant alternation.
      const { error: deleteError } = await admin.from('messages').delete().in('id', failedAssistantIds);
      if (deleteError) throw deleteError;
    }

    if (existingChatId) {
      chatId = existingChatId;
    } else {
      const { data: newChat, error: chatError } = await admin
        .from('chats')
        .insert({ user_id: userId, title: null })
        .select('id')
        .single();
      if (chatError || !newChat) {
        throw chatError ?? new Error('chat insert returned no row');
      }
      chatId = newChat.id;
    }

    if (reuseUserMessageId) {
      // Already persisted by the failed attempt being retried — reusing it
      // means `loadChatContext`'s recentMessages (unlike the fresh-send
      // path) DOES already include this exact turn plus the rows just
      // deleted; both are stripped back off below.
      userMessageId = reuseUserMessageId;
    } else {
      const { data: userMessage, error: userMessageError } = await admin
        .from('messages')
        .insert({ chat_id: chatId, user_id: userId, role: 'user', content: text, status: 'complete' })
        .select('id')
        .single();
      if (userMessageError || !userMessage) {
        throw userMessageError ?? new Error('user message insert returned no row');
      }
      userMessageId = userMessage.id;
    }
  } catch (err) {
    console.error('chat-send: failed to create the chat / user message', err);
    return jsonResponse(500, { error: 'internal' });
  }

  const provider = getProvider(Deno.env.toObject());
  const language = ctx.profile.language as Language;

  // --- 7. stream the reply over SSE ---------------------------------
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
          let titleResult;
          try {
            titleResult = await provider.complete({ ...titlePrompt, maxTokens: 30, kind: 'title' });
          } catch (err) {
            // A parse/validation failure still means the provider generated
            // (and, for a real provider, was billed for) a real completion —
            // bill it before letting the outer catch log and swallow it.
            const usage = usageOf(err);
            if (usage) {
              const { error: titleParseSpendError } = await admin.rpc('add_spend', {
                p_usd: estimateUsd(usage.model, usage.inputTokens, usage.outputTokens),
              });
              if (titleParseSpendError) {
                console.error('chat-send: add_spend failed (title parse-error usage)', titleParseSpendError.message);
              }
            }
            throw err;
          }
          // Titling is a real provider call — bill it like any other, so
          // the daily kill-switch sees the full cost of a turn.
          const { error: titleSpendError } = await admin.rpc('add_spend', {
            p_usd: estimateUsd(titleResult.model, titleResult.inputTokens, titleResult.outputTokens),
          });
          if (titleSpendError) {
            console.error('chat-send: add_spend failed (title)', titleSpendError.message);
          }
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
      // On a retry, `ctx.recentMessages` was loaded before the failed
      // assistant rows were deleted, and already ends with this exact user
      // turn (persisted by the attempt being retried, before this request
      // ever ran) — drop both tails here so the provider sees neither the
      // duplicated user turn nor the failed reply it is replacing.
      const priorMessages = reuseUserMessageId
        ? ctx.recentMessages.slice(0, -(1 + failedAssistantIds.length))
        : ctx.recentMessages;
      const messages: ChatTurn[] = [...priorMessages, { role: 'user', content: text }];

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
          // Always keep the full text — whatever gets persisted as
          // `partial` must contain everything the provider generated,
          // even once the SSE write itself has started failing.
          streamedText += delta;
          // The write already failed once (client gone) — stop bothering.
          if (sse.closed) return;
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
        // persist whatever streamed. We have no `result` here (the call
        // never resolved), so real token counts aren't available — spend
        // is estimated from the streamed text below instead of skipped.
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
        } else {
          // No resolved `result` (the provider call threw before
          // finishing) — estimate output tokens from the streamed
          // character count (~4 chars/token, a common rough rule of
          // thumb) against the configured chat model, so a real
          // generation that got cut off still shows up in spend_daily
          // instead of costing nothing. This holds whether the throw came
          // from a client abort or a genuine provider failure: the tokens
          // were generated (and billed by the provider) either way.
          const estimatedModel = Deno.env.get('CHAT_MODEL') ?? 'claude-sonnet-5';
          const estimatedUsd = estimateUsd(estimatedModel, 0, Math.ceil(streamedText.length / 4));
          const { error: spendError } = await admin.rpc('add_spend', { p_usd: estimatedUsd });
          if (spendError) {
            console.error('chat-send: add_spend failed (estimated)', spendError.message);
          }

          if (aborted) {
            const edgeRuntime = getEdgeRuntime();
            if (edgeRuntime) {
              edgeRuntime.waitUntil(runAfterTurn(streamedText));
            } else {
              await runAfterTurn(streamedText);
            }
          }
        }
      }
      sse.close();
    }
  })();

  return sse.response;
});

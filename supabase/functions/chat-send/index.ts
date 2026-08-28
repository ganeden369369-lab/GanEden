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
  const ctx = await loadChatContext(admin, userId, chatId);

  const { data: userMessage, error: userMessageError } = await admin
    .from('messages')
    .insert({ chat_id: chatId, user_id: userId, role: 'user', content: text, status: 'complete' })
    .select('id')
    .single();
  if (userMessageError || !userMessage) {
    console.error('chat-send: failed to insert user message', userMessageError?.message);
    return jsonResponse(500, { error: 'internal' });
  }

  const provider = getProvider(Deno.env.toObject());
  const language = ctx.profile.language as Language;

  // --- 5. stream the reply over SSE ---------------------------------
  const sse = createSse();
  sse.send('meta', {
    chatId,
    userMessageId: userMessage.id,
    assistantMessageId: null,
    remaining,
  });

  void (async () => {
    let streamedText = '';
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
        onDelta: (delta) => {
          streamedText += delta;
          sse.send('delta', { text: delta });
        },
      });

      let assistantText = result.text;
      let status: 'complete' | 'partial' | 'error' = 'complete';

      if (result.stopReason === 'refusal') {
        assistantText = t('fallbackRefusal', language);
        sse.send('delta', { text: assistantText });
        status = 'complete';
      } else if (result.stopReason === 'error' || result.stopReason === 'max_tokens') {
        status = assistantText.trim().length > 0 ? 'partial' : 'error';
        if (status === 'error') {
          sse.send('error', { code: 'provider', message: 'The mentor could not generate a reply.' });
        }
      }

      const { data: assistantMessage, error: assistantInsertError } = await admin
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: userId,
          role: 'assistant',
          content: assistantText,
          status,
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

      const usd = estimateUsd(result.model, result.inputTokens, result.outputTokens);
      const { error: spendError } = await admin.rpc('add_spend', { p_usd: usd });
      if (spendError) {
        console.error('chat-send: add_spend failed', spendError.message);
      }

      const afterTurn = async (): Promise<void> => {
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
          assistant: assistantText,
        });
      };

      sse.send('done', { status, assistantMessageId: assistantMessage?.id ?? null, title: null });

      const edgeRuntime = getEdgeRuntime();
      if (edgeRuntime) {
        sse.close();
        edgeRuntime.waitUntil(afterTurn());
      } else {
        // No EdgeRuntime global (older/local runtime) — the isolate may not
        // survive after this handler returns, so run the background work
        // to completion before closing the stream.
        await afterTurn();
        sse.close();
      }
    } catch (err) {
      console.error('chat-send: generation failed', err);
      sse.send('error', {
        code: 'provider',
        message: err instanceof Error ? err.message : String(err),
      });
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
        }
      }
      sse.close();
    }
  })();

  return sse.response;
});

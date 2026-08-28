/**
 * `chat-send` contract test — a real HTTP client against a running
 * `pnpm functions:serve` + local Supabase, not a unit test. Skipped
 * entirely unless SUPABASE_URL, SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY are all set, since it needs a live server to
 * hit and admin credentials to seed/clean up fixtures.
 *
 * Run (from repo root, with `pnpm functions:serve` already running):
 *
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_ANON_KEY=<anon key from `npx -y supabase@latest status`> \
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key from the same> \
 *   npx -y deno@2 test --allow-env --allow-net \
 *     --config supabase/functions/deno.json supabase/functions/chat-send_test.ts
 */
import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@gan-eden/shared';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const envReady = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);

interface SseEvent {
  event: string;
  data: unknown;
}

/** Parses a full SSE response body (`event: x\ndata: y\n\n` frames) read via `res.text()`. */
function parseSse(raw: string): SseEvent[] {
  return raw
    .split('\n\n')
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame) => {
      const lines = frame.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event: ')) ?? '';
      const dataLine = lines.find((l) => l.startsWith('data: ')) ?? '';
      return {
        event: eventLine.slice('event: '.length),
        data: dataLine ? JSON.parse(dataLine.slice('data: '.length)) : undefined,
      };
    });
}

Deno.test({
  name: 'chat-send contract test (integration; requires SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY env + pnpm functions:serve running)',
  ignore: !envReady,
  fn: async (t) => {
    const admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anon = createClient<Database>(SUPABASE_URL!, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = `chat-send-contract-${crypto.randomUUID()}@example.com`;
    const password = 'Test-password-1234!';

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createUserError || !createdUser.user) {
      throw new Error(`failed to create test user: ${createUserError?.message ?? 'no user returned'}`);
    }
    const userId = createdUser.user.id;

    try {
      const { error: profileError } = await admin.from('profiles').insert({
        user_id: userId,
        full_name: 'Test User',
        full_name_script: 'latin',
        dob: '1990-05-15',
        language: 'en',
        relationship_status: 'single',
        goals: ['career'],
        numbers: {
          lifePath: 7,
          expression: 3,
          soulUrge: 9,
          personality: 5,
          birthday: 2,
          methodId: 'pythagorean',
          engineVersion: 'v1',
        },
        engine_version: 'v1',
      });
      if (profileError) {
        throw new Error(`failed to insert test profile: ${profileError.message}`);
      }

      const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
      if (signInError || !signIn.session) {
        throw new Error(`failed to sign in test user: ${signInError?.message ?? 'no session returned'}`);
      }
      const accessToken = signIn.session.access_token;

      async function sendChat(
        body: Record<string, unknown>,
      ): Promise<{ status: number; json: unknown; events: SseEvent[] }> {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: ANON_KEY!,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000),
        });
        const contentType = res.headers.get('content-type') ?? '';
        const raw = await res.text();
        if (contentType.includes('application/json')) {
          return { status: res.status, json: raw ? JSON.parse(raw) : null, events: [] };
        }
        return { status: res.status, json: null, events: parseSse(raw) };
      }

      async function usageCount(): Promise<number> {
        const { data, error } = await admin
          .from('usage_daily')
          .select('message_count')
          .eq('user_id', userId)
          .eq('date', new Date().toISOString().slice(0, 10))
          .maybeSingle();
        if (error) throw new Error(`failed to read usage_daily: ${error.message}`);
        return data?.message_count ?? 0;
      }

      let retryChatId = '';
      let retryUserMessageId = '';

      // --- 1. happy path ---------------------------------------------------
      await t.step('happy path: meta, delta(s), done', async () => {
        const { status, events } = await sendChat({ text: 'Hello Eden, tell me about my life path.' });
        assert.equal(status, 200);
        assert.ok(events.length >= 3, `expected at least meta+delta+done, got ${events.length} events`);
        assert.equal(events[0]!.event, 'meta');
        const meta = events[0]!.data as { chatId: string; userMessageId: string; remaining: number };
        assert.ok(meta.chatId, 'meta.chatId should be set');
        assert.ok(meta.userMessageId, 'meta.userMessageId should be set');

        const deltaEvents = events.filter((e) => e.event === 'delta');
        assert.ok(deltaEvents.length > 0, 'expected at least one delta event');

        const doneEvent = events.find((e) => e.event === 'done');
        assert.ok(doneEvent, 'expected a done event');
        const done = doneEvent!.data as { status: string; assistantMessageId: string | null };
        assert.equal(done.status, 'complete');
        assert.ok(done.assistantMessageId, 'done.assistantMessageId should be set');
      });

      // --- 2. 404 for a chat that isn't the caller's --------------------
      await t.step('404 for a foreign/non-existent chatId; usage unchanged', async () => {
        const before = await usageCount();
        const { status, json } = await sendChat({ chatId: crypto.randomUUID(), text: 'hello' });
        assert.equal(status, 404);
        assert.deepEqual(json, { error: 'not_found' });
        const after = await usageCount();
        assert.equal(after, before, 'usage_daily.message_count must not change for a rejected request');
      });

      // --- 3. retry after a failed assistant row succeeds -----------------
      await t.step('setup: seed a chat with a failed assistant row', async () => {
        const { data: chat, error: chatError } = await admin
          .from('chats')
          .insert({ user_id: userId, title: null })
          .select('id')
          .single();
        if (chatError || !chat) throw new Error(`failed to seed chat: ${chatError?.message}`);
        retryChatId = chat.id;

        const { data: userMessage, error: userMessageError } = await admin
          .from('messages')
          .insert({
            chat_id: retryChatId,
            user_id: userId,
            role: 'user',
            content: 'retry me please',
            status: 'complete',
          })
          .select('id')
          .single();
        if (userMessageError || !userMessage) {
          throw new Error(`failed to seed user message: ${userMessageError?.message}`);
        }
        retryUserMessageId = userMessage.id;

        const { error: assistantError } = await admin.from('messages').insert({
          chat_id: retryChatId,
          user_id: userId,
          role: 'assistant',
          content: '',
          status: 'error',
        });
        if (assistantError) throw new Error(`failed to seed failed assistant row: ${assistantError.message}`);
      });

      await t.step('retry after a failed row succeeds and drops the failed row', async () => {
        const { status, events } = await sendChat({
          chatId: retryChatId,
          text: 'retry me please',
          retryOfMessageId: retryUserMessageId,
        });
        assert.equal(status, 200);
        const doneEvent = events.find((e) => e.event === 'done');
        assert.ok(doneEvent, 'expected a done event after a valid retry');
        const done = doneEvent!.data as { status: string };
        assert.equal(done.status, 'complete');

        const { data: rows, error } = await admin
          .from('messages')
          .select('role, status')
          .eq('chat_id', retryChatId)
          .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        // The seeded 'error' row must be gone, replaced by exactly one new
        // successful assistant reply after the reused user message.
        assert.equal(rows?.length, 2, `expected exactly [user, assistant], got: ${JSON.stringify(rows)}`);
        assert.equal(rows?.[0]?.role, 'user');
        assert.equal(rows?.[1]?.role, 'assistant');
        assert.equal(rows?.[1]?.status, 'complete');
      });

      // --- 4. retry when the last assistant row is already complete -----
      await t.step('setup: seed a chat with an already-complete assistant row', async () => {
        const { data: chat, error: chatError } = await admin
          .from('chats')
          .insert({ user_id: userId, title: null })
          .select('id')
          .single();
        if (chatError || !chat) throw new Error(`failed to seed chat: ${chatError?.message}`);
        retryChatId = chat.id;

        const { data: userMessage, error: userMessageError } = await admin
          .from('messages')
          .insert({
            chat_id: retryChatId,
            user_id: userId,
            role: 'user',
            content: 'already answered',
            status: 'complete',
          })
          .select('id')
          .single();
        if (userMessageError || !userMessage) {
          throw new Error(`failed to seed user message: ${userMessageError?.message}`);
        }
        retryUserMessageId = userMessage.id;

        const { error: assistantError } = await admin.from('messages').insert({
          chat_id: retryChatId,
          user_id: userId,
          role: 'assistant',
          content: 'Already answered this one.',
          status: 'complete',
        });
        if (assistantError) throw new Error(`failed to seed completed assistant row: ${assistantError.message}`);
      });

      await t.step('retry when the last assistant row is already complete -> 400; usage unchanged', async () => {
        const before = await usageCount();
        const { status, json } = await sendChat({
          chatId: retryChatId,
          text: 'already answered',
          retryOfMessageId: retryUserMessageId,
        });
        assert.equal(status, 400);
        assert.deepEqual(json, { error: 'bad_request' });
        const after = await usageCount();
        assert.equal(after, before, 'usage_daily.message_count must not change for a rejected retry');
      });

      // --- 5. daily free cap -----------------------------------------------
      await t.step('daily free cap: the 6th successful send returns a cap event', async () => {
        // 2 successful sends have already happened above (the happy path
        // and the valid retry) — 3 more plain sends reach the
        // FREE_DAILY_MESSAGES=5 local cap, and the next one after that must
        // be capped instead of generating a reply.
        for (let i = 0; i < 3; i++) {
          const { status, events } = await sendChat({ text: `filler message ${i}` });
          assert.equal(status, 200);
          assert.ok(events.some((e) => e.event === 'done'), `filler send ${i} should succeed`);
        }

        const count = await usageCount();
        assert.equal(count, 5, `expected exactly 5 counted messages before the cap, got ${count}`);

        const { status, events } = await sendChat({ text: 'one too many' });
        assert.equal(status, 200); // the cap is an SSE event, not an HTTP error status
        assert.equal(events.length, 1, `expected only a cap event, got: ${JSON.stringify(events)}`);
        assert.equal(events[0]!.event, 'cap');
        assert.deepEqual(events[0]!.data, { remaining: 0 });

        const after = await usageCount();
        assert.equal(after, 5, 'a capped request must not increment usage further');
      });
    } finally {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error('chat-send_test: failed to delete test user during cleanup', deleteError.message);
      }
    }
  },
});

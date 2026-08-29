# Phase 3 — Daily Quote, Sharing, Forecast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every user gets a personalised quote every day (30-day batches generated from her numbers, goals and that day's cycle), sees it on a real Home screen with her personal day/month, can share it (and her numbers) as an Instagram-ready image, keeps a 30-day archive, and can opt into a daily push — all working locally on the mock provider.

**Architecture:** `AiProvider.complete` grows structured-output support (Anthropic `messages.parse` + `zodOutputFormat`; mock returns schema-valid data). A `quotes-generate` edge function fills `daily_quotes` for the next 30 days and is triggered by the app (after onboarding, and whenever Home sees < 7 future quotes — no cron dependency locally). Home reads `today_quote()`; the archive reads `daily_quotes`. Sharing renders `QuoteCard` (story/square) or a new `NumbersCard` off-screen with `react-native-view-shot` and hands the PNG to `expo-sharing` (web: download link). Push: `expo-notifications` token registration + time preference + a `push-daily` function that selects users whose local hour matches and calls the Expo push API; scheduling SQL is shipped but activated on the hosted project in Phase 5.

**Tech Stack:** as Phase 2, plus `react-native-view-shot`, `expo-sharing`, `expo-notifications`, `expo-device` (all Expo Go compatible on SDK 54; remote push in Expo Go works on iOS, not Android — documented).

**Spec:** `docs/PRD.md` (F3 daily quote, §7 quote generation), `docs/ARCHITECTURE.md` (§5 `quotes-generate`/`push-daily`, §8 daily quote + share flows), `docs/design/tokens.md`, mockups `Main`, `Archive`, `Share`, `Notifications`.

## Global Constraints

- All Phase 1–2 constraints hold (TS strict, `src/ui` only, logical spacing, no raw hex in screens, i18n keys in BOTH `en.json`/`he.json` with natural feminine Hebrew, one commit per task, never commit `.superpowers/`, `.env.local`, `_vendor/`).
- **Provider abstraction:** `AiProvider.complete(args)` gains `effort?: 'low'|'medium'|'high'`, `schema?: ZodSchema` (when given, returns `{ data }` parsed/validated; Anthropic uses `client.messages.parse` with `output_config: { format: zodOutputFormat(schema) }` and treats `parsed_output === null` as an error; mock returns deterministic schema-valid data keyed by the schema's shape — detect by a `kind` string the caller passes: `kind: 'quotes'|'memory'|'title'|'compat'`). `GEN_MODEL` env (default `claude-sonnet-5`), `effort: 'medium'`, `maxTokens: 8192` for quotes. Spend recorded via `add_spend` for every call.
- **Quote batch (D8):** 30 days per generation starting today (skip dates that already exist); regenerate future quotes when the profile changes (`profiles.updated_at` newer than the batch's `created_at` → delete future rows and regenerate); top up when < 7 future quotes remain. Each quote: ≤ 200 characters, no emojis, no names other than the user's first name, theme = one of the user's goals rotating, language = profile language, in Eden's voice (persona prefix reused). Fallback pool guarantees Home is never empty.
- **SSE not used here** — `quotes-generate` returns JSON `{ generated, skipped, total }`.
- **Share images:** 1080×1920 (story) and 1080×1080 (square) PNGs rendered from the design-system cards; the card carries `@eden__harush__ · Gan Eden`. Mark `daily_quotes.shared_at` on a successful share (RLS allows updating only that column).
- **Push:** Expo push token stored in `push_tokens` with `notify_time` (default 08:00) and `tz` (device); `push-daily` selects users whose `notify_time` hour == current hour in their tz and sends `{ title: t('push.title'), body: <today's quote text> }`; idempotent per user per day (`push_log` table). Never send without a stored, valid token.
- **Rulings (2026-08-28):** (R1) app-triggered generation/top-up instead of pg_cron locally; cron SQL committed but commented, enabled in Phase 5. (R2) Cycle (personal day/month) meanings are draft copy seeded into `content_meanings` (types `personal_day`, `personal_month`, values 1–9, EN+HE, `approved=false`) — the `number_type` check constraint is widened by migration. (R3) Web share = download the PNG (`<a download>` via a blob) since the Web Share API can't be relied on. (R4) Push on Android in Expo Go is unsupported — the opt-in screen still stores the preference; the token registration is skipped with a note.

---

## File map

```
supabase/functions/_shared/ai.ts                 complete() with schema/effort (+ tests)
supabase/functions/_shared/quotes.ts             buildQuotePlan(profile, existingDates, today) → dates+cycles+themes; QuoteBatchSchema
supabase/functions/quotes-generate/index.ts      POST {mode?: 'topup'|'regenerate'} → JSON
supabase/functions/push-daily/index.ts           POST (service secret) → {sent, skipped}
supabase/functions/_shared/push.ts               selectCandidates, sendExpoPush (+ tests)
supabase/migrations/0004_quotes_push.sql         content_meanings type widening + seed cycle meanings; push_log; quotes helper fn `future_quote_count(p_user)`; commented cron
packages/prompts/src/quotes.ts                   buildQuotesPrompt(ctx, plan) + QuoteBatchSchema (+ test)
packages/prompts/src/system.ts                   (reuse stablePrefix for quotes)
supabase/functions/chat-send_test.ts             contract test (integration, skipped without SUPABASE_URL)
apps/mobile/src/features/quotes/                 useTodayQuote, useQuoteArchive, useEnsureQuotes (top-up trigger), api.ts
apps/mobile/src/features/share/                  renderCard(ref) → PNG uri, shareImage(uri), useShareQuote
apps/mobile/src/features/push/                   registerPushToken, usePushPreference
apps/mobile/src/ui/NumbersCard.tsx               share card for "my numbers"; QuoteCard gets `theme` caption
apps/mobile/app/(tabs)/home/_layout.tsx, index.tsx, archive.tsx, share.tsx
apps/mobile/app/(onboarding)/notifications.tsx   opt-in step after reveal (time picker + allow / not now)
apps/mobile/app/(tabs)/me/notifications.tsx      change time / toggle
apps/mobile/src/lib/i18n/{en,he}.json            quotes.*, share.*, push.*, forecast.*
docs/ARCHITECTURE.md, README.md, roadmap         updates
```

---

### Task 1: Provider structured output + `chat-send` contract test

**Files:** modify `_shared/ai.ts` (+ `ai_test.ts`); create `supabase/functions/chat-send_test.ts`.
- `complete<T>(args: { system: string; user: string; maxTokens: number; effort?: 'low'|'medium'|'high'; schema?: z.ZodType<T>; kind?: 'memory'|'title'|'quotes'|'compat'; signal? }): Promise<{ text: string; data?: T; inputTokens; outputTokens; model }>`. Anthropic: with `schema` → `client.messages.parse({ model, max_tokens, system, messages, thinking: {type:'adaptive'}, output_config: { effort, format: zodOutputFormat(schema) } })`, `parsed_output === null` → throw `ProviderError('parse')`; without schema → `messages.create` as today. Mock: with `schema`+`kind` → deterministic data (`quotes`: one quote per requested date built from theme + day number + first name, ≤200 chars; `memory`/`title` as today; `compat` placeholder), validated with the schema before returning. Update `memory.ts` and `chat-send` title call to pass `schema`/`kind` and drop the hand-rolled fence stripping. Deno tests for both.
- `chat-send_test.ts` (Deno, integration): skipped unless `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY`+`SUPABASE_ANON_KEY` env are set; creates a test user via `auth.admin.createUser({ email, password, email_confirm: true })`, inserts a profile, signs in with password for a JWT, then hits `${SUPABASE_URL}/functions/v1/chat-send`: happy path (meta/delta/done), 404 foreign chat (usage unchanged), retry-after-failed-row (seed an assistant `error` row) → success, retry when last is `complete` → 400, cap after 5 → `cap` event; cleans up the user. Document the command in README (`pnpm functions:serve` must be running).
- Commit `feat(functions): structured-output complete(), chat-send contract test`.

### Task 2: Migration + quote plan + prompts
- `0004_quotes_push.sql`: widen `content_meanings.number_type` check to include `personal_day`, `personal_month`; seed EN/HE draft meanings 1–9 for both (short, one sentence each, tone per PRD, `approved=false`); `push_log (user_id, date, sent_at, primary key(user_id, date))` RLS service-only; `future_quote_count(p_user uuid) returns int` security definer granted to authenticated (count of `daily_quotes` with `for_date >= current_date` and `p_user = auth.uid()`); commented `cron.schedule('push-daily', '0 * * * *', $$ select net.http_post(...) $$)` block with a note. Apply live; `pnpm db:types`.
- `packages/prompts/src/quotes.ts`: `QuoteBatchSchema = z.object({ quotes: z.array(z.object({ date: z.string().regex(YYYY-MM-DD), text: z.string().min(20).max(200), theme: z.enum(GOALS) })).min(1).max(31) })`; `buildQuotesPrompt({ language, firstName, numbers, meanings, goals, relationshipStatus, plan: Array<{ date, personalDay, personalMonth, theme }> })` → `{ system (stablePrefix + quote rules: ≤200 chars, no emoji, second person, no names but hers, one thought per quote, vary openings), user (the plan as a list) }`; tests.
- `_shared/quotes.ts`: `buildQuotePlan({ dob, goals, existingDates, today, days=30 })` rotates themes across goals and computes cycles via `personalCycles`; tests (skips existing dates, rotation covers all goals, 30 rows).
- Commit `feat(quotes): migration, quote plan and prompt`.

### Task 3: `quotes-generate` function
- POST with user JWT, body `{ mode?: 'topup' | 'regenerate' }`. Load profile; if `regenerate` (or `profiles.updated_at` > newest future quote's `created_at`) delete future rows (`for_date > current_date`); compute plan from existing dates; if plan empty → `{generated:0, skipped:n, total}`; budget check; `complete({ schema: QuoteBatchSchema, kind:'quotes', effort:'medium', maxTokens: 8192 })`; validate each returned date is in the plan; insert rows (`batch_id` uuid, `prompt_version`, `model`, `theme`, `personal_day`, `language`); `add_spend`; return counts. Errors → JSON 4xx/5xx with codes. Deno unit test for the plan→insert mapping with a fake admin client; live verification via curl through `pnpm functions:serve` (30 rows inserted; second call generates 0; `today_quote` returns a non-fallback row).
- Commit `feat(functions): quotes-generate`.

### Task 4: Home, archive, forecast
- `app/(tabs)/home/` directory (`_layout` Stack, `index.tsx`, `archive.tsx`, `share.tsx` placeholder for T5). Home: greeting (`home.greeting.<morning|afternoon|evening>` by local hour), personal day + month line with the seeded cycle meanings (`useMeanings` keys `personal_day:<n>` / `personal_month:<n>`), `QuoteCard variant="inline"` from `useTodayQuote()` (rpc `today_quote`) with theme caption and a "fallback" hint when `is_fallback`, Share `Button` → `share`, "Ask Eden" row, "Archive" link. `useEnsureQuotes()`: on Home mount and after onboarding's calculating step, if `future_quote_count` < 7 → call `quotes-generate` (topup) via `fetch` with the session JWT; show nothing while running. Archive: last 30 `daily_quotes` (`for_date <= today` desc) as small cards, tap → share. i18n keys for all copy.
- Verify on web (controller clicks) and typecheck/test/lint. Commit `feat(mobile): home with daily quote, forecast line and archive`.

### Task 5: Share
- `src/features/share/`: `captureCard(ref, { width, height })` via `react-native-view-shot` (`captureRef`, format png, result `tmpfile` native / `data-uri` web); `shareImage(uri, filename)` → `expo-sharing` (`isAvailableAsync` → `shareAsync(uri, { mimeType: 'image/png', dialogTitle })`), web → programmatic download; `useShareQuote(quote)` orchestrates + marks `shared_at` (`supabase.from('daily_quotes').update({ shared_at })`). `share.tsx`: Story/Square toggle (`Choice`-style chips), an off-screen (absolutely positioned, `collapsable={false}`) `QuoteCard variant` at full size + a scaled preview, `Button` `share.cta`. `NumbersCard` (story/square) with the five numbers; entry from Numbers tab header ("Share my numbers"). Analytics hook placeholder (`track('quote_shared')` no-op module).
- Verify on web (download works) — native share can't be verified by the implementer; the user will test on iPhone. Commit `feat(mobile): share quote and numbers cards`.

### Task 6: Push
- Onboarding step `notifications.tsx` after `reveal` (reveal's CTA → notifications → home): time picker (native spinner `mode="time"`, web: `HH:MM` field), "Allow" → `expo-notifications` permission → `getExpoPushTokenAsync({ projectId })` (needs `extra.eas.projectId`? in Expo Go, `getExpoPushTokenAsync` works with the Expo Go project; on Android Expo Go: skip with a note) → upsert `push_tokens` (token, platform, notify_time, tz from `Intl.DateTimeFormat().resolvedOptions().timeZone`); "Not now" stores nothing. `me/notifications.tsx` to change time / re-enable. `push-daily`: service-secret auth (`PUSH_SECRET` env header), select candidates (`push_tokens` joined to today's quote where local hour matches and no `push_log` row today), send via `https://exp.host/--/api/v2/push/send` in batches of 100, write `push_log`, drop tokens on `DeviceNotRegistered`. Deno tests for candidate selection (fake rows across timezones) and the receipt handling; manual live test if the user's iPhone token exists in `push_tokens`.
- Commit `feat(mobile,functions): notification opt-in and push-daily`.

### Task 7: Docs + roadmap
- ARCHITECTURE §5/§8 updated to what exists (app-triggered top-up, push scheduling deferred), README (quotes/push local run, push in Expo Go note), roadmap Phase 3 status. Commit `docs: phase-3 notes`.

---

## Self-review notes
- PRD F3 coverage: 30-day personalised batch ✔ T3; card + share ✔ T5; push at chosen time ✔ T6; archive ✔ T4; fallback pool ✔ (exists) + T4 hint; regenerate on profile change ✔ T3. Ideas added: forecast line (T4), numbers share card (T5).
- Not in Phase 3: real cron activation (Phase 5), Android push in Expo Go (limitation), analytics (Phase 5).

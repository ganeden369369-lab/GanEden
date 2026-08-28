# Gan Eden — Architecture

**Status:** Approved design v1.0 — 2026-08-27
**Companion:** `docs/PRD.md` (product requirements)

---

## 0. Decisions log

| # | Decision | Choice | Notes |
|---|---|---|---|
| D1 | Mobile framework | **Expo (React Native) + TypeScript** | One codebase, OTA updates, strongest AI-assisted dev ecosystem |
| D2 | Backend | **Supabase only** (Postgres, Auth, Storage, Edge Functions, pg_cron, pgmq) | No separate Node service in v1 |
| D3 | DB access | **SQL migrations + generated types + `supabase-js` / `rpc()`**; no ORM | Drizzle if a Node service is ever added |
| D4 | Chat model | **`claude-sonnet-5`** to start; `CHAT_MODEL` is per-environment config | Upgrade to `claude-opus-5` when evals justify; re-run voice evals on switch |
| D5 | Free tier | **5 chat messages/day**, then paid packages (P1, undefined) | Global daily spend kill-switch included |
| D6 | Region | **Supabase EU (Frankfurt)** | Israel is the launch market; GDPR-ready for worldwide later |
| D7 | Instagram | **System share sheet only in v1** (`expo-sharing`); direct-to-Stories later | Keeps us on Expo Go for v1 iteration speed |
| D8 | Quote batch | **30 days** per generation; prompt changes affect only the next batch | Regenerate when < 7 remain or profile changes |
| D9 | Chat deletion | **Does not touch memory** | Memory facts have no cascade from chats |
| D10 | Engine inputs | **Full name + date of birth** (per the Mentor's method) | Exact rules pending working session with the Mentor |
| D11 | Navigation | 4 tabs: Home / Chat / Numbers / Me | |
| D12 | Styling | Inline styles + design tokens (`src/ui/tokens.ts`); no CSS-in-JS | |
| D13 | Payments | Out of v1; `entitlements` table + RevenueCat in P1 | |

---

## 1. System overview

```
┌─────────────────────────────────┐        ┌──────────────────────────────────────────┐
│  Expo app (iOS / Android)       │  HTTPS │  Supabase (EU)                           │
│  - Expo Router, inline tokens   │◄──────►│  Auth · Postgres (RLS) · Storage         │
│  - supabase-js (RLS)            │  SSE   │  Edge Functions (Deno)                   │
│  - numerology engine (local)    │◄───────│    chat-send · quotes-generate ·         │
│  - expo-notifications           │        │    compatibility-generate ·              │
│  - expo-sharing                 │        │    push-daily · delete-account           │
└─────────────────────────────────┘        │                                          │
                                           │  pg_cron + pgmq (jobs)                   │
                                           └──────────────┬───────────────────────────┘
                                                          │ @anthropic-ai/sdk
                                                          ▼
                                                  Anthropic API (Claude)
                                           Expo Push service (notifications)
```

Principles:
- **The app never holds secrets.** Anthropic key, prompts, and service role live only in edge functions.
- **Numerology math is deterministic code**, shared between app (instant display, offline) and server (generation). LLMs receive numbers; they never compute them.
- **Every generated artifact is stamped** with `engine_version`, `prompt_version`, `model` so we can reason about regeneration.
- **RLS is the security boundary** for all user data; edge functions use the user's JWT where possible and the service role only for cross-user jobs.

---

## 2. Repository layout (pnpm monorepo)

```
gan-eden/
├── apps/mobile/                 Expo app
│   ├── app/                     Expo Router routes: (onboarding)/, (tabs)/home, chat, numbers, me
│   │   └── dev/gallery.tsx      Design-system component gallery (dev-only route)
│   ├── src/ui/                  Design-system primitives (Button, Card, Text, tokens, ...)
│   ├── src/components/          Feature components built on src/ui
│   ├── src/features/            onboarding, chat, quotes, numbers, compatibility, settings
│   ├── src/lib/                 supabase client, i18n, analytics, theme tokens
│   └── src/hooks/               TanStack Query hooks per feature
├── packages/numerology/         Pure TS engine (zero deps). Vitest, ≥ 95 % coverage
├── packages/shared/             zod schemas + TS types shared by app & functions
├── packages/prompts/            Mentor persona, prompt templates, eval golden set + runner
├── supabase/
│   ├── migrations/              SQL: schema, RLS, functions, cron, queues
│   ├── functions/               Deno edge functions
│   │   ├── _shared/             supabase clients, SSE framing, AI-provider abstraction, chat context, memory extraction
│   │   ├── _vendor/             packages/* copied in for local `functions serve` (git-ignored build artifact — see §5)
│   │   └── chat-send/           implemented (§5); quotes-generate, compatibility-generate, push-daily, delete-account are future phases
│   ├── seed.sql                 content_meanings, fallback quotes, prompt_versions
│   └── config.toml
├── scripts/                     vendor-functions.mjs (copies packages/* into supabase/functions/_vendor)
├── assets/brand/                Logo, mentor photo (source assets)
└── docs/                        PRD, ARCHITECTURE, specs, plans
```

Tooling: pnpm workspaces, TypeScript strict everywhere, ESLint + Prettier, Husky pre-commit (typecheck + lint on staged packages). Edge functions import `packages/*` via `deno.json` import map paths.

---

## 3. Mobile app

### 3.1 Stack

| Concern | Choice |
|---|---|
| Runtime | Expo SDK (latest stable), **Expo Go for v1** (no custom native modules — see D7); the Expo web target (`expo start --web`) is also enabled, for visual review only — not a release target |
| Navigation | Expo Router (file-based, typed routes) |
| Styling | Inline styles from `src/ui/tokens.ts` via the design-system primitives in `src/ui` (NativeWind removed in Phase 2, unused), in the brand's rose-gold gradient accent, blush surfaces, and cream backgrounds (dark = plum/mocha) |
| Motion | `react-native-reanimated` + `react-native-gesture-handler` (both in Expo Go) |
| Server state | TanStack Query wrapping `supabase-js`; optimistic updates for chat |
| Local state | Zustand (onboarding draft, UI prefs) |
| Auth | Supabase Auth — Sign in with Apple, Google, email magic link; session persisted in AsyncStorage (Supabase's documented RN adapter; SecureStore's 2 KB limit breaks session JSON) — revisit with an encrypted-storage adapter in Phase 5 |
| Streaming | `expo/fetch` reading SSE from `chat-send` |
| i18n | `i18next` + `react-i18next` + `expo-localization`; HE and EN resource files; `I18nManager.forceRTL` + reload on language change |
| Fonts | `expo-font`; HE/EN pairs: sans **Heebo**; display serif **Frank Ruhl Libre** (HE) / **Cormorant Garamond** (EN) — replace with brand fonts when supplied |
| Quote card | `react-native-view-shot` (Expo Go compatible) renders the card component at 1080×1920 and 1080×1080 |
| Sharing | `expo-sharing` → OS share sheet (user picks Instagram) |
| Push | `expo-notifications`; Expo push tokens stored server-side |
| Observability | `@sentry/react-native` (crashes), PostHog (events: onboarding steps, quote_shared, chat_message_sent, cap_hit) |
| Release | EAS Build (preview / production), EAS Update for OTA JS |

### 3.2 Screens → routes

```
app/
├── (auth)/welcome.tsx
├── (onboarding)/language | about | status | goals | calculating | reveal | notifications
├── (tabs)/
│   ├── home.tsx              today's quote card, share, greeting, personal day, "Ask Eden"
│   ├── chat/index.tsx        chat list (the Chat tab's index — R4)
│   ├── chat/new.tsx          new chat: posts the first message with no chatId, then replaces the route with the created chat's id
│   ├── chat/[id].tsx         conversation
│   ├── numbers/index.tsx     profile numbers + compatibility list
│   ├── numbers/compat/new.tsx | [id].tsx
│   └── me/index.tsx | memory.tsx   profile summary; memory.tsx = "What Eden remembers" (profile edit, archive, language, notifications: not yet built)
```

### 3.3 RTL rules
- Only logical style props (`ps/pe`, `start/end`, `flex-row` auto-mirrors under RTL).
- Icons with direction (back arrows, chevrons) use an `<Icon flipInRtl />` wrapper.
- Screenshots of every screen in both directions are part of the definition of done.

---

## 4. Data model (Postgres)

All user tables carry `user_id uuid references auth.users` with RLS `user_id = auth.uid()`.

```sql
profiles            user_id PK, full_name text, full_name_script text ('he'|'latin'),
                    dob date, language text ('he'|'en'), relationship_status text,
                    goals text[], numbers jsonb, engine_version text,
                    created_at, updated_at

chats               id PK, user_id, title text, archived bool, last_message_at
messages            id PK, chat_id FK (cascade), user_id, role ('user'|'assistant'),
                    content text, status ('complete'|'partial'|'error'),
                    input_tokens int, output_tokens int, model text,
                    prompt_version text, created_at

memory_facts        id PK, user_id, category ('person'|'situation'|'preference'),
                    text text, source_chat_id uuid NULL (no FK cascade — D9),
                    last_referenced_at, created_at
memory_summaries    user_id PK, summary text, facts_hash text, updated_at

daily_quotes        id PK, user_id, for_date date, language, text, theme text,
                    personal_day int, batch_id uuid, prompt_version, model,
                    shared_at timestamptz NULL,  UNIQUE (user_id, for_date)
quote_fallbacks     id, language, text, theme     -- seeded generic pool

partners            id PK, user_id, label text, full_name, full_name_script, dob,
                    numbers jsonb, engine_version
compatibility_readings
                    id PK, user_id, partner_id FK (cascade), language,
                    numbers jsonb, narrative jsonb, engine_version, prompt_version,
                    model, created_at

usage_daily         user_id, date, message_count int,  PK (user_id, date)
spend_daily         date PK, usd numeric                -- global kill-switch input

content_meanings    number_type text, value int, language, title, body,
                    PK (number_type, value, language)
prompt_versions     id, kind ('mentor'|'quotes'|'compat'|'memory'|'title'),
                    version text, body text, active bool

push_tokens         user_id, token text, platform, notify_time time, tz text,
                    PK (user_id, token)

entitlements        user_id PK, tier text, source text, expires_at   -- P1
```

Postgres functions (called via `rpc()`):
- `check_and_increment_usage(p_user, p_limit default 5)` — atomic cap check (D5); returns remaining. `chat-send` passes `p_limit` from the `FREE_DAILY_MESSAGES` function env var (migration `0003_usage_limit.sql`; the limit used to be a constant in the function body, which made the env var a no-op).
- `add_spend(p_usd)` — adds to today's `spend_daily` row (service role only).
- `today_quote(user_id)` — today's quote or a fallback if missing.
- `push_candidates(hour_utc)` — users whose local `notify_time` falls in this hour.

Jobs: `pg_cron` schedules `push-daily` hourly and `quotes_topup` daily (users with < 7 future quotes). Memory extraction is **not** queued in Phase 2 — it runs in-process at the end of a `chat-send` turn (ruling R1, §5); a `pgmq` `memory_extract` queue is deferred until message volume justifies one. `quotes_generate` is planned as a `pgmq` queue in Phase 3.

---

## 5. Edge functions (Deno, TypeScript, `@anthropic-ai/sdk`)

| Function | Auth | Flow |
|---|---|---|
| `chat-send` | user JWT | **Implemented.** Auth (`getUser(req)`, 401 if invalid) → validate the body (400 if text is empty/too long or `chatId`/`retryOfMessageId` aren't UUIDs) → verify the caller owns `chatId` (404 otherwise) → validate `retryOfMessageId` (400 unless it names the caller's most recent `role:'user'` row in that chat, the text matches exactly, and every row after it is a *failed* assistant row — `status` `'error'` or `'partial'`) → load context → global budget via `spend_daily.usd` vs `DAILY_BUDGET_USD` (SSE `error{code:'budget'}` if tripped) → cap via `check_and_increment_usage(p_user, p_limit)` (rpc, service role; `-1` remaining → SSE `cap`, HTTP 200, never generates) → delete the failed assistant rows this retry replaces, create the chat if none was named, and insert the user's message (a retry reuses the existing row instead of inserting a duplicate) → open the SSE response and stream the provider's reply (`delta` per chunk) → persist the assistant message (`complete` / `partial` on client disconnect / `error`) → record spend via `add_spend` (rpc) → SSE `done` → `EdgeRuntime.waitUntil(afterTurn)` (or `await` it directly when `EdgeRuntime` isn't present, e.g. under `functions serve`): titles the chat if untitled, then extracts memory facts + rebuilds the summary for the exchange (both are provider calls, and both add their own estimated spend). **The ordering matters:** everything that can still answer 404/400/500 runs *before* the cap is consumed and before any row is created or deleted, so a rejected request never burns a message off the user's daily allowance. |
| `memory-extract` | — | **Not a separate function in Phase 2.** Ruling R1 (2026-08-28): memory extraction runs in-process, inside `chat-send`'s post-response `afterTurn` step (`_shared/memory.ts`'s `extractAndStoreMemory`), not as a queued `pgmq` job — pgmq is deferred until message volume justifies a queue; revisit then. Cost of this choice: extraction latency shares `chat-send`'s own CPU budget rather than running on a separate worker. |
| `quotes-generate` | user JWT / service | Phase 3 — not yet built. Planned: load profile → 30 dates × engine numbers → one structured-output call → insert `daily_quotes` (skip existing dates); on failure leave gaps for `today_quote` fallback |
| `compatibility-generate` | user JWT | Phase 4 — not yet built. Planned: engine numbers for both → structured narrative → insert reading |
| `push-daily` | service (cron) | Phase 3 — not yet built. Planned: `push_candidates` → Expo Push API in batches of 100 |
| `delete-account` | user JWT | Phase 5 — not yet built. Planned: delete `auth.users` row (cascades) + storage objects |

**Provider abstraction:** `_shared/ai.ts` exports an `AiProvider` interface (`streamChat` for the SSE-streamed chat turn, `complete` for the non-streaming title/memory-extraction calls) and `getProvider(env)`, selected by the `AI_PROVIDER` function env var: `mock` (default; a deterministic, network-free provider used for local dev and all automated tests) or `anthropic` (`@anthropic-ai/sdk`). Other function env vars: `CHAT_MODEL` / `GEN_MODEL` (model ids, both default `claude-sonnet-5`), `DAILY_BUDGET_USD` (default 20, the global kill-switch threshold), `FREE_DAILY_MESSAGES` (the per-user daily cap, passed to `check_and_increment_usage(p_user, p_limit)` on every call — the function's own default is 5). The `anthropic` path follows the SDK's documented shape exactly — `client.messages.stream({ model, max_tokens, system: [stablePrefix with cache_control:{type:'ephemeral'}, userBlock], messages, thinking:{type:'adaptive'}, output_config:{effort:'low'} })`, iterating `content_block_delta`/`text_delta` and calling `stream.finalMessage()` for usage + `stop_reason`, with `stop_reason:'refusal'` mapped to the Mentor-voice fallback text — but it is **implemented, not executed**: no Anthropic API key is available in this environment, so it's reviewed against the SDK reference rather than run against the real API.

**SSE contract** (`text/event-stream`, one JSON object per `data:` line):

| Event | Payload | When |
|---|---|---|
| `meta` | `{chatId, userMessageId, assistantMessageId: null, remaining}` | first frame, before any provider text |
| `delta` | `{text}` | zero or more, as the provider streams |
| `done` | `{status: 'complete' \| 'partial', assistantMessageId, title: null}` | terminal, on success |
| `cap` | `{remaining: 0}` | terminal, sent instead of generating when the daily cap is already exhausted |
| `error` | `{code: 'budget' \| 'provider', message}` | terminal. `budget` is sent *before* any generation (it's the only frame in that response); `provider` is sent *during* generation, after `meta` and any `delta`s |

`auth`, `bad_request` and `not_found` never appear as SSE frames — invalid/missing auth returns a plain `401 {error:'auth'}`, a malformed or invalid body (including an invalid `retryOfMessageId`) a plain `400 {error:'bad_request'}`, a chat the caller doesn't own a plain `404 {error:'not_found'}`, and an internal failure a plain `500 {error:'internal'}`, all as JSON before the SSE stream opens. Only `budget` (global spend cap tripped) and `provider` (generation failed) are sent as in-stream SSE `error` frames.

**Running `chat-send` locally:** `supabase functions serve` bind-mounts only `supabase/functions` into its runtime container — an import-map entry that escapes that directory (e.g. `../../packages/x/src/...`) never resolves there, even though it resolves fine for a host-side `deno check`. `pnpm functions:vendor` (`scripts/vendor-functions.mjs`) copies `packages/{shared,prompts,numerology}/src` into `supabase/functions/_vendor/` so the `deno.json` import map's `@gan-eden/*` specifiers resolve to in-tree files inside the mount; `_vendor/` is git-ignored (regenerated on demand, never hand-edited). `pnpm functions:serve` runs the vendor step and then `supabase functions serve --env-file supabase/functions/.env.local`.

---

## 6. AI layer

**Models:** `CHAT_MODEL=claude-sonnet-5` (D4), `GEN_MODEL=claude-sonnet-5` for quotes/compatibility/memory. Adaptive thinking; `effort: "low"` for chat, `"medium"` for generation. Max tokens: chat 1,024; generation 8,192.

**Prompts** live in `packages/prompts` (pure TS, zero deps except zod; imported by both Vitest and, via the vendored copy, the edge functions). `persona.ts` exports `PERSONA_VERSION = 'draft-0.1'` — the persona is a **draft**, written only from PRD §3 tone rules, pending Eden's voice samples and do/don't list; it invents no biographical facts about her. `system.ts`'s `buildSystemPrompt()` returns `{ stablePrefix, userBlock }`: `stablePrefix` (persona, method summary, safety rules, numerology meanings) is the cacheable stable prefix sent with `cache_control:{type:'ephemeral'}`; `userBlock` (name, numbers, cycles, status, goals, memory summary, today's date) varies per turn and is sent uncached. `memory.ts`'s `MemoryExtractionSchema` (zod) validates the JSON a memory-extraction call returns before any fact is inserted — a schema-validation failure is logged and that turn's extraction is skipped rather than persisting malformed data.

**Prompt assembly (cache-friendly order):**
1. Static prefix — persona, voice samples, method summary, safety rules, all `content_meanings` for the language → `cache_control` breakpoint.
2. User block — numbers + meanings, today's numbers, status, goals, memory summary.
3. Recent messages of the current chat (last ~30 or ~6k tokens).

Monitor `usage.cache_read_input_tokens`; a zero across calls is a bug.

**Structured outputs** (`output_config.format` + zod schemas from `packages/shared`) for quotes (`{date, text, theme}[]`), memory extraction (`{facts[], summary}`), compatibility (`{score, strengths[], frictions[], advice}`), chat titles.

**Prompt versioning:** templates live in `packages/prompts`, seeded into `prompt_versions`; functions load the `active` row per kind. Generated rows store `prompt_version` + `model`.

**Evals:** `packages/prompts/evals/` — 30 chat prompts, 20 quote profiles, 10 compatibility pairs with Mentor-approved reference answers; `pnpm eval` runs them and writes a diff report. Required on any prompt or model change (D4).

**Cost guardrails:** per-user cap (D5); `spend_daily` updated from usage on every call; `chat-send` refuses when `spend_daily.usd > DAILY_BUDGET_USD`. Estimate at Sonnet 5: chat ≈ $0.004–0.008/message; 30-quote batch ≈ $0.02/user.

**Safety:** system prompt rules (no diagnosis, no deterministic predictions, no endorsing abusive situations); crisis keyword pre-check in `chat-send` adds localized helplines (IL + intl) to the response and flags the message.

---

## 7. Numerology engine (`packages/numerology`)

- Inputs: `fullName` + `script` (`he` | `latin`), `dob`, and a `date` for personal cycles (D10).
- API: `computeProfile()`, `personalCycles()`, `compatibility()`; all pure, table-driven.
- Letter-value tables and reduction rules are data files authored from the Mentor's method; each rule has a test derived from an example she confirms.
- `ENGINE_VERSION` constant exported; stored on every profile/partner/quote.
- Used in-app for the instant reveal and offline display; on server for generation.

---

## 8. Key flows

**Onboarding** — collect → local engine computes numbers → `profiles` upsert → app calls `quotes-generate` (fire-and-forget) during "Calculating…" → Numbers reveal → Home (`today_quote` returns a fallback if the batch hasn't landed).

**Chat** — POST `{chatId?, text, retryOfMessageId?}` (no `chatId` = new chat; all keys camelCase) → ownership/retry validation → context → budget → cap → SSE. The stream is a sequence of named events, one JSON object per `data:` line (§5 has the full table): `meta {chatId, userMessageId, assistantMessageId: null, remaining}` first, then zero or more `delta {text}`, then exactly one terminal frame — `done {status:'complete'|'partial', assistantMessageId, title}` on success, `error {code, message}` on failure, or `cap {remaining:0}` when the daily allowance is already spent. The app appends deltas into its streaming store, and on `done` refetches the chat's messages *before* clearing the streamed text (otherwise the reply blinks out and back in). On client disconnect the server persists whatever streamed as `partial`; the app renders those rows in full with a muted "(cut off)" marker (`chat.partial`) — there is no "Continue" flow. Rows persisted as `status:'error'` are hidden entirely; the error banner + retry button is the whole UI for them. Refusal → fallback message, not an error.

**Memory** — runs in-process at the end of each assistant turn (no queue — see §4/§5); facts dedup case-insensitively and are capped at 100 rows per user (at the cap the summary still refreshes, but no new facts are stored); only the newest 40 fact texts go into the extraction prompt. The stored summary and facts are fenced in the prompts (`<<< … >>>`) and labelled as background information, never instructions, so text the user typed cannot read as prompt directives. Summary rebuilt with a `facts_hash` over all fact texts. Chat deletion leaves memory untouched (D9); the user edits memory from Me → "What Eden remembers".

**Daily quote** — hourly cron → candidates in that local hour → push with quote text. Top-up job keeps ≥ 7 future quotes per user (D8). Profile/goal change → regenerate future quotes only.

**Share** — Home "Share" → off-screen card → PNG → `expo-sharing` → OS sheet; `shared_at` + analytics event.

---

## 9. Error handling

| Failure | Behaviour |
|---|---|
| Cap reached | HTTP 200 with a single SSE frame `cap {remaining:0}` and nothing else — not a 429; app shows Mentor-voice "come back tomorrow" + (P1) upgrade CTA |
| Global budget tripped | HTTP 200 with a single SSE frame `error {code:'budget', message}` — not a 503; app shows the generic error banner |
| Invalid/missing auth · bad body · foreign chat id · internal failure | plain JSON *before* the stream opens: `401 {error:'auth'}` · `400 {error:'bad_request'}` · `404 {error:'not_found'}` · `500 {error:'internal'}` |
| Claude 429/5xx | SDK retries (2); then SSE `error {code:'provider'}`; message saved as `error` (and hidden in the app) or `partial` if text had streamed; app retry button, which re-sends with `retryOfMessageId` so the user's turn isn't duplicated and the failed assistant rows are dropped |
| Client disconnect mid-stream | server finishes/persists `partial`; the app shows the row in full with a muted "(cut off)" marker (no "Continue" flow is built) |
| Quote generation fails | gaps filled by `quote_fallbacks`; top-up job retries daily |
| Push token invalid | Expo receipt `DeviceNotRegistered` → delete token |

---

## 10. Testing

- `packages/numerology`: Vitest, table tests per rule, ≥ 95 % coverage gate.
- `packages/shared`: schema tests (zod parse/round-trip).
- Edge functions: Deno tests for `_shared` (`ai.ts`'s `MockProvider`, `sse.ts`'s SSE framing, `validate.ts`) — `npx -y deno@2 test --allow-env --allow-net --config supabase/functions/deno.json supabase/functions/_shared`. `chat-send` itself is verified by hand against `pnpm functions:serve` (curl + a JWT — see README); not yet covered by an automated contract test.
- App: Jest + React Native Testing Library for hooks/components; Maestro flows: onboarding → reveal → home → new chat → send → share, run on iOS sim + Android emulator, HE and EN.
- Prompts: eval runner (see §6) — required for prompt/model PRs.
- CI (GitHub Actions): lint + typecheck + unit tests on PR; Maestro on `main`; `supabase db push` to staging on merge, prod on tag; EAS preview build on `main`.

---

## 11. Environments & security

| | Local | Staging | Production |
|---|---|---|---|
| Supabase | CLI (`supabase start`) | project `gan-eden-staging` (EU) | project `gan-eden` (EU) |
| App | Expo Go → local API | EAS preview | EAS production |
| Secrets | `.env.local` | Supabase function secrets | Supabase function secrets |

- Anthropic key, service role only in function secrets. `CHAT_MODEL`, `GEN_MODEL`, `DAILY_BUDGET_USD`, `FREE_DAILY_MESSAGES` are function env vars.
- Data: names, DOB, chats are personal data → EU region (D6), encrypted at rest, hard delete on request, privacy policy discloses Anthropic processing (30-day retention).
- 18+ gate at onboarding.

---

## 12. Later (designed for, not built)

- **Payments (P1):** RevenueCat SDK in app (needs a dev build), webhook → `entitlements`; `check_and_increment_usage` reads tier.
- **Direct-to-Stories:** `react-native-share` + dev build (D7).
- **Human mentor:** `messages.role = 'mentor'` + a Next.js dashboard on the same Supabase; Drizzle if it needs server code.
- **Model upgrade:** flip `CHAT_MODEL` (D4) after evals.

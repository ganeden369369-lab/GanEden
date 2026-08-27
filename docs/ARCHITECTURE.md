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
| D12 | Styling | NativeWind v4 + design tokens | |
| D13 | Payments | Out of v1; `entitlements` table + RevenueCat in P1 | |

---

## 1. System overview

```
┌─────────────────────────────┐        ┌──────────────────────────────────────────┐
│  Expo app (iOS / Android)   │  HTTPS │  Supabase (EU)                           │
│  - Expo Router, NativeWind  │◄──────►│  Auth · Postgres (RLS) · Storage         │
│  - supabase-js (RLS)        │  SSE   │  Edge Functions (Deno)                   │
│  - numerology engine (local)│◄───────│    chat-send · quotes-generate ·         │
│  - expo-notifications       │        │    compatibility-generate ·              │
│  - expo-sharing             │        │    memory-extract · push-daily ·         │
└─────────────────────────────┘        │    delete-account                        │
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
│   ├── functions/               Deno edge functions (+ _shared/ for client setup)
│   ├── seed.sql                 content_meanings, fallback quotes, prompt_versions
│   └── config.toml
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
| Styling | NativeWind v4; tokens in `src/lib/theme.ts` (colors from the brand: rose-gold gradient accent, blush surfaces, cream backgrounds; dark = plum/mocha) |
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
├── (onboarding)/language | name | birthday | status | goals | calculating | reveal | notifications
├── (tabs)/
│   ├── home.tsx              today's quote card, share, greeting, personal day, "Ask Eden"
│   ├── chat/index.tsx        chat list
│   ├── chat/[id].tsx         conversation
│   ├── numbers/index.tsx     profile numbers + compatibility list
│   ├── numbers/compat/new.tsx | [id].tsx
│   └── me/index.tsx | profile | memory | archive | language | notifications
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
- `check_and_increment_usage(user_id)` — atomic cap check (D5); returns remaining.
- `today_quote(user_id)` — today's quote or a fallback if missing.
- `push_candidates(hour_utc)` — users whose local `notify_time` falls in this hour.

Jobs: `pgmq` queues `memory_extract`, `quotes_generate`; `pg_cron` schedules `push-daily` hourly and `quotes_topup` daily (users with < 7 future quotes).

---

## 5. Edge functions (Deno, TypeScript, `@anthropic-ai/sdk`)

| Function | Auth | Flow |
|---|---|---|
| `chat-send` | user JWT | validate → `check_and_increment_usage` (429 + friendly body if 0 left; also 503 if global spend kill-switch tripped) → build context → stream Claude → forward SSE deltas → persist assistant message (`partial` if client disconnected) → enqueue `memory_extract` |
| `memory-extract` | service (queue) | load new messages since last run → structured-output extraction → upsert `memory_facts` (dedupe by normalized text) → rebuild `memory_summaries` (≤ ~1.5k tokens) → auto-title chat if untitled |
| `quotes-generate` | user JWT / service | load profile → 30 dates × engine numbers → one structured-output call → insert `daily_quotes` (skip existing dates); on failure leave gaps for `today_quote` fallback |
| `compatibility-generate` | user JWT | engine numbers for both → structured narrative → insert reading |
| `push-daily` | service (cron) | `push_candidates` → Expo Push API in batches of 100 |
| `delete-account` | user JWT | delete `auth.users` row (cascades) + storage objects |

Shared `_shared/anthropic.ts`: client, `CHAT_MODEL` / `GEN_MODEL` from env, streaming helper, refusal handling (`stop_reason: "refusal"` → Mentor-voice fallback text), usage logging into `messages` and `spend_daily`.

---

## 6. AI layer

**Models:** `CHAT_MODEL=claude-sonnet-5` (D4), `GEN_MODEL=claude-sonnet-5` for quotes/compatibility/memory. Adaptive thinking; `effort: "low"` for chat, `"medium"` for generation. Max tokens: chat 1,024; generation 8,192.

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

**Chat** — POST `{chat_id?, text}` (no `chat_id` = new chat) → cap → SSE `{type:'delta'|'done'|'error'|'cap'}` events → app appends deltas; on `done` marks complete; on disconnect server persists `partial` and app offers "Continue". Refusal → fallback message, not an error.

**Memory** — queue job after each assistant turn; facts dedup; summary rebuilt only when `facts_hash` changes. Chat deletion leaves memory untouched (D9); the user edits memory from Me → "What Eden remembers".

**Daily quote** — hourly cron → candidates in that local hour → push with quote text. Top-up job keeps ≥ 7 future quotes per user (D8). Profile/goal change → regenerate future quotes only.

**Share** — Home "Share" → off-screen card → PNG → `expo-sharing` → OS sheet; `shared_at` + analytics event.

---

## 9. Error handling

| Failure | Behaviour |
|---|---|
| Cap reached | `chat-send` 429 with `{remaining:0, resetsAt}`; app shows Mentor-voice "come back tomorrow" + (P1) upgrade CTA |
| Global budget tripped | 503; app shows "Eden is resting, try later" |
| Claude 429/5xx | SDK retries (2); then SSE `error`; message saved as `error`; app retry button |
| Client disconnect mid-stream | server finishes/persists `partial`; app shows "Continue" |
| Quote generation fails | gaps filled by `quote_fallbacks`; top-up job retries daily |
| Push token invalid | Expo receipt `DeviceNotRegistered` → delete token |

---

## 10. Testing

- `packages/numerology`: Vitest, table tests per rule, ≥ 95 % coverage gate.
- `packages/shared`: schema tests (zod parse/round-trip).
- Edge functions: `deno test` with mocked Anthropic client + local Supabase (`supabase start`); contract tests for SSE event shapes.
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

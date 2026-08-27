# Gan Eden

Numerology & relationship mentoring app. Docs: `docs/PRD.md`, `docs/ARCHITECTURE.md`, plans in `docs/superpowers/plans/`.

## App flow
Sign in by email code → onboarding in four steps (Language → About: full name + date of birth → Status → Goals) → Calculating → Numbers reveal → tabs (Home, Eden, Numbers, Me).

## Setup
- Node 24, pnpm 10, [Docker Desktop](https://www.docker.com/products/docker-desktop/) running (required by the Supabase CLI), Expo Go on your phone/simulator.
- `pnpm install`
- `npx -y supabase@latest start` — starts the local Supabase stack (Postgres, Auth, Storage, Studio, Mailpit).
- `npx -y supabase@latest status` — copy the `anon key` into `apps/mobile/.env` (create it from `apps/mobile/.env.example`; it already points at the local API URL).
- `pnpm --filter @gan-eden/mobile start` — then open in Expo Go on your device/simulator.

There's no global Supabase CLI install — every command runs via `npx -y supabase@latest ...`.

## Scripts
- `pnpm test` — all unit tests (`packages/numerology` enforces ≥ 95% coverage via Vitest; `apps/mobile` runs Jest)
- `pnpm typecheck`, `pnpm lint` — run across all workspaces from the root
- `pnpm db:types` — regenerate `packages/shared/src/database.types.ts` after a migration

## Web target (for visual review)
`pnpm --filter @gan-eden/mobile run web` runs the app in a browser. It's a convenience for reviewing UI without a simulator, not a supported release target (see `docs/ARCHITECTURE.md` §3.1, D7). The design-system component gallery is at the `/dev/gallery` route.

## E2E (Maestro)
Onboarding flows live in `apps/mobile/.maestro/` (`./run.sh`). They're hand-checked but unverified on this machine (no Java/Maestro/emulator installed) — see that directory's README for prereqs and details. Wiring them into CI is a Phase 5 task.

## Local services
- API `http://127.0.0.1:54321` · Studio `http://127.0.0.1:54323` · Mailpit (local email) `http://127.0.0.1:54324`

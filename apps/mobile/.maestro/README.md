# E2E: Maestro onboarding flow

Drives the full first-run journey in Expo Go: email -> OTP verify -> the
four onboarding steps (language, about, status, goals) -> calculating ->
reveal -> home.

## Prereqs

- [Maestro](https://maestro.mobile.dev/getting-started/installing-maestro)
  installed (`maestro --version`). Maestro requires Java 17+.
- An Android emulator or iOS simulator running, with **Expo Go open on the
  app** (`pnpm expo start` from `apps/mobile`, then open the project in
  Expo Go on the emulator/simulator).
- Local Supabase running (`npx supabase start`). This also starts
  **Mailpit** (the local SMTP catcher) at `http://127.0.0.1:54324`, which
  `otp.mjs` polls for the OTP email.

## Files

- `01-request-code.yaml` - launches the app, enters a generated email,
  taps "send code", and asserts the code entry screen appears.
- `02-verify-and-onboard.yaml` - continues from the verify screen (no
  `launchApp`, so it doesn't relaunch and lose the pending OTP session):
  enters the OTP, verifies, and taps through all four onboarding steps to
  `home-title`.
- `otp.mjs` - Node script that polls Mailpit's REST API
  (`GET /api/v1/search?query=to:<email>` -> `messages[0].ID` ->
  `GET /api/v1/message/<ID>` -> extracts the 6-digit code from `Text`) up
  to 30s and prints the code to stdout.
- `run.sh` - orchestrates the two flows: generates a unique
  `maestro+<timestamp>@example.com` address, runs flow 1, fetches the OTP
  via `otp.mjs`, then runs flow 2 with that code.

Maestro can't pause mid-flow to shell out for the OTP, which is why the
flow is split into two YAML files rather than one.

## Running

```bash
cd apps/mobile/.maestro
./run.sh
```

Or step by step:

```bash
TS=$(date +%s)
EMAIL="maestro+${TS}@example.com"
maestro test -e EMAIL="$EMAIL" 01-request-code.yaml
OTP=$(node otp.mjs "$EMAIL")
maestro test -e OTP="$OTP" 02-verify-and-onboard.yaml
```

## Notes

- Both flows use `appId: host.exp.exponent` (Expo Go). Switch to
  `co.ganeden.app` when testing a dev/standalone build.
- If the onboarding "continue" button is hidden behind the date spinner on
  a small screen, add `- scrollUntilVisible: { element: { id: continue } }`
  before that tap in `02-verify-and-onboard.yaml`.
- **Unverified on this machine**: this environment has no Java runtime, no
  Maestro install, and no Android emulator/iOS simulator, so these flows
  have not been run end-to-end. The YAML was hand-checked for syntax and
  the testIDs were cross-referenced against the current screens
  (`welcome.tsx`, `verify.tsx`, `language.tsx`, `about.tsx`, `status.tsx`,
  `goals.tsx`, `calculating.tsx`, `reveal.tsx`, `home.tsx`). Run `./run.sh`
  on a machine with Maestro + an emulator/simulator + local Supabase to
  confirm.
- Wiring this into CI (headless emulator, Maestro Cloud or a self-hosted
  runner) is a Phase 5 task.

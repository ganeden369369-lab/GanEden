#!/usr/bin/env bash
# Runs the full onboarding E2E flow against a local Expo Go instance.
#
# Maestro flows can't shell out mid-run to fetch an OTP from Mailpit, so the
# flow is split in two:
#   1. 01-request-code.yaml  - launches the app, submits an email, and stops
#      once the code entry screen is visible.
#   2. 02-verify-and-onboard.yaml - continues from there: enters the OTP
#      (passed in as -e OTP=<code>), verifies, and taps through onboarding.
#
# This script generates a unique email, runs flow 1, fetches the code from
# Mailpit via otp.mjs, then runs flow 2 with that code.
#
# Prereqs: Maestro installed, an Android emulator or iOS simulator running
# with Expo Go open on the app, and local Supabase running (`npx supabase
# start`, which provides Mailpit at http://127.0.0.1:54324).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TS=$(date +%s)
EMAIL="maestro+${TS}@example.com"

echo "==> Requesting code for ${EMAIL}"
maestro test -e EMAIL="${EMAIL}" "${SCRIPT_DIR}/01-request-code.yaml"

echo "==> Fetching OTP from Mailpit"
OTP=$(node "${SCRIPT_DIR}/otp.mjs" "${EMAIL}")
echo "==> Got OTP: ${OTP}"

echo "==> Verifying and running onboarding"
maestro test -e OTP="${OTP}" "${SCRIPT_DIR}/02-verify-and-onboard.yaml"

echo "==> Done"

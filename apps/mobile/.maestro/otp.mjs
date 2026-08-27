#!/usr/bin/env node
// Polls the local Mailpit inbox for the Supabase magic-code email sent to
// `email` (argv[2]) and prints the 6-digit OTP to stdout.
//
// Usage: node otp.mjs <email>
//
// Requires local Supabase to be running (`npx supabase start`), which
// spins up Mailpit at http://127.0.0.1:54324 as the local SMTP catcher.

const MAILPIT_BASE = process.env.MAILPIT_BASE ?? 'http://127.0.0.1:54324';
const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findLatestMessageId(email) {
  const url = `${MAILPIT_BASE}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mailpit search failed: ${res.status} ${res.statusText}`);
  const body = await res.json();
  const messages = body.messages ?? [];
  if (messages.length === 0) return null;
  return messages[0].ID;
}

async function fetchMessageText(id) {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`Mailpit message fetch failed: ${res.status} ${res.statusText}`);
  const body = await res.json();
  return body.Text ?? '';
}

function extractCode(text) {
  const match = /\b(\d{6})\b/.exec(text);
  return match ? match[1] : null;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node otp.mjs <email>');
    process.exit(1);
  }

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const id = await findLatestMessageId(email);
      if (id) {
        const text = await fetchMessageText(id);
        const code = extractCode(text);
        if (code) {
          console.log(code);
          return;
        }
      }
    } catch (err) {
      // Mailpit may not be reachable yet right after supabase start; keep polling
      // until the timeout, then report the last error below.
      if (Date.now() >= deadline) {
        console.error(`Timed out waiting for OTP email to ${email}: ${err.message}`);
        process.exit(1);
      }
    }
    await sleep(POLL_INTERVAL_MS);
  }

  console.error(`Timed out after ${TIMEOUT_MS}ms waiting for OTP email to ${email}`);
  process.exit(1);
}

main();

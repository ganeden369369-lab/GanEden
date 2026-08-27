# Gan Eden (גן עדן) — Product Requirements Document

**Status:** Draft v0.1 — 2026-08-27
**Owner:** Liran
**Platforms:** iOS + Android (Expo / React Native)

---

## 1. Overview

Gan Eden is a mobile companion for women who want to understand themselves through
numerology and grow into the best version of themselves — with the explicit promise
of attracting the relationship they want. The app is the digital extension of a real
numerologist/relationship coach (the "Mentor"): her method, her voice, her daily
guidance, available in the user's pocket.

**One-liner:** *Your personal numerology mentor — daily guidance, a conversation
whenever you need it, and a reading that's actually about you.*

### Why now / why this
- Numerology + relationship coaching is already the Mentor's business; the app scales
  her reach beyond 1:1 sessions.
- LLMs make a personal, always-available "conversation with the Mentor" feasible at
  consumer price points.
- Instagram sharing of personalized daily content is the growth loop.

---

## 2. Audience

**Primary:** Women 22–45, single or in a relationship they want to improve, interested
in self-development and spirituality (numerology, astrology, manifestation).
Launch markets: **Israel (Hebrew) and international (English)** simultaneously.

**Jobs to be done**
1. "Tell me who I am and what my numbers say about me."
2. "Give me something daily that makes me feel seen — and looks good enough to share."
3. "Let me talk to someone wise about him / about me, right now."
4. "Is he right for me?" (compatibility)

---

## 3. The Mentor persona

The AI speaks **as the Mentor** — her tone, her vocabulary, her method. Not a generic
assistant.

- **Tone:** warm, direct, big-sister energy; empowering, never preachy; spiritual but
  practical. Speaks to the user by name.
- **Boundaries:** not therapy, not medical/legal advice, no predictions of harm; gently
  redirects crisis topics to real help (see §9 Safety).
- **Bilingual:** replies in the user's app language; can switch if the user writes in
  the other language.

**Input dependency (blocking for the engine and prompts):** the Mentor must supply
1. her numerology method — which numbers are computed, how (including Hebrew names),
   and the meaning text for each number;
2. voice samples — 10–20 real messages/posts in her own words, in both languages if
   available;
3. do/don't list (topics, phrases, values).

---

## 4. Goals & success metrics (v1, first 90 days after launch)

| Goal | Metric | Target |
|---|---|---|
| Users complete onboarding and get their profile | Onboarding completion | ≥ 70 % |
| The daily quote habit forms | D7 retention | ≥ 30 % |
| Sharing drives growth | Quote shares / DAU | ≥ 15 % |
| Chat is the core value | % of WAU who send ≥ 1 chat message | ≥ 50 % |
| Cost stays sane | AI cost per MAU | ≤ target set in architecture doc |

---

## 5. Feature set

### 5.1 P0 — must ship in v1

**F1. Onboarding & personal numerology profile**
- Collect: full name (the Mentor's method requires the full name; Hebrew or Latin
  script), date of birth, language (HE/EN),
  relationship status (single / dating / in a relationship / married — used for tone
  and quote personalization), and **goals** (multi-select boxes, at least one):
  - Finding my partner
  - Improving my current relationship
  - Growing as a woman
  - Healing from a past relationship
  - Understanding myself through my numbers
  - Confidence & self-worth
  Goals steer the Mentor's tone and starter prompts, the quote themes, and which
  compatibility angle is emphasized. Editable later in Me → Profile; changing goals
  regenerates the remaining quotes.
- Compute the profile with the Mentor's method (deterministic code, no LLM math).
- Show a "Your Numbers" screen: each core number with a title, short meaning, and a
  "talk to the Mentor about this" CTA.
- Profile is editable later (name/date correction regenerates profile and quotes).

**F2. Mentor chat (AI)**
- **Multiple chats, one memory.** The user can open a new chat at any time (e.g. a
  new guy she's dating, a specific situation) and return to older ones from a chat
  list. The Mentor is the same person across all of them: she remembers what was
  said in earlier chats — names, situations, decisions, how the user felt — and can
  refer back to them ("last month you told me about Dan…").
- Chat list: auto-titled from the first messages (editable), last message preview,
  pinned "New chat" button. Chats can be archived/deleted; deleting a chat does
  **not** change the Mentor's memory (memory is managed separately in Me).
- Streaming replies; typing indicator; markdown-lite (bold, lists), no code blocks.
- Context always includes: profile numbers + meanings, today's personal day number,
  relationship status, goals, language, the current chat's recent messages, and the
  **user memory** — a server-side, continuously updated summary of facts and themes
  across *all* chats (people in her life, ongoing situations, what worked, what she's
  working on). See §7.
- Suggested starter prompts on a new chat, personalized to goals and memory ("Want to
  talk about Dan again, or something new?").
- Free tier: **5 chat messages per day** (configurable). Friendly "come back
  tomorrow" message at the cap; paid packages beyond that are P1 (not yet defined).

**F3. Personalized daily quote (Instagram-ready)**
- At onboarding, generate **30 days** of quotes for this user, each tied to a calendar
  date and derived from the user's profile + that date's personal day/month numbers
  + relationship status + goals (quote themes rotate across the selected goals).
  Stored server-side; next batch generated when < 7 remain or when the profile
  changes. Prompt changes affect only future batches.
- Home shows today's quote on a branded card (several soft-pink templates, user's
  name subtly included).
- **Share:** one tap → rendered PNG (9:16 for Stories, 1:1 for feed) → system share
  sheet (user picks Instagram). Direct-to-Stories is P1. Card carries the app
  name/handle as the growth hook.
- Daily push notification at a user-chosen time ("Your message for today is ready").
- Past quotes remain viewable in a simple archive (last 30 days).

**F4. Compatibility check**
- Enter a partner's first name + date of birth (relationship status optional).
- Deterministic compatibility numbers via the Mentor's method → AI-written narrative
  in the Mentor's voice (strengths, friction points, advice).
- Save multiple partners (label them); each reading can be continued in chat
  ("ask the Mentor about this match").

**F5. Bilingual UI**
- Full Hebrew (RTL) and English at launch. Language chosen at onboarding, changeable
  in settings. All generated content (quotes, profile text, chat) follows the
  language setting.

**F6. Accounts**
- Sign in with Apple, Google, and email magic link. Required (profile, quotes, and
  chat history must persist and follow the user across devices).

### 5.2 P1 — soon after launch
- Payments: packages via App Store / Play (RevenueCat); exact packages TBD. Free
  tier = 5 chat messages/day + daily quote. **Explicitly out of v1 build; design
  the data model so it slots in.**
- Direct-to-Instagram-Stories sharing (needs a native module → dev build).
- Personal forecast: personal day / month / year number with guidance on Home.
- Quote template picker & light customization before sharing.

### 5.3 Later / not now
- Human mentor chat (handoff or inbox) + mentor web dashboard.
- Journal / reflection prompts.
- Community / groups.
- Widgets (iOS/Android home-screen quote).
- Referral program.

---

## 6. UI structure

### 6.1 Navigation map

```
Splash / Welcome
└── Onboarding (linear, ~5 screens, progress bar)
    Welcome → Language → About you (full name + date of birth, one screen)
    → Relationship status → Your goals (multi-select) → "Calculating your numbers…" (animated) → Your Numbers reveal → Enable
    notifications → Home

Tab bar (4 tabs)
├── Home        — today's quote card + Share, greeting with personal day, quick
│                 entry to chat ("Ask the Mentor")
├── Chat        — chat list (+ New chat) → individual Mentor conversations;
│                 shared memory across all of them
├── Numbers     — Your Numbers profile; Compatibility (list + new check)
└── Me          — profile edit, language, notification time, quote archive,
                  legal, sign out
```

### 6.2 Screen inventory (v1)

| # | Screen | Key elements |
|---|---|---|
| 1 | Welcome | Brand, one-line promise, Sign in (Apple/Google/email) |
| 2 | Onboarding: language | HE / EN |
| 3 | Onboarding: about you | Full name field + date of birth (day/month/year) on one screen; one-line explanation of why |
| 5 | Onboarding: status | 4 options |
| 5b | Onboarding: goals | Multi-select cards (icon + label), ≥ 1 required, "Continue" |
| 6 | Calculating | Soft animation, 2–4 s while profile + first quotes generate |
| 7 | Numbers reveal | Hero number, swipe through core numbers |
| 8 | Notifications opt-in | Pick time, allow |
| 9 | Home | Quote card, Share, greeting, personal day chip, "Ask the Mentor" |
| 10a | Chat list | Chats sorted by last activity, previews, New chat, archive/delete |
| 10b | Chat | Message list, composer, starter prompts, cap notice, rename title |
| 11 | Numbers | Profile numbers (expandable), Compatibility section |
| 12 | Compatibility: new | Partner name + birthday |
| 13 | Compatibility: result | Score/visual + narrative + "Discuss in chat" |
| 14 | Me | Settings list |
| 14b | What the Mentor remembers | List of memory facts, delete individual items |
| 15 | Quote archive | Grid/list of past cards, re-share |
| 16 | Share preview | Template choice (P1), Story/Feed size, Share |

### 6.3 Visual direction
Brand assets in `assets/brand/`: `mentor-logo.jpg` (GAN EDEN wordmark + lotus,
rose-gold gradient serif, Hebrew tagline "בחזרה לגן העדן הפנימי שלך") and
`mentor-photo.jpg` (Eden, pink shirt, heart hands, cream setting).
- Palette: derived from the logo — rose-gold / dusty-rose gradient (brown→blush) as
  the accent for numbers, CTAs and the wordmark; soft blush pinks for surfaces; warm
  cream/off-white backgrounds. Not saturated pink. Dark mode: deep plum/mocha, not
  black.
- Type: a high-contrast display serif matching the wordmark for numbers and quotes;
  a clean sans for UI; a handwritten Hebrew script only for accents (tagline,
  signature). Hebrew and Latin faces must pair.
- The Mentor appears as herself: photo as welcome hero and chat avatar; lotus as
  the app icon motif.
- Motion: gentle, slow easing; number reveal and quote card are the two "moments".
- Every screen must be laid out with logical (start/end) properties for RTL.

---

## 7. Content & AI design

**Numerology engine** — pure, deterministic, unit-tested module implementing the
Mentor's method. Inputs: name(s), DOB, date. Outputs: core numbers, personal
day/month/year, compatibility numbers. Meaning texts live in a content table
(HE + EN), authored/approved by the Mentor.

**Mentor prompt** — system prompt built from: persona + voice samples, method summary,
user's numbers + meanings, today's numbers, relationship status, goals, user memory,
language, safety rules. Versioned; changes are tracked.

**User memory (cross-chat)** — one memory document per user, maintained server-side:
- *People*: names the user mentions (partners, exes, dates, family) with what she's
  said about each and the current status.
- *Situations & themes*: ongoing storylines, decisions taken, patterns the Mentor has
  pointed out.
- *Preferences*: how she likes to be spoken to, topics to avoid.
- Updated asynchronously after each exchange (or every N messages) by an extraction
  step; stored as structured JSON + a short prose summary, capped in size (oldest,
  least-referenced facts summarized down first).
- Every chat receives the full memory in context, so a new chat about "a new guy"
  still knows about the last one.
- User control: Me → "What the Mentor remembers" lists facts and lets the user
  delete any of them. Deleting a chat does not affect memory.

**Quote generation** — batch job: 90 prompts → 90 short quotes (≤ 200 chars) per
language, validated (length, no names other than the user's, no emojis unless brand
says so), stored per date. Fallback pool of generic quotes if generation fails so
Home is never empty.

**Compatibility narrative** — one generation per partner, cached; regenerated only if
either profile changes.

---

## 8. Non-functional requirements
- Offline: last quote and profile viewable offline; chat requires network.
- Perf: Home renders in < 1 s from cold cache; chat first token < 2 s p50.
- Privacy: name, DOB, relationship data and chat history are sensitive personal
  data; encrypted at rest, deletable on request (Me → Delete account), GDPR/Israeli
  Privacy Protection Law compliant. No chat content used for training.
- Accessibility: dynamic type, VoiceOver/TalkBack labels, contrast ≥ 4.5:1 on cards.
- Store compliance: content-generation disclosure, subscription terms (P1).

---

## 9. Safety
- The Mentor never diagnoses, never encourages staying in abusive situations, never
  makes deterministic claims ("he will leave you"). Framed as guidance.
- Crisis keywords (self-harm, abuse) → empathetic response + localized helplines
  (IL + international), logged for review.
- Age gate 18+.

---

## 10. Open questions
1. Exact numerology method + meaning texts (blocking for F1/F3/F4) — from the Mentor.
2. ~~Does the Mentor's name/likeness appear in the app?~~ Yes — the brand is built
   around Eden Harush (@eden__harush__); photo and name are used (see §6.3).
3. ~~Free-tier chat cap~~ → 5 messages/day; paid packages TBD (P1).
4. Quote push time default (proposal: 08:00 local).
5. ~~Full name or first name?~~ → full name + date of birth.
6. ~~Instagram Stories vs share sheet~~ → share sheet in v1; Stories in P1.

## 11. Risks
- **Method not documented** → engine can't be built; mitigate by scheduling a working
  session with the Mentor before implementation starts.
- **AI voice drift** → build an eval set of 30 prompts with "good" answers reviewed by
  the Mentor; run on every prompt change.
- **Generation cost at onboarding** (30 quotes) → generate only the
  active language; cheap model for quotes; batch API.
- **Instagram share friction** on Android → fall back to system share sheet with the
  PNG; still good enough for the loop.

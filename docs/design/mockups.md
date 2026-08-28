# Screen mockups

**Canvas:** https://claude.ai/code/artifact/1fc0bac2-94c3-4057-90b7-a7c69a697daa
**Direction:** Quiet luxury — cream space, large display serif, thin rose-gold lines, minimal chrome.
**Status:** v2 (2026-08-28) — all 18 PRD screens, EN + HE. v1 (7 screens) approved 2026-08-27.

The canvas has four pages (pages menu in the toolbar): **English · Onboarding**, **English · App**, **Hebrew (RTL) · Onboarding**, **Hebrew (RTL) · App**.

## Boards
| PRD screen | EN board | HE board | Built in |
|---|---|---|---|
| Welcome (sign-in by code) | `SignIn` | `SignInHE` | Phase 1 ✔ |
| Onboarding — language | `Language` | `LanguageHE` | Phase 1 ✔ |
| Onboarding — about you (name + DOB) | `About` | `AboutHE` | Phase 1 ✔ |
| Onboarding — status | `Status` | `StatusHE` | Phase 1 ✔ |
| Onboarding — goals | `Goals` | `GoalsHE` | Phase 1 ✔ |
| Calculating | `Calculating` | `CalculatingHE` | Phase 1 ✔ |
| Numbers reveal | `Reveal` | `RevealHE` | Phase 1 ✔ |
| Notifications opt-in | `Notifications` | `NotificationsHE` | Phase 3 |
| Home + quote card | `Main` | `HomeHE` | Phase 1 (placeholder) / Phase 3 |
| Chat list | `ChatList` | `ChatListHE` | Phase 2 |
| Chat | `Chat` | `ChatHE` | Phase 2 |
| Numbers + compatibility list | `Numbers` | `NumbersHE` | Phase 1 (numbers) / Phase 4 |
| Compatibility — new | `CompatNew` | `CompatNewHE` | Phase 4 |
| Compatibility — result | `CompatResult` | `CompatResultHE` | Phase 4 |
| Me | `Me` | `MeHE` | Phase 1 (partial) |
| What Eden remembers | `Memory` | `MemoryHE` | Phase 2 |
| Quote archive | `Archive` | `ArchiveHE` | Phase 3 |
| Share preview | `Share` | `ShareHE` | Phase 3 |

Working sources (regenerable): `docs/design/src/gen.mjs` + `canvas.json` — `node gen.mjs` rewrites all 36 artboards.

## Assumptions in the boards
- Sample user "Maya", life path 5; sample partner "Tom"; the chat references an earlier "Dan" thread to show cross-chat memory.
- Meaning texts, compatibility copy and quotes are placeholders until Eden's method and content arrive.
- No status bar / keyboard drawn (the OS renders them).
- Instagram share is the OS share sheet in v1 (D7); the Share preview board shows the Story/Square card.
- Fonts: Cormorant Garamond (EN display), Frank Ruhl Libre (HE display), Heebo (body) — placeholders until brand fonts arrive.

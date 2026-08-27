# Screen mockups

**Canvas:** https://claude.ai/code/artifact/1fc0bac2-94c3-4057-90b7-a7c69a697daa
**Direction:** Quiet luxury — cream space, large display serif, thin rose-gold lines, minimal chrome.
**Status:** Draft v1 (2026-08-27), awaiting product-owner review.

## Boards
| Screen | EN | HE |
|---|---|---|
| Welcome | `SignIn` | `SignInHE` |
| Onboarding — about you (full name + date of birth, one step) | `About` | `AboutHE` |
| Onboarding — goals step | `Goals` | `GoalsHE` |
| Calculating | `Calculating` | `CalculatingHE` |
| Numbers reveal | `Reveal` | `RevealHE` |
| Home + quote card | `Main` | `HomeHE` |
| Chat | `Chat` | `ChatHE` |

The canvas has two pages: **English** and **Hebrew (RTL)** (pages menu in the toolbar).
Working sources (regenerable): `docs/design/src/gen.mjs` + `canvas.json` — `node gen.mjs` rewrites all 12 artboards.

## Assumptions in the boards
- Sample user "Maya", life path 5; sample chat references an earlier "Dan" thread to show cross-chat memory.
- No status bar / keyboard drawn (the OS renders them).
- Instagram share is the OS share sheet (v1 decision D7).
- Fonts: Cormorant Garamond (EN display), Frank Ruhl Libre (HE display), Heebo (body) — placeholders until brand fonts arrive.

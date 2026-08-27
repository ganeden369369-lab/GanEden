# Design tokens (approved from mockups v1, 2026-08-27)

Source of truth for `apps/mobile/src/ui/tokens.ts`. Canvas: see `mockups.md`.

## Color
| token | value | source board |
|---|---|---|
| color.surface | #FFF7F4 | all (screen background) |
| color.surfaceRaised | #FFFFFF | Home quote card top |
| color.surfaceTint | #F6E3DF | Home quote card bottom, chat user bubble |
| color.border | #EFCFC9 | hairlines, field underlines, tab bar top |
| color.accent | #8E5E4E | titles, primary button, icons, progress |
| color.accentSoft | #B98577 | gradient mid |
| color.accentGlow | #E3B4B0 | gradient end |
| color.textPrimary | #2B1E1B | body text, name field |
| color.textSecondary | #3E2A25 | Reveal meaning text, user bubble text |
| color.textMuted | #8A7470 | hints, captions, placeholders, inactive tabs |
| color.textInverse | #FFFFFF | primary button label |
| color.danger | #B4443C | field errors (not on boards; reserved) |
| gradient.accent | 135°, #8E5E4E → #B98577 (55 %) → #E3B4B0 | Reveal hero number |

## Typography
| token | value | source |
|---|---|---|
| font.display.en | Cormorant Garamond 500 | all titles, hero numbers, quote |
| font.display.he | Frank Ruhl Libre 500 | same, Hebrew |
| font.body | Heebo 400 | body, buttons (600), captions |
| size.hero | 168 / line 1.0 | Reveal life path number |
| size.display | 38 / line 1.12 | Welcome tagline |
| size.title | 30–32 / line 1.15 | screen titles |
| size.quote | 26 / line 1.3 | Home quote card |
| size.heading | 20–24 | chat name, name field value |
| size.body | 16 / line 1.5–1.6 | body, choices, chat |
| size.caption | 13–15 | hints |
| size.label | 11–12, tracking .14–.18em, uppercase | "LIFE PATH", field labels |

## Spacing & shape
| token | value | source |
|---|---|---|
| space | 4 · 8 · 12 · 16 · 24 · 32 · 48 | all |
| screen.paddingX | 28 | all |
| screen.paddingTop | 72 (below OS status bar) | all |
| radius.card | 24 | quote card |
| radius.bubble | 20 | chat user bubble |
| radius.pill | 999 | buttons, composer |
| control.height | 56 (primary), 52 (composer), 44 (secondary) | Welcome, Chat, Home share |
| row.height | 58 | choice rows |
| hairline | 1px `color.border` | progress, dividers |
| shadow.card | 0 10 30 rgba(142,94,78,.08) | quote card |

## Motion (to implement in Task 7a / feature tasks)
| token | value | where |
|---|---|---|
| motion.fast | 150 ms | pressed states |
| motion.base | 250 ms easeOut | screen transitions, choice select |
| motion.reveal | 600 ms easeOutCubic, number scales 0.9→1 + fade | Reveal hero |
| motion.calc | rings pulse 2.4 s loop, subtle | Calculating |

## Rules
- Titles and numbers always display serif in accent; body always Heebo.
- Chat: Eden's messages are plain text (no bubble); the user's are tinted bubbles aligned to the end side.
- Primary button is full-width pill at the bottom of every onboarding step.
- No status bar/keyboard drawn; safe-area padding via `react-native-safe-area-context`.

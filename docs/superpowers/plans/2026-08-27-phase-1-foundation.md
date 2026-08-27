# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running Expo app on local Supabase where a user signs in by email code, completes onboarding (language, full name, birthday, status, goals), sees her numbers computed by the shared numerology engine, and lands in a 4-tab shell.

**Architecture:** pnpm monorepo. `packages/numerology` is a pure, table-driven engine used by the app (instant reveal) and later by edge functions. `packages/shared` holds zod schemas + generated DB types. `supabase/` holds the full v1 schema (all tables from the architecture doc, so later phases only add functions). `apps/mobile` is Expo Router + NativeWind + i18next (HE/EN, RTL) + supabase-js.

**Tech Stack:** Node 24, pnpm 10, TypeScript strict, Vitest, Expo SDK (latest stable) with Expo Router, NativeWind v4, Zustand, TanStack Query, `@supabase/supabase-js`, Supabase CLI (via `npx supabase`), Docker Desktop (for local Supabase), Maestro.

**Spec:** `docs/PRD.md`, `docs/ARCHITECTURE.md`

## Global Constraints

- Language: TypeScript `strict: true` everywhere; no `any` without an eslint-disable comment explaining why.
- Engine: `packages/numerology` has **zero runtime dependencies**; Vitest coverage ≥ 95 % (statements) enforced in its config.
- All app layout uses logical props (`ps-`/`pe-`/`start-`/`end-` in NativeWind, never `pl-`/`pr-`/`left`/`right`) — RTL is a launch requirement.
- Onboarding collects **full name** (Hebrew or Latin script) + **date of birth** (D10).
- Free-tier constant `FREE_DAILY_MESSAGES = 5` lives in the DB function (D5) — defined here even though chat is Phase 2.
- Supabase project region for staging/prod is **EU (Frankfurt)** (D6) — local only in this phase.
- Expo Go compatible: no custom native modules in this phase (D7).
- Commit after every task; conventional commit messages (`feat:`, `chore:`, `test:`).
- Windows host: commands are written for Git Bash / PowerShell-agnostic `pnpm`/`npx`; paths use forward slashes.
- **Design system first:** feature screens (T9, T11, T12) use only primitives from `apps/mobile/src/ui/` (T7a). No raw color classes or ad-hoc font sizes in feature files; if a primitive is missing, add it to the system (and the gallery) in the same task.
- **Web target enabled:** every screen must render on `expo start --web` (used for visual review); native-only modules get a web fallback.
- **Visual review loop:** after any UI task, capture screenshots on Expo Web (Chrome, 390×844 frame) in HE and EN, and on the Android emulator (`adb exec-out screencap -p > shot.png`). Review before committing.

**Prerequisites:** Docker Desktop (local Supabase); Android Studio with one AVD (Pixel 8, API 35) for native screenshots; Expo Go on a phone.

---

## File map

```
gan-eden/
├── package.json, pnpm-workspace.yaml, .npmrc, tsconfig.base.json, .gitignore, .prettierrc, eslint.config.js
├── packages/shared/
│   ├── package.json, tsconfig.json, vitest.config.ts
│   └── src/index.ts, src/profile.ts (zod), src/database.types.ts (generated), src/profile.test.ts
├── packages/numerology/
│   ├── package.json, tsconfig.json, vitest.config.ts
│   └── src/index.ts, version.ts, reduce.ts, method.ts, methods/default.ts,
│       name.ts, profile.ts, cycles.ts, compatibility.ts  (+ .test.ts next to each)
├── supabase/
│   ├── config.toml (generated), seed.sql
│   └── migrations/0001_core.sql
└── apps/mobile/
    ├── app.json, babel.config.js, metro.config.js, tailwind.config.js, global.css, nativewind-env.d.ts
    ├── app/_layout.tsx, app/index.tsx
    ├── app/(auth)/welcome.tsx, app/(auth)/verify.tsx
    ├── app/(onboarding)/_layout.tsx, language.tsx, name.tsx, birthday.tsx, status.tsx, goals.tsx, calculating.tsx, reveal.tsx
    ├── app/(tabs)/_layout.tsx, home.tsx, chat.tsx, numbers.tsx, me.tsx
    ├── app/dev/gallery.tsx                       (dev-only design-system gallery)
    └── src/lib/theme.ts, theme.js, supabase.ts, i18n/index.ts, i18n/he.json, i18n/en.json, query.tsx
        src/ui/tokens.ts, Text.tsx, Button.tsx, Card.tsx, Field.tsx, Choice.tsx, NumberBadge.tsx,
               Avatar.tsx, Icon.tsx, Screen.tsx, StepFrame.tsx, QuoteCard.tsx, index.ts
        src/store/onboarding.ts
        src/features/profile/useProfile.ts, saveProfile.ts
    └── .maestro/onboarding.yaml
docs/design/                                       mockups (Task 0) + tokens decision record
```

---

### Task 0: Screen mockups and token decisions

**Files:**
- Create: `docs/design/mockups.md` (link to the design canvas + screenshots of approved boards), `docs/design/tokens.md`

**Interfaces:**
- Produces: approved values for `src/ui/tokens.ts` (T7a): semantic colors, type scale + font families (HE/EN), spacing, radii, shadow, motion. Approved layouts for Welcome, Reveal, Home + quote card, Chat.

- [ ] **Step 1: Design canvas** — produce artboards (390×844) for: Welcome, Onboarding step frame (goals), Calculating, Reveal, Home with quote card, Chat conversation. Each in HE (RTL) and EN. Use the brand assets in `assets/brand/` and `assets/icon/`.
- [ ] **Step 2: Review** — the product owner tweaks/approves in the canvas. Iterate until approved.
- [ ] **Step 3: Record tokens** — write `docs/design/tokens.md` listing every token with its value and the board it came from, e.g.

```md
| token | value | source |
|---|---|---|
| color.surface | #FFF7F4 | Home |
| color.accent | linear(#8E5E4E → #B98577 → #E3B4B0) | Reveal number |
| font.display | Cormorant Garamond (EN) / Frank Ruhl Libre (HE) | Reveal |
| font.body | Heebo | all |
| radius.card | 24 | Home quote card |
| space.* | 4-pt scale: 4 8 12 16 24 32 48 | all |
| motion.reveal | 600ms, easeOutCubic | Reveal |
```

- [ ] **Step 4: Commit** (after Task 1's `git init`; if executing Task 0 first, keep the files and commit them in Task 1).

---

### Task 1: Repository and monorepo scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `tsconfig.base.json`, `.gitignore`, `.prettierrc`, `eslint.config.js`

**Interfaces:**
- Produces: workspace layout `apps/*`, `packages/*`; root scripts `pnpm test`, `pnpm typecheck`, `pnpm lint`.

- [ ] **Step 1: Init git**

```bash
cd "C:/Users/Liran Asia/Documents/Projects/gan-eden"
git init -b main
```

- [ ] **Step 2: Root files**

`package.json`:
```json
{
  "name": "gan-eden",
  "private": true,
  "packageManager": "pnpm@10.28.0",
  "scripts": {
    "test": "pnpm -r --if-present test",
    "typecheck": "pnpm -r --if-present typecheck",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`.npmrc` (Expo + pnpm need hoisting):
```
node-linker=hoisted
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`.gitignore`:
```
node_modules/
dist/
.expo/
*.log
.env
.env.*
!.env.example
supabase/.temp/
coverage/
```

`.prettierrc`:
```json
{ "singleQuote": true, "semi": true, "printWidth": 100 }
```

`eslint.config.js`:
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**', '**/database.types.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
);
```

- [ ] **Step 3: Install and verify**

```bash
pnpm install
pnpm lint
```
Expected: no errors (nothing to lint yet).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo"
```

---

### Task 2: `packages/shared` — profile schemas

**Files:**
- Create: `packages/shared/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/profile.ts`, `src/profile.test.ts`

**Interfaces:**
- Produces:
  - `Language = 'he' | 'en'`, `Script = 'he' | 'latin'`
  - `RelationshipStatus = 'single' | 'dating' | 'relationship' | 'married'`
  - `GOALS` const tuple and `Goal` type
  - `ProfileInputSchema` (zod) and `ProfileInput` type: `{ fullName: string; script: Script; dob: string /* YYYY-MM-DD */; language: Language; relationshipStatus: RelationshipStatus; goals: Goal[] }`

- [ ] **Step 1: Package files**

`packages/shared/package.json`:
```json
{
  "name": "@gan-eden/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "test": "vitest run", "typecheck": "tsc --noEmit" },
  "dependencies": { "zod": "^3.23.0" },
  "devDependencies": { "vitest": "^2.0.0", "typescript": "^5.6.0" }
}
```

`packages/shared/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

`packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
```

- [ ] **Step 2: Failing test**

`packages/shared/src/profile.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ProfileInputSchema } from './profile';

const valid = {
  fullName: 'עדן הרוש',
  script: 'he',
  dob: '1995-04-10',
  language: 'he',
  relationshipStatus: 'single',
  goals: ['find_partner', 'grow_as_woman'],
};

describe('ProfileInputSchema', () => {
  it('accepts a valid profile', () => {
    expect(ProfileInputSchema.parse(valid)).toEqual(valid);
  });
  it('requires at least one goal', () => {
    expect(() => ProfileInputSchema.parse({ ...valid, goals: [] })).toThrow();
  });
  it('rejects a malformed date', () => {
    expect(() => ProfileInputSchema.parse({ ...valid, dob: '10/04/1995' })).toThrow();
  });
  it('trims and rejects an empty name', () => {
    expect(() => ProfileInputSchema.parse({ ...valid, fullName: '   ' })).toThrow();
  });
});
```

- [ ] **Step 3: Run, expect failure**

```bash
pnpm --filter @gan-eden/shared install
pnpm --filter @gan-eden/shared test
```
Expected: FAIL — cannot resolve `./profile`.

- [ ] **Step 4: Implement**

`packages/shared/src/profile.ts`:
```ts
import { z } from 'zod';

export const LANGUAGES = ['he', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const SCRIPTS = ['he', 'latin'] as const;
export type Script = (typeof SCRIPTS)[number];

export const RELATIONSHIP_STATUSES = ['single', 'dating', 'relationship', 'married'] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

export const GOALS = [
  'find_partner',
  'improve_relationship',
  'grow_as_woman',
  'heal_past',
  'understand_numbers',
  'confidence',
] as const;
export type Goal = (typeof GOALS)[number];

export const ProfileInputSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  script: z.enum(SCRIPTS),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  language: z.enum(LANGUAGES),
  relationshipStatus: z.enum(RELATIONSHIP_STATUSES),
  goals: z.array(z.enum(GOALS)).min(1),
});
export type ProfileInput = z.infer<typeof ProfileInputSchema>;
```

`packages/shared/src/index.ts`:
```ts
export * from './profile';
```

- [ ] **Step 5: Run, expect pass**

```bash
pnpm --filter @gan-eden/shared test
pnpm --filter @gan-eden/shared typecheck
```
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): profile input schema"
```

---

### Task 3: Numerology engine — reduction

**Files:**
- Create: `packages/numerology/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/version.ts`, `src/reduce.ts`, `src/reduce.test.ts`

**Interfaces:**
- Produces: `reduce(n: number, masters?: readonly number[]): number` — repeatedly sums digits until single digit, but stops at a master number (default `[11, 22, 33]`). `digitSum(n: number): number`. `ENGINE_VERSION = 'default-0.1.0'`.

- [ ] **Step 1: Package files**

`packages/numerology/package.json`:
```json
{
  "name": "@gan-eden/numerology",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "test": "vitest run --coverage", "typecheck": "tsc --noEmit" },
  "devDependencies": {
    "@vitest/coverage-v8": "^2.0.0",
    "vitest": "^2.0.0",
    "typescript": "^5.6.0"
  }
}
```

`packages/numerology/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

`packages/numerology/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
```

`packages/numerology/src/version.ts`:
```ts
export const ENGINE_VERSION = 'default-0.1.0';
```

- [ ] **Step 2: Failing test**

`packages/numerology/src/reduce.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { digitSum, reduce } from './reduce';

describe('digitSum', () => {
  it('sums digits', () => {
    expect(digitSum(1990)).toBe(19);
    expect(digitSum(7)).toBe(7);
  });
});

describe('reduce', () => {
  it('reduces to a single digit', () => {
    expect(reduce(1990)).toBe(1); // 19 -> 10 -> 1
    expect(reduce(15)).toBe(6);
  });
  it('keeps master numbers', () => {
    expect(reduce(11)).toBe(11);
    expect(reduce(29)).toBe(11); // 2+9
    expect(reduce(22)).toBe(22);
    expect(reduce(33)).toBe(33);
  });
  it('respects a custom master list', () => {
    expect(reduce(11, [])).toBe(2);
  });
  it('throws on negative input', () => {
    expect(() => reduce(-1)).toThrow();
  });
});
```

- [ ] **Step 3: Run, expect failure**

```bash
pnpm --filter @gan-eden/numerology install
pnpm --filter @gan-eden/numerology test
```
Expected: FAIL — cannot resolve `./reduce`.

- [ ] **Step 4: Implement**

`packages/numerology/src/reduce.ts`:
```ts
export const DEFAULT_MASTERS: readonly number[] = [11, 22, 33];

export function digitSum(n: number): number {
  let total = 0;
  for (const ch of String(n)) total += Number(ch);
  return total;
}

export function reduce(n: number, masters: readonly number[] = DEFAULT_MASTERS): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`reduce: expected non-negative integer, got ${n}`);
  let value = n;
  while (value > 9 && !masters.includes(value)) value = digitSum(value);
  return value;
}
```

- [ ] **Step 5: Run, expect pass**

```bash
pnpm --filter @gan-eden/numerology test
```
Expected: 5 tests pass; coverage report printed (threshold may fail until index.ts exists — that is excluded, so it should pass).

- [ ] **Step 6: Commit**

```bash
git add packages/numerology
git commit -m "feat(numerology): digit reduction with master numbers"
```

---

### Task 4: Numerology engine — method definition and name sums

**Files:**
- Create: `packages/numerology/src/method.ts`, `src/methods/default.ts`, `src/name.ts`, `src/name.test.ts`

**Interfaces:**
- Produces:
  - `interface Method { id: string; masters: readonly number[]; letters: Record<Script, Record<string, number>>; vowels: Record<Script, ReadonlySet<string>> }`
  - `DEFAULT_METHOD: Method` (Pythagorean Latin table; Hebrew reduced-gematria table). **This is the data the Mentor's method replaces.**
  - `normalizeName(name: string, script: Script): string` — lowercases, strips non-letters, maps Hebrew final forms to base forms.
  - `nameSums(name: string, script: Script, method?: Method): { all: number; vowels: number; consonants: number }` — raw (unreduced) sums.

- [ ] **Step 1: Failing test**

`packages/numerology/src/name.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { nameSums, normalizeName } from './name';

describe('normalizeName', () => {
  it('lowercases and strips non-letters (latin)', () => {
    expect(normalizeName('John-Paul  Smith!', 'latin')).toBe('johnpaulsmith');
  });
  it('maps Hebrew final forms and strips niqqud/spaces', () => {
    expect(normalizeName('עדן הרוש', 'he')).toBe('עדנהרוש');
    expect(normalizeName('שָׁלוֹם', 'he')).toBe('שלום');
    expect(normalizeName('ץףךםן', 'he')).toBe('צפכמנ');
  });
});

describe('nameSums (default method)', () => {
  it('sums a latin name: JOHN = 1+6+8+5', () => {
    expect(nameSums('John', 'latin')).toEqual({ all: 20, vowels: 6, consonants: 14 });
  });
  it('sums a hebrew name: עדן = 7+4+5 (reduced gematria)', () => {
    // ע=70->7, ד=4, ן->נ=50->5 ; vowel letters (אהוי) none here
    expect(nameSums('עדן', 'he')).toEqual({ all: 16, vowels: 0, consonants: 16 });
  });
  it('treats א ה ו י as vowel letters in hebrew', () => {
    // הרוש: ה=5(v) ר=200->2 ו=6(v) ש=300->3
    expect(nameSums('הרוש', 'he')).toEqual({ all: 16, vowels: 11, consonants: 5 });
  });
  it('ignores characters not in the table', () => {
    expect(nameSums('J0hn', 'latin')).toEqual({ all: 14, vowels: 0, consonants: 14 });
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm --filter @gan-eden/numerology test
```
Expected: FAIL — cannot resolve `./name`.

- [ ] **Step 3: Implement**

`packages/numerology/src/method.ts`:
```ts
export type Script = 'he' | 'latin';

export interface Method {
  /** Identifier stored alongside ENGINE_VERSION on generated data. */
  id: string;
  masters: readonly number[];
  letters: Record<Script, Readonly<Record<string, number>>>;
  vowels: Record<Script, ReadonlySet<string>>;
}
```

`packages/numerology/src/methods/default.ts`:
```ts
import type { Method } from '../method';

// Pythagorean: A=1 … I=9, J=1 … R=9, S=1 … Z=8
const LATIN: Record<string, number> = {};
for (let i = 0; i < 26; i++) LATIN[String.fromCharCode(97 + i)] = (i % 9) + 1;

// Reduced gematria: א=1 … ט=9, י=10→1 … צ=90→9, ק=100→1 … ת=400→4
const HEBREW: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 1, כ: 2, ל: 3, מ: 4, נ: 5, ס: 6, ע: 7, פ: 8, צ: 9,
  ק: 1, ר: 2, ש: 3, ת: 4,
};

/**
 * Default method (standard Pythagorean / reduced gematria).
 * REPLACE the tables and vowel sets with the Mentor's method once documented;
 * bump ENGINE_VERSION when you do.
 */
export const DEFAULT_METHOD: Method = {
  id: 'default',
  masters: [11, 22, 33],
  letters: { latin: LATIN, he: HEBREW },
  vowels: { latin: new Set(['a', 'e', 'i', 'o', 'u']), he: new Set(['א', 'ה', 'ו', 'י']) },
};
```

`packages/numerology/src/name.ts`:
```ts
import type { Method, Script } from './method';
import { DEFAULT_METHOD } from './methods/default';

const HEBREW_FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

export function normalizeName(name: string, script: Script): string {
  if (script === 'latin') {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }
  return name
    .replace(/[\u0591-\u05C7]/g, '') // niqqud + cantillation
    .replace(/[ךםןףץ]/g, (c) => HEBREW_FINALS[c] ?? c)
    .replace(/[^\u05D0-\u05EA]/g, '');
}

export interface NameSums {
  all: number;
  vowels: number;
  consonants: number;
}

export function nameSums(name: string, script: Script, method: Method = DEFAULT_METHOD): NameSums {
  const table = method.letters[script];
  const vowelSet = method.vowels[script];
  let all = 0;
  let vowels = 0;
  for (const ch of normalizeName(name, script)) {
    const v = table[ch];
    if (v === undefined) continue;
    all += v;
    if (vowelSet.has(ch)) vowels += v;
  }
  return { all, vowels, consonants: all - vowels };
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm --filter @gan-eden/numerology test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/numerology
git commit -m "feat(numerology): method tables and name sums"
```

---

### Task 5: Numerology engine — profile, cycles, compatibility, index

**Files:**
- Create: `packages/numerology/src/profile.ts`, `profile.test.ts`, `cycles.ts`, `cycles.test.ts`, `compatibility.ts`, `compatibility.test.ts`, `index.ts`

**Interfaces:**
- Produces:
  - `interface NumerologyProfile { lifePath: number; expression: number; soulUrge: number; personality: number; birthday: number; methodId: string; engineVersion: string }`
  - `computeProfile(input: { fullName: string; script: Script; dob: string }, method?: Method): NumerologyProfile`
  - `personalCycles(dob: string, on: string): { personalYear: number; personalMonth: number; personalDay: number }`
  - `compatibility(a: NumerologyProfile, b: NumerologyProfile): { score: number; lifePathPair: [number, number]; harmony: 'high' | 'medium' | 'low' }`
  - `index.ts` re-exports everything plus `ENGINE_VERSION`, `DEFAULT_METHOD`.

- [ ] **Step 1: Failing tests**

`packages/numerology/src/profile.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeProfile } from './profile';

describe('computeProfile (default method)', () => {
  it('computes John, 1990-07-15', () => {
    const p = computeProfile({ fullName: 'John', script: 'latin', dob: '1990-07-15' });
    expect(p.lifePath).toBe(5); // 7 + (1+5=6) + (1990->1) = 14 -> 5
    expect(p.birthday).toBe(6);
    expect(p.expression).toBe(2); // 20 -> 2
    expect(p.soulUrge).toBe(6);
    expect(p.personality).toBe(5); // 14 -> 5
    expect(p.methodId).toBe('default');
    expect(p.engineVersion).toBe('default-0.1.0');
  });
  it('keeps master numbers during life path summation', () => {
    // 11 (master, kept) + 11 (master) + 1975 -> 22 (master) => 44 -> 8
    expect(computeProfile({ fullName: 'A', script: 'latin', dob: '1975-11-11' }).lifePath).toBe(8);
    // 1990-11-02: 11 + 2 + 1 = 14 -> 5 ; 2000-11-09: 11 + 9 + 2 = 22 (master)
    expect(computeProfile({ fullName: 'A', script: 'latin', dob: '2000-11-09' }).lifePath).toBe(22);
  });
  it('throws on an invalid date', () => {
    expect(() => computeProfile({ fullName: 'A', script: 'latin', dob: '1990-13-01' })).toThrow();
  });
});
```

`packages/numerology/src/cycles.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { personalCycles } from './cycles';

describe('personalCycles', () => {
  it('computes year/month/day for dob 1990-07-15 on 2026-08-27', () => {
    // personalYear = reduce(7 + 6 + reduce(2026)=1) = 14 -> 5
    // personalMonth = reduce(5 + 8) = 13 -> 4
    // personalDay = reduce(4 + 27) = 31 -> 4
    expect(personalCycles('1990-07-15', '2026-08-27')).toEqual({
      personalYear: 5,
      personalMonth: 4,
      personalDay: 4,
    });
  });
  it('never returns master numbers for cycles (always 1-9)', () => {
    for (let d = 1; d <= 28; d++) {
      const day = String(d).padStart(2, '0');
      const c = personalCycles('1990-11-11', `2026-11-${day}`);
      expect(c.personalDay).toBeGreaterThanOrEqual(1);
      expect(c.personalDay).toBeLessThanOrEqual(9);
    }
  });
});
```

`packages/numerology/src/compatibility.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { compatibility } from './compatibility';
import { computeProfile } from './profile';

const her = computeProfile({ fullName: 'Dana', script: 'latin', dob: '1992-03-21' });
const him = computeProfile({ fullName: 'Tom', script: 'latin', dob: '1990-07-15' });

describe('compatibility', () => {
  it('is symmetric', () => {
    expect(compatibility(her, him).score).toBe(compatibility(him, her).score);
  });
  it('returns a 0-100 score and a harmony band', () => {
    const r = compatibility(her, him);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(['high', 'medium', 'low']).toContain(r.harmony);
    expect(r.lifePathPair).toEqual([her.lifePath, him.lifePath]);
  });
  it('same life path scores high', () => {
    expect(compatibility(him, him).harmony).toBe('high');
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm --filter @gan-eden/numerology test
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`packages/numerology/src/profile.ts`:
```ts
import type { Method, Script } from './method';
import { DEFAULT_METHOD } from './methods/default';
import { nameSums } from './name';
import { reduce } from './reduce';
import { ENGINE_VERSION } from './version';

export interface NumerologyProfile {
  lifePath: number;
  expression: number;
  soulUrge: number;
  personality: number;
  birthday: number;
  methodId: string;
  engineVersion: string;
}

export interface ProfileSource {
  fullName: string;
  script: Script;
  dob: string; // YYYY-MM-DD
}

export function parseDate(iso: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`expected YYYY-MM-DD, got ${iso}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`invalid date ${iso}`);
  }
  return { y, m: mo, d };
}

export function computeProfile(src: ProfileSource, method: Method = DEFAULT_METHOD): NumerologyProfile {
  const { y, m, d } = parseDate(src.dob);
  const masters = method.masters;
  const lifePath = reduce(reduce(m, masters) + reduce(d, masters) + reduce(y, masters), masters);
  const sums = nameSums(src.fullName, src.script, method);
  return {
    lifePath,
    expression: reduce(sums.all, masters),
    soulUrge: reduce(sums.vowels, masters),
    personality: reduce(sums.consonants, masters),
    birthday: reduce(d, masters),
    methodId: method.id,
    engineVersion: ENGINE_VERSION,
  };
}
```

`packages/numerology/src/cycles.ts`:
```ts
import { parseDate } from './profile';
import { reduce } from './reduce';

export interface PersonalCycles {
  personalYear: number;
  personalMonth: number;
  personalDay: number;
}

const NO_MASTERS: readonly number[] = [];

export function personalCycles(dob: string, on: string): PersonalCycles {
  const b = parseDate(dob);
  const t = parseDate(on);
  const personalYear = reduce(reduce(b.m, NO_MASTERS) + reduce(b.d, NO_MASTERS) + reduce(t.y, NO_MASTERS), NO_MASTERS);
  const personalMonth = reduce(personalYear + t.m, NO_MASTERS);
  const personalDay = reduce(personalMonth + t.d, NO_MASTERS);
  return { personalYear, personalMonth, personalDay };
}
```

`packages/numerology/src/compatibility.ts`:
```ts
import type { NumerologyProfile } from './profile';
import { reduce } from './reduce';

export interface Compatibility {
  score: number; // 0-100
  lifePathPair: [number, number];
  harmony: 'high' | 'medium' | 'low';
}

/**
 * Pair affinity table for single-digit life paths (1..9), symmetric.
 * Values are 0..3 (3 = natural harmony). Data — replace with the Mentor's rules.
 */
const AFFINITY: number[][] = [
  // 1  2  3  4  5  6  7  8  9
  [3, 1, 3, 1, 3, 1, 2, 2, 2], // 1
  [1, 3, 1, 3, 1, 3, 1, 3, 2], // 2
  [3, 1, 3, 1, 3, 2, 1, 1, 3], // 3
  [1, 3, 1, 3, 1, 2, 3, 3, 1], // 4
  [3, 1, 3, 1, 3, 1, 3, 1, 2], // 5
  [1, 3, 2, 2, 1, 3, 1, 2, 3], // 6
  [2, 1, 1, 3, 3, 1, 3, 1, 1], // 7
  [2, 3, 1, 3, 1, 2, 1, 3, 1], // 8
  [2, 2, 3, 1, 2, 3, 1, 1, 3], // 9
];

function single(n: number): number {
  return reduce(n, []);
}

export function compatibility(a: NumerologyProfile, b: NumerologyProfile): Compatibility {
  const la = single(a.lifePath);
  const lb = single(b.lifePath);
  const lifeAffinity = AFFINITY[la - 1]![lb - 1]!; // 0..3
  const soulAffinity = AFFINITY[single(a.soulUrge) - 1]![single(b.soulUrge) - 1]!;
  const exprAffinity = AFFINITY[single(a.expression) - 1]![single(b.expression) - 1]!;
  const raw = lifeAffinity * 0.5 + soulAffinity * 0.3 + exprAffinity * 0.2; // 0..3
  const score = Math.round((raw / 3) * 100);
  const harmony = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { score, lifePathPair: [a.lifePath, b.lifePath], harmony };
}
```

`packages/numerology/src/index.ts`:
```ts
export { ENGINE_VERSION } from './version';
export { reduce, digitSum, DEFAULT_MASTERS } from './reduce';
export type { Method, Script } from './method';
export { DEFAULT_METHOD } from './methods/default';
export { normalizeName, nameSums } from './name';
export type { NameSums } from './name';
export { computeProfile, parseDate } from './profile';
export type { NumerologyProfile, ProfileSource } from './profile';
export { personalCycles } from './cycles';
export type { PersonalCycles } from './cycles';
export { compatibility } from './compatibility';
export type { Compatibility } from './compatibility';
```

- [ ] **Step 4: Run, expect pass with coverage**

```bash
pnpm --filter @gan-eden/numerology test
pnpm --filter @gan-eden/numerology typecheck
```
Expected: all tests pass; coverage thresholds met. If the `1975-11-11` expectation fails, recompute by hand with the implemented rules and fix the **test** only if the hand calculation disagrees with the test comment.

- [ ] **Step 5: Commit**

```bash
git add packages/numerology
git commit -m "feat(numerology): profile, personal cycles, compatibility"
```

---

### Task 6: Supabase project — schema, RLS, functions, seed

**Files:**
- Create: `supabase/migrations/0001_core.sql`, `supabase/seed.sql`, `packages/shared/src/database.types.ts` (generated)
- Modify: `packages/shared/src/index.ts`, `package.json` (root scripts)

**Interfaces:**
- Produces: all v1 tables (see ARCHITECTURE §4), RLS policies, `check_and_increment_usage(p_user uuid) returns int`, `today_quote(p_user uuid) returns table(text text, theme text, is_fallback bool)`, `Database` TS type exported from `@gan-eden/shared`.

**Prerequisite:** Docker Desktop running.

- [ ] **Step 1: Init Supabase**

```bash
npx supabase@latest init
```
Expected: `supabase/config.toml` created. Answer "N" to VS Code/IntelliJ settings prompts.

- [ ] **Step 2: Write the migration**

`supabase/migrations/0001_core.sql`:
```sql
-- Extensions
create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  full_name_script text not null check (full_name_script in ('he','latin')),
  dob date not null,
  language text not null check (language in ('he','en')),
  relationship_status text not null check (relationship_status in ('single','dating','relationship','married')),
  goals text[] not null check (cardinality(goals) >= 1),
  numbers jsonb not null,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- ---------- chats & messages ----------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  archived boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.chats enable row level security;
create policy "own chats" on public.chats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index chats_user_last on public.chats (user_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  status text not null default 'complete' check (status in ('complete','partial','error')),
  input_tokens int,
  output_tokens int,
  model text,
  prompt_version text,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "own messages read" on public.messages for select using (auth.uid() = user_id);
create policy "own messages insert user role" on public.messages for insert with check (auth.uid() = user_id and role = 'user');
create index messages_chat_created on public.messages (chat_id, created_at);

-- ---------- memory ----------
create table public.memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('person','situation','preference')),
  text text not null,
  source_chat_id uuid,
  last_referenced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.memory_facts enable row level security;
create policy "own facts read" on public.memory_facts for select using (auth.uid() = user_id);
create policy "own facts delete" on public.memory_facts for delete using (auth.uid() = user_id);

create table public.memory_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  summary text not null default '',
  facts_hash text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.memory_summaries enable row level security;
create policy "own summary read" on public.memory_summaries for select using (auth.uid() = user_id);

-- ---------- quotes ----------
create table public.daily_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  language text not null check (language in ('he','en')),
  text text not null,
  theme text not null,
  personal_day int not null,
  batch_id uuid not null,
  prompt_version text not null,
  model text not null,
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, for_date)
);
alter table public.daily_quotes enable row level security;
create policy "own quotes read" on public.daily_quotes for select using (auth.uid() = user_id);
create policy "own quotes mark shared" on public.daily_quotes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.quote_fallbacks (
  id serial primary key,
  language text not null check (language in ('he','en')),
  text text not null,
  theme text not null
);
alter table public.quote_fallbacks enable row level security;
create policy "fallbacks readable" on public.quote_fallbacks for select using (auth.role() = 'authenticated');

-- ---------- partners & compatibility ----------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  full_name text not null,
  full_name_script text not null check (full_name_script in ('he','latin')),
  dob date not null,
  numbers jsonb not null,
  engine_version text not null,
  created_at timestamptz not null default now()
);
alter table public.partners enable row level security;
create policy "own partners" on public.partners for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.compatibility_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  language text not null check (language in ('he','en')),
  numbers jsonb not null,
  narrative jsonb not null,
  engine_version text not null,
  prompt_version text not null,
  model text not null,
  created_at timestamptz not null default now()
);
alter table public.compatibility_readings enable row level security;
create policy "own readings read" on public.compatibility_readings for select using (auth.uid() = user_id);

-- ---------- usage & spend ----------
create table public.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  message_count int not null default 0,
  primary key (user_id, date)
);
alter table public.usage_daily enable row level security;
create policy "own usage read" on public.usage_daily for select using (auth.uid() = user_id);

create table public.spend_daily (
  date date primary key,
  usd numeric(10,4) not null default 0
);
alter table public.spend_daily enable row level security; -- service role only

-- ---------- content & prompts ----------
create table public.content_meanings (
  number_type text not null check (number_type in ('life_path','expression','soul_urge','personality','birthday')),
  value int not null,
  language text not null check (language in ('he','en')),
  title text not null,
  body text not null,
  approved boolean not null default false,
  primary key (number_type, value, language)
);
alter table public.content_meanings enable row level security;
create policy "meanings readable" on public.content_meanings for select using (auth.role() = 'authenticated');

create table public.prompt_versions (
  id serial primary key,
  kind text not null check (kind in ('mentor','quotes','compat','memory','title')),
  version text not null,
  body text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (kind, version)
);
alter table public.prompt_versions enable row level security; -- service role only

-- ---------- push ----------
create table public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android')),
  notify_time time not null default '08:00',
  tz text not null default 'Asia/Jerusalem',
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "own tokens" on public.push_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- entitlements (P1) ----------
create table public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free',
  source text,
  expires_at timestamptz
);
alter table public.entitlements enable row level security;
create policy "own entitlement read" on public.entitlements for select using (auth.uid() = user_id);

-- ---------- functions ----------
-- Atomic free-tier cap. Returns remaining messages after consuming one, or -1 if none left.
create or replace function public.check_and_increment_usage(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  free_daily_messages constant int := 5;
  current_count int;
  tier text;
begin
  select coalesce(e.tier, 'free') into tier from (select 1) s left join public.entitlements e on e.user_id = p_user;
  insert into public.usage_daily (user_id, date, message_count) values (p_user, current_date, 0)
    on conflict (user_id, date) do nothing;
  select message_count into current_count from public.usage_daily where user_id = p_user and date = current_date for update;
  if tier = 'free' and current_count >= free_daily_messages then
    return -1;
  end if;
  update public.usage_daily set message_count = message_count + 1 where user_id = p_user and date = current_date;
  if tier = 'free' then
    return free_daily_messages - current_count - 1;
  end if;
  return 999;
end $$;
revoke all on function public.check_and_increment_usage(uuid) from public;
grant execute on function public.check_and_increment_usage(uuid) to service_role;

-- Today's quote or a fallback in the user's language.
create or replace function public.today_quote(p_user uuid)
returns table (text text, theme text, is_fallback boolean)
language sql security definer set search_path = public stable as $$
  select q.text, q.theme, false from public.daily_quotes q where q.user_id = p_user and q.for_date = current_date
  union all
  select f.text, f.theme, true from public.quote_fallbacks f
    join public.profiles p on p.user_id = p_user and p.language = f.language
    where not exists (select 1 from public.daily_quotes q where q.user_id = p_user and q.for_date = current_date)
    order by 3, random() limit 1;
$$;
grant execute on function public.today_quote(uuid) to authenticated;
```

- [ ] **Step 3: Seed**

`supabase/seed.sql`:
```sql
insert into public.content_meanings (number_type, value, language, title, body, approved) values
('life_path', 1, 'en', 'The Leader', 'Independent, driven and original. Your path is about learning to lead without needing to control.', false),
('life_path', 1, 'he', 'המובילה', 'עצמאית, נחושה ומקורית. הדרך שלך היא ללמוד להוביל בלי צורך לשלוט.', false),
('life_path', 2, 'en', 'The Peacemaker', 'Sensitive, cooperative and intuitive. Your path is about partnership without losing yourself.', false),
('life_path', 2, 'he', 'המפשרת', 'רגישה, משתפת פעולה ואינטואיטיבית. הדרך שלך היא שותפות בלי לאבד את עצמך.', false),
('life_path', 3, 'en', 'The Creator', 'Expressive, joyful and social. Your path is about turning feelings into creation.', false),
('life_path', 3, 'he', 'היוצרת', 'מבטאת, שמחה וחברותית. הדרך שלך היא להפוך רגש ליצירה.', false),
('life_path', 4, 'en', 'The Builder', 'Grounded, loyal and practical. Your path is about building foundations that last.', false),
('life_path', 4, 'he', 'הבונה', 'מחוברת לקרקע, נאמנה ומעשית. הדרך שלך היא לבנות יסודות שמחזיקים.', false),
('life_path', 5, 'en', 'The Free Spirit', 'Curious, adaptable and magnetic. Your path is about freedom with commitment.', false),
('life_path', 5, 'he', 'הרוח החופשית', 'סקרנית, גמישה ומגנטית. הדרך שלך היא חופש עם מחויבות.', false),
('life_path', 6, 'en', 'The Nurturer', 'Loving, responsible and devoted. Your path is about giving without over-giving.', false),
('life_path', 6, 'he', 'המטפחת', 'אוהבת, אחראית ומסורה. הדרך שלך היא לתת בלי לתת יותר מדי.', false),
('life_path', 7, 'en', 'The Seeker', 'Deep, analytical and spiritual. Your path is about trusting what you cannot yet prove.', false),
('life_path', 7, 'he', 'המחפשת', 'עמוקה, אנליטית ורוחנית. הדרך שלך היא לבטוח במה שעוד אי אפשר להוכיח.', false),
('life_path', 8, 'en', 'The Powerhouse', 'Ambitious, capable and strong. Your path is about power that serves love.', false),
('life_path', 8, 'he', 'הכוח', 'שאפתנית, מוכשרת וחזקה. הדרך שלך היא כוח שמשרת אהבה.', false),
('life_path', 9, 'en', 'The Old Soul', 'Compassionate, wise and generous. Your path is about letting go to receive.', false),
('life_path', 9, 'he', 'הנשמה הוותיקה', 'חומלת, חכמה ונדיבה. הדרך שלך היא לשחרר כדי לקבל.', false),
('life_path', 11, 'en', 'The Illuminator', 'Intuitive and inspiring. Your path is about channeling sensitivity into light for others.', false),
('life_path', 11, 'he', 'המאירה', 'אינטואיטיבית ומעוררת השראה. הדרך שלך היא להפוך רגישות לאור עבור אחרים.', false),
('life_path', 22, 'en', 'The Master Builder', 'Visionary and practical. Your path is about turning big dreams into real structures.', false),
('life_path', 22, 'he', 'הבונה הגדולה', 'בעלת חזון ומעשית. הדרך שלך היא להפוך חלומות גדולים למבנים אמיתיים.', false),
('life_path', 33, 'en', 'The Master Teacher', 'Devoted and healing. Your path is about love as service.', false),
('life_path', 33, 'he', 'המורה הגדולה', 'מסורה ומרפאה. הדרך שלך היא אהבה כשירות.', false);

insert into public.quote_fallbacks (language, text, theme) values
('en', 'You were never too much. You were waiting for someone who could hold all of you.', 'find_partner'),
('en', 'The love you keep giving away is the love you are learning to give yourself.', 'grow_as_woman'),
('en', 'Your numbers do not decide your story. They show you where your power already lives.', 'understand_numbers'),
('he', 'מעולם לא היית יותר מדי. חיכית למישהו שיוכל להכיל את כולך.', 'find_partner'),
('he', 'האהבה שאת ממשיכה לתת החוצה היא האהבה שאת לומדת לתת לעצמך.', 'grow_as_woman'),
('he', 'המספרים שלך לא מחליטים את הסיפור שלך. הם מראים לך איפה הכוח שלך כבר גר.', 'understand_numbers');
```

- [ ] **Step 4: Start local Supabase and apply**

```bash
npx supabase start
npx supabase db reset
```
Expected: migration applied, seed loaded, output shows API URL `http://127.0.0.1:54321` and an anon key. Copy the anon key for Task 9.

- [ ] **Step 5: Verify the cap function**

```bash
npx supabase db query "select public.check_and_increment_usage('00000000-0000-0000-0000-000000000001'::uuid);"
```
Expected: error about foreign key (no such user) — that proves the function runs. Then verify with a real user after Task 9's first sign-in, expecting `4` on first call and `-1` on the sixth.

- [ ] **Step 6: Generate types**

```bash
npx supabase gen types typescript --local > packages/shared/src/database.types.ts
```
Append to `packages/shared/src/index.ts`:
```ts
export type { Database } from './database.types';
```
Add root script in `package.json`:
```json
"db:types": "supabase gen types typescript --local > packages/shared/src/database.types.ts"
```

- [ ] **Step 7: Typecheck and commit**

```bash
pnpm --filter @gan-eden/shared typecheck
git add supabase packages/shared package.json
git commit -m "feat(db): core schema, RLS, usage cap function, seed"
```

---

### Task 7: Expo app scaffold with NativeWind and theme

**Files:**
- Create: `apps/mobile/*` (Expo template), `apps/mobile/tailwind.config.js`, `global.css`, `babel.config.js`, `metro.config.js`, `nativewind-env.d.ts`, `src/lib/theme.ts`
- Modify: `apps/mobile/app.json`, `apps/mobile/package.json`, `apps/mobile/tsconfig.json`

**Interfaces:**
- Produces: `theme.colors` tokens (`cream`, `blush`, `rose`, `roseDeep`, `mocha`, `ink`, `muted`) usable as Tailwind classes (`bg-cream`, `text-mocha`…); app icon/splash wired to `assets/icon/*`.

- [ ] **Step 1: Create the app**

```bash
pnpm create expo-app@latest apps/mobile --template default
cd apps/mobile
pnpm expo install nativewind tailwindcss@^3.4.17 react-native-reanimated react-native-safe-area-context
cd ../..
```
Then in `apps/mobile/package.json` set `"name": "@gan-eden/mobile"` and add:
```json
"dependencies": {
  "@gan-eden/numerology": "workspace:*",
  "@gan-eden/shared": "workspace:*"
}
```
(merge into the existing `dependencies`), then `pnpm install` at root.

- [ ] **Step 2: Theme tokens**

`apps/mobile/src/lib/theme.ts`:
```ts
export const colors = {
  cream: '#FFF7F4',
  blush: '#F6E3DF',
  blushDeep: '#EFCFC9',
  rose: '#B98577',
  roseDeep: '#8E5E4E',
  gold: '#E3B4B0',
  mocha: '#3E2A25',
  ink: '#2B1E1B',
  muted: '#8A7470',
  white: '#FFFFFF',
} as const;

export const radius = { card: 24, pill: 999, field: 16 } as const;
```

`apps/mobile/tailwind.config.js`:
```js
const { colors } = require('./src/lib/theme.ts');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: { colors, borderRadius: { card: '24px', field: '16px' } } },
  plugins: [],
};
```
Note: Tailwind config is CommonJS; requiring a `.ts` file works because Expo's Metro/Babel do not run this file — Node does. To keep it simple, make `theme.ts` CommonJS-safe by also creating `apps/mobile/src/lib/theme.js` with the same `colors` object and `module.exports = { colors }`, and have `tailwind.config.js` require `./src/lib/theme.js`. Keep both files in sync (a unit test in Task 10 asserts they match).

`apps/mobile/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`apps/mobile/babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
```

`apps/mobile/metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

`apps/mobile/nativewind-env.d.ts`:
```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 3: app.json**

Replace the `expo` block's relevant keys:
```json
{
  "expo": {
    "name": "Gan Eden",
    "slug": "gan-eden",
    "scheme": "ganeden",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "../../assets/icon/icon.png",
    "userInterfaceStyle": "light",
    "splash": { "image": "../../assets/icon/splash-icon.png", "resizeMode": "contain", "backgroundColor": "#FFF7F4" },
    "ios": { "supportsTablet": false, "bundleIdentifier": "co.ganeden.app" },
    "android": {
      "package": "co.ganeden.app",
      "adaptiveIcon": { "foregroundImage": "../../assets/icon/adaptive-icon-foreground.png", "backgroundColor": "#F6E3DF" }
    },
    "plugins": ["expo-router"],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 4: Replace the template app with a minimal root**

Delete the template's `app/(tabs)` and `components/` folders. Create:

`apps/mobile/app/_layout.tsx`:
```tsx
import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`apps/mobile/app/index.tsx`:
```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <Text className="font-serif text-4xl text-roseDeep">Gan Eden</Text>
    </View>
  );
}
```

- [ ] **Step 5: Run in Expo Go**

```bash
cd apps/mobile && pnpm expo start
```
Expected: QR code; on a phone with Expo Go, a cream screen with "Gan Eden" in rose. Press `q` to quit.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): expo scaffold with nativewind and brand theme"
```

---

### Task 7a: Design system, gallery, and web target

**Files:**
- Create: `apps/mobile/src/ui/tokens.ts`, `Text.tsx`, `Button.tsx`, `Card.tsx`, `Field.tsx`, `Choice.tsx`, `NumberBadge.tsx`, `Avatar.tsx`, `Icon.tsx`, `Screen.tsx`, `StepFrame.tsx`, `QuoteCard.tsx`, `index.ts`, `apps/mobile/app/dev/gallery.tsx`, `apps/mobile/src/ui/Button.test.tsx`
- Modify: `apps/mobile/tailwind.config.js`, `src/lib/theme.ts`, `src/lib/theme.js` (tokens become the source), `app.json` (web), `package.json`

**Interfaces:**
- Consumes: approved values from `docs/design/tokens.md` (Task 0). The values below are the pre-approval defaults from the brand assets; replace them with the approved ones — the component API does not change.
- Produces (all exported from `src/ui/index.ts`):
  - `tokens` — `{ color, font, space, radius, shadow, motion }`
  - `<Text variant="display|title|heading|body|caption" tone="primary|muted|accent|inverse" align?>`
  - `<Button title onPress variant="primary|secondary|ghost" size="md|lg" loading disabled testID>`
  - `<Card padded? raised?>`
  - `<Field label value onChangeText error? {...TextInputProps}>`
  - `<Choice label selected onPress testID>`
  - `<NumberBadge value size="sm|lg">` (rose-gold gradient text)
  - `<Avatar size="sm|md|lg">` (Eden's photo)
  - `<Icon name size color flipInRtl?>`
  - `<Screen scroll? padded?>` and `<StepFrame step total title subtitle? cta ctaDisabled onCta children>`
  - `<QuoteCard text name date variant="story|square|inline">`

- [ ] **Step 1: Fonts + web**

```bash
cd apps/mobile
pnpm expo install expo-font @expo-google-fonts/heebo @expo-google-fonts/cormorant-garamond @expo-google-fonts/frank-ruhl-libre expo-linear-gradient react-native-web react-dom @expo/metro-runtime
cd ../..
```
In `app.json` add `"web": { "bundler": "metro", "output": "single" }`. Add script `"web": "expo start --web"` to `apps/mobile/package.json`.

- [ ] **Step 2: Tokens**

`apps/mobile/src/ui/tokens.ts`:
```ts
export const tokens = {
  color: {
    surface: '#FFF7F4',
    surfaceRaised: '#FFFFFF',
    surfaceTint: '#F6E3DF',
    border: '#EFCFC9',
    accent: '#8E5E4E',
    accentSoft: '#B98577',
    accentGlow: '#E3B4B0',
    textPrimary: '#2B1E1B',
    textSecondary: '#3E2A25',
    textMuted: '#8A7470',
    textInverse: '#FFFFFF',
    danger: '#B4443C',
  },
  gradient: { accent: ['#8E5E4E', '#B98577', '#E3B4B0'] as const },
  font: {
    display: { en: 'CormorantGaramond_500Medium', he: 'FrankRuhlLibre_500Medium' },
    body: 'Heebo_400Regular',
    bodyBold: 'Heebo_600SemiBold',
  },
  size: { display: 40, title: 28, heading: 20, body: 16, caption: 13 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { card: 24, field: 16, pill: 999 },
  shadow: { card: { shadowColor: '#8E5E4E', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 } },
  motion: { fast: 150, base: 250, reveal: 600 },
} as const;
```
Make `src/lib/theme.ts` re-export `tokens.color` as `colors` (keeps T7's Tailwind wiring) and update `theme.js` to the same values; keep the sync test from T10.

- [ ] **Step 3: Failing component test**

`apps/mobile/src/ui/Button.test.tsx`:
```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from './Button';

it('calls onPress and exposes disabled state', () => {
  const onPress = jest.fn();
  const { getByRole, rerender } = render(<Button title="Go" onPress={onPress} />);
  fireEvent.press(getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<Button title="Go" onPress={onPress} disabled />);
  expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
});
```
Run `pnpm --filter @gan-eden/mobile test` → FAIL (module missing).

- [ ] **Step 4: Primitives**

`apps/mobile/src/ui/Text.tsx`:
```tsx
import { Text as RNText, type TextProps } from 'react-native';
import { currentLanguage } from '../lib/i18n';
import { tokens } from './tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption';
type Tone = 'primary' | 'muted' | 'accent' | 'inverse';
const toneColor: Record<Tone, string> = {
  primary: tokens.color.textPrimary, muted: tokens.color.textMuted, accent: tokens.color.accent, inverse: tokens.color.textInverse,
};

export function Text({ variant = 'body', tone = 'primary', style, ...p }: TextProps & { variant?: Variant; tone?: Tone }) {
  const lang = currentLanguage();
  const isDisplay = variant === 'display' || variant === 'title';
  const family = isDisplay ? tokens.font.display[lang] : variant === 'heading' ? tokens.font.bodyBold : tokens.font.body;
  return (
    <RNText
      {...p}
      style={[{ fontFamily: family, fontSize: tokens.size[variant], lineHeight: tokens.size[variant] * (isDisplay ? 1.15 : 1.5), color: toneColor[tone], writingDirection: lang === 'he' ? 'rtl' : 'ltr' }, style]}
    />
  );
}
```

`apps/mobile/src/ui/Button.tsx`:
```tsx
import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';

type Props = { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'md' | 'lg'; loading?: boolean; disabled?: boolean; testID?: string; style?: ViewStyle };

export function Button({ title, onPress, variant = 'primary', size = 'lg', loading, disabled, testID, style }: Props) {
  const bg = variant === 'primary' ? tokens.color.accent : variant === 'secondary' ? tokens.color.surfaceTint : 'transparent';
  const tone = variant === 'primary' ? 'inverse' : 'accent';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: bg, borderRadius: tokens.radius.pill, paddingVertical: size === 'lg' ? 16 : 12, paddingHorizontal: tokens.space.xl, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : tokens.color.accent} /> : <Text variant="heading" tone={tone}>{title}</Text>}
    </Pressable>
  );
}
```

`apps/mobile/src/ui/Card.tsx`:
```tsx
import { View, type ViewProps } from 'react-native';
import { tokens } from './tokens';
export function Card({ raised = true, style, ...p }: ViewProps & { raised?: boolean }) {
  return <View {...p} style={[{ backgroundColor: tokens.color.surfaceRaised, borderRadius: tokens.radius.card, padding: tokens.space.xl }, raised && tokens.shadow.card, style]} />;
}
```

`apps/mobile/src/ui/Field.tsx`:
```tsx
import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ marginBottom: tokens.space.lg }}>
      <Text variant="caption" tone="muted" style={{ marginBottom: tokens.space.sm }}>{label}</Text>
      <TextInput
        placeholderTextColor={tokens.color.textMuted}
        style={{ borderWidth: 1, borderColor: error ? tokens.color.danger : tokens.color.border, borderRadius: tokens.radius.field, backgroundColor: tokens.color.surfaceRaised, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, fontSize: tokens.size.body, fontFamily: tokens.font.body, color: tokens.color.textPrimary }}
        {...p}
      />
      {error ? <Text variant="caption" style={{ color: tokens.color.danger, marginTop: tokens.space.xs }}>{error}</Text> : null}
    </View>
  );
}
```

`apps/mobile/src/ui/Choice.tsx`:
```tsx
import { Pressable } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
export function Choice({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress}
      style={{ marginBottom: tokens.space.md, borderRadius: tokens.radius.card, borderWidth: 1, borderColor: selected ? tokens.color.accent : tokens.color.border, backgroundColor: selected ? tokens.color.surfaceTint : tokens.color.surfaceRaised, paddingHorizontal: tokens.space.xl, paddingVertical: tokens.space.lg }}>
      <Text variant={selected ? 'heading' : 'body'} tone={selected ? 'accent' : 'primary'}>{label}</Text>
    </Pressable>
  );
}
```

`apps/mobile/src/ui/NumberBadge.tsx`:
```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
// Gradient text is not portable in RN; render the number on a soft gradient disc instead.
export function NumberBadge({ value, size = 'lg' }: { value: number; size?: 'sm' | 'lg' }) {
  const d = size === 'lg' ? 88 : 48;
  return (
    <LinearGradient colors={[...tokens.gradient.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: d, height: d, borderRadius: d / 2, alignItems: 'center', justifyContent: 'center' }}>
      <View><Text variant={size === 'lg' ? 'display' : 'heading'} tone="inverse">{value}</Text></View>
    </LinearGradient>
  );
}
```

`apps/mobile/src/ui/Avatar.tsx`:
```tsx
import { Image } from 'react-native';
export function Avatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const d = { sm: 32, md: 48, lg: 96 }[size];
  return <Image source={require('../../../../assets/brand/mentor-photo.jpg')} style={{ width: d, height: d, borderRadius: d / 2 }} />;
}
```

`apps/mobile/src/ui/Icon.tsx`:
```tsx
import { Ionicons } from '@expo/vector-icons';
import { I18nManager } from 'react-native';
import { tokens } from './tokens';
type Name = keyof typeof Ionicons.glyphMap;
export function Icon({ name, size = 22, color = tokens.color.accent, flipInRtl }: { name: Name; size?: number; color?: string; flipInRtl?: boolean }) {
  return <Ionicons name={name} size={size} color={color} style={flipInRtl && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />;
}
```

`apps/mobile/src/ui/Screen.tsx`:
```tsx
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from './tokens';
export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const inner = <View style={{ flexGrow: 1, paddingHorizontal: tokens.space.xl, paddingVertical: tokens.space.xxl }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

`apps/mobile/src/ui/StepFrame.tsx`:
```tsx
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { Button } from './Button';
import { Screen } from './Screen';
import { Text } from './Text';
import { tokens } from './tokens';
type Props = PropsWithChildren<{ step: number; total: number; title: string; subtitle?: string; cta: string; ctaDisabled?: boolean; onCta: () => void; ctaTestID?: string }>;
export function StepFrame({ step, total, title, subtitle, cta, ctaDisabled, onCta, ctaTestID = 'continue', children }: Props) {
  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: tokens.space.xs, marginBottom: tokens.space.xl }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? tokens.color.accent : tokens.color.border }} />
        ))}
      </View>
      <Text variant="title" tone="accent" style={{ marginBottom: subtitle ? tokens.space.sm : tokens.space.xl }}>{title}</Text>
      {subtitle ? <Text tone="muted" style={{ marginBottom: tokens.space.xl }}>{subtitle}</Text> : null}
      {children}
      <View style={{ flex: 1 }} />
      <Button title={cta} onPress={onCta} disabled={ctaDisabled} testID={ctaTestID} />
    </Screen>
  );
}
```

`apps/mobile/src/ui/QuoteCard.tsx`:
```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Image, View } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
type Props = { text: string; name: string; date: string; variant?: 'story' | 'square' | 'inline' };
const SIZES = { story: { w: 1080, h: 1920 }, square: { w: 1080, h: 1080 }, inline: { w: 342, h: 220 } };
export function QuoteCard({ text, name, date, variant = 'inline' }: Props) {
  const { w, h } = SIZES[variant];
  const scale = w / 342;
  return (
    <LinearGradient colors={[tokens.color.surface, tokens.color.surfaceTint]} style={{ width: w, height: h, borderRadius: variant === 'inline' ? tokens.radius.card : 0, padding: tokens.space.xl * scale, justifyContent: 'space-between' }}>
      <Image source={require('../../../../assets/icon/lotus-mark.png')} style={{ width: 64 * scale, height: 40 * scale, alignSelf: 'center' }} resizeMode="contain" />
      <Text variant="display" tone="accent" style={{ fontSize: 26 * scale, lineHeight: 34 * scale, textAlign: 'center' }}>{text}</Text>
      <View style={{ alignItems: 'center' }}>
        <Text variant="caption" tone="muted" style={{ fontSize: 13 * scale }}>{name} · {date}</Text>
        <Text variant="caption" tone="accent" style={{ fontSize: 12 * scale, marginTop: 4 * scale }}>@eden__harush__ · Gan Eden</Text>
      </View>
    </LinearGradient>
  );
}
```

`apps/mobile/src/ui/index.ts`:
```ts
export { tokens } from './tokens';
export { Text } from './Text';
export { Button } from './Button';
export { Card } from './Card';
export { Field } from './Field';
export { Choice } from './Choice';
export { NumberBadge } from './NumberBadge';
export { Avatar } from './Avatar';
export { Icon } from './Icon';
export { Screen } from './Screen';
export { StepFrame } from './StepFrame';
export { QuoteCard } from './QuoteCard';
```

- [ ] **Step 5: Load fonts in the root layout**

In `app/_layout.tsx` add `useFonts` from `expo-font` with `Heebo_400Regular`, `Heebo_600SemiBold`, `CormorantGaramond_500Medium`, `FrankRuhlLibre_500Medium`; keep the splash until both fonts and i18n are ready.

- [ ] **Step 6: Gallery route**

`apps/mobile/app/dev/gallery.tsx`:
```tsx
import { View } from 'react-native';
import { Avatar, Button, Card, Choice, Field, Icon, NumberBadge, QuoteCard, Screen, Text, tokens } from '../../src/ui';
import { setLanguage, currentLanguage } from '../../src/lib/i18n';

export default function Gallery() {
  if (!__DEV__) return null;
  const lang = currentLanguage();
  const row = { flexDirection: 'row' as const, gap: tokens.space.md, alignItems: 'center' as const, marginBottom: tokens.space.lg };
  return (
    <Screen>
      <View style={row}>
        <Button title="HE" variant={lang === 'he' ? 'primary' : 'secondary'} size="md" onPress={() => setLanguage('he')} />
        <Button title="EN" variant={lang === 'en' ? 'primary' : 'secondary'} size="md" onPress={() => setLanguage('en')} />
      </View>
      <Text variant="display" tone="accent">Display 40</Text>
      <Text variant="title" tone="accent">Title 28</Text>
      <Text variant="heading">Heading 20</Text>
      <Text>Body 16 — בחזרה לגן העדן הפנימי שלך</Text>
      <Text variant="caption" tone="muted">Caption 13</Text>
      <View style={{ height: tokens.space.xl }} />
      <View style={row}><Button title="Primary" onPress={() => {}} /><Button title="Secondary" variant="secondary" onPress={() => {}} /><Button title="Ghost" variant="ghost" onPress={() => {}} /></View>
      <View style={row}><Button title="Loading" loading onPress={() => {}} /><Button title="Disabled" disabled onPress={() => {}} /></View>
      <Field label="Label" placeholder="Placeholder" />
      <Field label="With error" value="x" error="Something is wrong" />
      <Choice label="Unselected" selected={false} onPress={() => {}} />
      <Choice label="Selected" selected onPress={() => {}} />
      <View style={row}><NumberBadge value={7} /><NumberBadge value={11} size="sm" /><Avatar size="lg" /><Avatar /><Icon name="chevron-forward" flipInRtl /></View>
      <Card><Text variant="heading">Card</Text><Text tone="muted">Raised surface with 24 radius.</Text></Card>
      <View style={{ height: tokens.space.xl }} />
      <QuoteCard text="You were never too much. You were waiting for someone who could hold all of you." name="Maya" date="27.8" />
    </Screen>
  );
}
```

- [ ] **Step 7: Visual review**

```bash
cd apps/mobile && pnpm web
```
Open `http://localhost:8081/dev/gallery` in Chrome; screenshot in EN and HE; fix anything that reads as generic or misaligned. Then on the Android emulator: `pnpm expo start --android`, navigate to the gallery, `adb exec-out screencap -p > docs/design/gallery-android.png`. Attach both screenshots to `docs/design/mockups.md`.

- [ ] **Step 8: Tests + commit**

```bash
pnpm --filter @gan-eden/mobile test
pnpm --filter @gan-eden/mobile typecheck
git add apps/mobile docs/design
git commit -m "feat(mobile): design system primitives, gallery, web target"
```

**Onboarding note (from approved mockups):** name and birthday are ONE step — replace Task 11's `name.tsx` + `birthday.tsx` with a single `about.tsx` (`Field` for full name + a day/month/year row, `StepFrame step={2} total={4}`); the flow is Language → About → Status → Goals, so `total={4}` everywhere and the Maestro flow drops one `continue` tap.

**Downstream note:** Tasks 9, 11, 12 must import from `../../src/ui` (not `src/components/ui`); replace `Screen/Button/TextField/Choice/NumberCard` with `Screen/Button/Field/Choice/NumberBadge + Card`, and wrap each onboarding step in `<StepFrame step={n} total={5} …>` instead of hand-built title + spacer + button. The `src/components/ui/*` files listed in those tasks are superseded by this task.

---

### Task 8: i18n (HE/EN) and RTL

**Files:**
- Create: `apps/mobile/src/lib/i18n/index.ts`, `he.json`, `en.json`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Produces: `initI18n(): Promise<void>`, `setLanguage(lang: Language): Promise<void>` (persists, flips RTL, reloads if direction changed), `useT()` = `useTranslation().t`. Keys used by later tasks are listed in `en.json` below — later tasks must add keys **to both files**.

- [ ] **Step 1: Install**

```bash
cd apps/mobile && pnpm expo install expo-localization expo-updates @react-native-async-storage/async-storage && pnpm add i18next react-i18next && cd ../..
```

- [ ] **Step 2: Resources**

`apps/mobile/src/lib/i18n/en.json`:
```json
{
  "app": { "name": "Gan Eden" },
  "common": { "continue": "Continue", "back": "Back", "skip": "Skip", "retry": "Try again" },
  "auth": {
    "title": "Back to your inner Garden of Eden",
    "emailLabel": "Your email",
    "sendCode": "Send me a code",
    "codeLabel": "6-digit code",
    "verify": "Verify",
    "sent": "We sent a code to {{email}}"
  },
  "onboarding": {
    "language": { "title": "Choose your language", "he": "עברית", "en": "English" },
    "name": { "title": "What's your full name?", "hint": "As written on your ID — your numbers come from it", "placeholder": "Full name" },
    "birthday": { "title": "When were you born?" },
    "status": {
      "title": "Where are you in love right now?",
      "single": "Single", "dating": "Dating", "relationship": "In a relationship", "married": "Married"
    },
    "goals": {
      "title": "What are you here for?",
      "subtitle": "Choose everything that speaks to you",
      "find_partner": "Finding my partner",
      "improve_relationship": "Improving my relationship",
      "grow_as_woman": "Growing as a woman",
      "heal_past": "Healing from the past",
      "understand_numbers": "Understanding my numbers",
      "confidence": "Confidence & self-worth"
    },
    "calculating": { "title": "Reading your numbers…" },
    "reveal": { "title": "Your numbers, {{name}}", "cta": "Enter your garden" }
  },
  "numbers": {
    "life_path": "Life Path", "expression": "Expression", "soul_urge": "Soul Urge",
    "personality": "Personality", "birthday": "Birthday", "personalDay": "Personal day {{n}}"
  },
  "tabs": { "home": "Home", "chat": "Eden", "numbers": "Numbers", "me": "Me" },
  "me": { "signOut": "Sign out", "language": "Language" }
}
```

`apps/mobile/src/lib/i18n/he.json`:
```json
{
  "app": { "name": "גן עדן" },
  "common": { "continue": "המשך", "back": "חזרה", "skip": "דלגי", "retry": "נסי שוב" },
  "auth": {
    "title": "בחזרה לגן העדן הפנימי שלך",
    "emailLabel": "האימייל שלך",
    "sendCode": "שלחו לי קוד",
    "codeLabel": "קוד בן 6 ספרות",
    "verify": "אישור",
    "sent": "שלחנו קוד ל־{{email}}"
  },
  "onboarding": {
    "language": { "title": "באיזו שפה נדבר?", "he": "עברית", "en": "English" },
    "name": { "title": "מה השם המלא שלך?", "hint": "כמו בתעודת הזהות — המספרים שלך נולדים ממנו", "placeholder": "שם מלא" },
    "birthday": { "title": "מתי נולדת?" },
    "status": {
      "title": "איפה את באהבה עכשיו?",
      "single": "רווקה", "dating": "בדייטים", "relationship": "בזוגיות", "married": "נשואה"
    },
    "goals": {
      "title": "בשביל מה הגעת?",
      "subtitle": "בחרי כל מה שמדבר אלייך",
      "find_partner": "למצוא את בן הזוג שלי",
      "improve_relationship": "לשפר את הזוגיות שלי",
      "grow_as_woman": "לצמוח כאישה",
      "heal_past": "להחלים מהעבר",
      "understand_numbers": "להבין את המספרים שלי",
      "confidence": "ביטחון וערך עצמי"
    },
    "calculating": { "title": "קוראת את המספרים שלך…" },
    "reveal": { "title": "המספרים שלך, {{name}}", "cta": "להיכנס לגן" }
  },
  "numbers": {
    "life_path": "מספר נתיב החיים", "expression": "מספר הביטוי", "soul_urge": "מספר הנשמה",
    "personality": "מספר האישיות", "birthday": "מספר יום הלידה", "personalDay": "יום אישי {{n}}"
  },
  "tabs": { "home": "בית", "chat": "עדן", "numbers": "מספרים", "me": "אני" },
  "me": { "signOut": "התנתקות", "language": "שפה" }
}
```

- [ ] **Step 3: i18n module**

`apps/mobile/src/lib/i18n/index.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';
import i18next from 'i18next';
import { I18nManager } from 'react-native';
import { initReactI18next, useTranslation } from 'react-i18next';
import type { Language } from '@gan-eden/shared';
import en from './en.json';
import he from './he.json';

const STORAGE_KEY = 'gan-eden.language';

function deviceLanguage(): Language {
  const code = Localization.getLocales()[0]?.languageCode;
  return code === 'he' ? 'he' : 'en';
}

export async function initI18n(): Promise<Language> {
  const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as Language | null;
  const lang = stored ?? deviceLanguage();
  await i18next.use(initReactI18next).init({
    resources: { en: { translation: en }, he: { translation: he } },
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  applyDirection(lang);
  return lang;
}

function applyDirection(lang: Language): boolean {
  const rtl = lang === 'he';
  I18nManager.allowRTL(rtl);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
    return true; // direction changed → needs reload
  }
  return false;
}

export async function setLanguage(lang: Language): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18next.changeLanguage(lang);
  if (applyDirection(lang)) {
    try {
      await Updates.reloadAsync();
    } catch {
      // In Expo Go dev, reloadAsync may be unavailable — the user can reload manually.
    }
  }
}

export function currentLanguage(): Language {
  return (i18next.language as Language) ?? 'en';
}

export function useT() {
  return useTranslation().t;
}
```

- [ ] **Step 4: Boot i18n in the root layout**

`apps/mobile/app/_layout.tsx`:
```tsx
import '../global.css';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { initI18n } from '../src/lib/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initI18n().finally(() => {
      setReady(true);
      SplashScreen.hideAsync();
    });
  }, []);
  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```
Install: `cd apps/mobile && pnpm expo install expo-splash-screen && cd ../..`

- [ ] **Step 5: Smoke-test**

Update `app/index.tsx` to render `useT()('auth.title')`. Run `pnpm expo start`, verify the Hebrew tagline appears on a Hebrew-locale device and English otherwise.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): i18n with hebrew/english and rtl handling"
```

---

### Task 9: Supabase client, auth by email code, session routing

**Files:**
- Create: `apps/mobile/src/lib/supabase.ts`, `src/lib/query.tsx`, `app/(auth)/welcome.tsx`, `app/(auth)/verify.tsx`, `src/components/ui/Screen.tsx`, `Button.tsx`, `TextField.tsx`, `apps/mobile/.env.example`, `apps/mobile/.env`
- Modify: `apps/mobile/app/_layout.tsx`, `app/index.tsx`, `supabase/config.toml`

**Interfaces:**
- Produces: `supabase` typed client (`SupabaseClient<Database>`); `useSession()` hook returning `{ session, loading }`; UI primitives `Screen`, `Button({ title, onPress, disabled, variant })`, `TextField(props: TextInputProps & { label })`.

- [ ] **Step 1: Install**

```bash
cd apps/mobile && pnpm add @supabase/supabase-js @tanstack/react-query react-native-url-polyfill && cd ../..
```

- [ ] **Step 2: Local auth config — use 6-digit codes**

In `supabase/config.toml` under `[auth.email]` ensure:
```toml
enable_signup = true
enable_confirmations = false
otp_length = 6
```
Local emails are caught by Inbucket at `http://127.0.0.1:54324`. Restart: `npx supabase stop && npx supabase start`.

- [ ] **Step 3: Env + client**

`apps/mobile/.env.example`:
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=replace-with-anon-key-from-supabase-start
```
Copy to `.env` with the real anon key. When testing on a physical phone replace `127.0.0.1` with your computer's LAN IP.

`apps/mobile/src/lib/supabase.ts`:
```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import type { Database } from '@gan-eden/shared';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(url, anon, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, loading };
}
```

`apps/mobile/src/lib/query.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export function QueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: UI primitives**

`apps/mobile/src/components/ui/Screen.tsx`:
```tsx
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow px-6 py-8" keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

`apps/mobile/src/components/ui/Button.tsx`:
```tsx
import { ActivityIndicator, Pressable, Text } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  testID?: string;
};

export function Button({ title, onPress, disabled, loading, variant = 'primary', testID }: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      className={`items-center justify-center rounded-full px-6 py-4 ${isPrimary ? 'bg-roseDeep' : 'bg-transparent'} ${disabled ? 'opacity-40' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#8E5E4E'} />
      ) : (
        <Text className={`text-base font-semibold ${isPrimary ? 'text-white' : 'text-roseDeep'}`}>{title}</Text>
      )}
    </Pressable>
  );
}
```

`apps/mobile/src/components/ui/TextField.tsx`:
```tsx
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm text-muted">{label}</Text>
      <TextInput
        placeholderTextColor="#8A7470"
        className="rounded-field border border-blushDeep bg-white px-4 py-3 text-base text-ink"
        textAlign={undefined /* follows RTL automatically */}
        {...props}
      />
    </View>
  );
}
```

- [ ] **Step 5: Auth screens**

`apps/mobile/app/(auth)/welcome.tsx`:
```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { useT } from '../../src/lib/i18n';
import { supabase } from '../../src/lib/supabase';

export default function Welcome() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) return setError(error.message);
    router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
  }

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Image source={require('../../../../assets/icon/lotus-mark.png')} className="mb-6 h-24 w-40 self-center" resizeMode="contain" />
        <Text className="mb-10 text-center text-3xl text-roseDeep">{t('auth.title')}</Text>
        <TextField
          label={t('auth.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email"
        />
        {error && <Text className="mb-3 text-sm text-red-600">{error}</Text>}
        <Button title={t('auth.sendCode')} onPress={sendCode} loading={busy} disabled={!email.includes('@')} testID="send-code" />
      </View>
    </Screen>
  );
}
```

`apps/mobile/app/(auth)/verify.tsx`:
```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { useT } from '../../src/lib/i18n';
import { supabase } from '../../src/lib/supabase';

export default function Verify() {
  const t = useT();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email ?? '', token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace('/');
  }

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="mb-6 text-center text-lg text-mocha">{t('auth.sent', { email })}</Text>
        <TextField label={t('auth.codeLabel')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} testID="code" />
        {error && <Text className="mb-3 text-sm text-red-600">{error}</Text>}
        <Button title={t('auth.verify')} onPress={verify} loading={busy} disabled={code.length !== 6} testID="verify" />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 6: Root routing by session + profile**

`apps/mobile/app/_layout.tsx` (replace):
```tsx
import '../global.css';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { initI18n } from '../src/lib/i18n';
import { QueryProvider } from '../src/lib/query';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initI18n().finally(() => {
      setReady(true);
      SplashScreen.hideAsync();
    });
  }, []);
  if (!ready) return null;
  return (
    <QueryProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryProvider>
  );
}
```

`apps/mobile/app/index.tsx` (replace) — the gate. `useProfile` is created in Task 10; write it now as described there or temporarily route to onboarding unconditionally:
```tsx
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useProfile } from '../src/features/profile/useProfile';
import { useSession } from '../src/lib/supabase';

export default function Index() {
  const { session, loading } = useSession();
  const profile = useProfile(session?.user.id);
  if (loading || (session && profile.isLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#8E5E4E" />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile.data) return <Redirect href="/(onboarding)/language" />;
  return <Redirect href="/(tabs)/home" />;
}
```

- [ ] **Step 7: Manual test**

Run the app, enter an email, open `http://127.0.0.1:54324` (Inbucket), copy the 6-digit code, verify. Expected: redirected to `/(onboarding)/language` (404 screen until Task 11 — acceptable for this step). Verify with `npx supabase db query "select public.check_and_increment_usage('<your user uuid>'::uuid);"` → `4`.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile supabase/config.toml
git commit -m "feat(mobile): supabase client, email code auth, session gate"
```

---

### Task 10: Profile data layer

**Files:**
- Create: `apps/mobile/src/features/profile/useProfile.ts`, `saveProfile.ts`, `saveProfile.test.ts`, `apps/mobile/src/lib/theme.test.ts`, `apps/mobile/jest.config.js`
- Modify: `apps/mobile/package.json` (scripts, devDeps)

**Interfaces:**
- Consumes: `computeProfile`, `ENGINE_VERSION` from `@gan-eden/numerology`; `ProfileInput` from `@gan-eden/shared`; `Database['public']['Tables']['profiles']['Row']`.
- Produces: `useProfile(userId?: string)` (TanStack query, key `['profile', userId]`), `buildProfileRow(input: ProfileInput, userId: string)` (pure), `saveProfile(input: ProfileInput, userId: string): Promise<void>` (upsert).

- [ ] **Step 1: Jest setup**

```bash
cd apps/mobile && pnpm add -D jest jest-expo @testing-library/react-native @types/jest && cd ../..
```
`apps/mobile/jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop)',
  ],
};
```
Add to `apps/mobile/package.json` scripts: `"test": "jest"`, `"typecheck": "tsc --noEmit"`.

- [ ] **Step 2: Failing tests**

`apps/mobile/src/features/profile/saveProfile.test.ts`:
```ts
import { buildProfileRow } from './saveProfile';

describe('buildProfileRow', () => {
  it('maps input to a profiles row with computed numbers', () => {
    const row = buildProfileRow(
      {
        fullName: 'John',
        script: 'latin',
        dob: '1990-07-15',
        language: 'en',
        relationshipStatus: 'single',
        goals: ['find_partner'],
      },
      'user-1',
    );
    expect(row.user_id).toBe('user-1');
    expect(row.full_name).toBe('John');
    expect(row.full_name_script).toBe('latin');
    expect(row.dob).toBe('1990-07-15');
    expect(row.goals).toEqual(['find_partner']);
    expect(row.engine_version).toBe('default-0.1.0');
    expect(row.numbers).toMatchObject({ lifePath: 5, expression: 2, soulUrge: 6, personality: 5, birthday: 6 });
  });
});
```

`apps/mobile/src/lib/theme.test.ts`:
```ts
import { colors } from './theme';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- tailwind config needs CJS
const cjs = require('./theme.js') as { colors: Record<string, string> };

it('theme.ts and theme.js stay in sync', () => {
  expect(cjs.colors).toEqual(colors);
});
```

- [ ] **Step 3: Run, expect failure**

```bash
pnpm --filter @gan-eden/mobile test
```
Expected: FAIL — `./saveProfile` not found.

- [ ] **Step 4: Implement**

`apps/mobile/src/features/profile/saveProfile.ts`:
```ts
import { computeProfile } from '@gan-eden/numerology';
import type { Database, ProfileInput } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

export function buildProfileRow(input: ProfileInput, userId: string): ProfileInsert {
  const numbers = computeProfile({ fullName: input.fullName, script: input.script, dob: input.dob });
  return {
    user_id: userId,
    full_name: input.fullName,
    full_name_script: input.script,
    dob: input.dob,
    language: input.language,
    relationship_status: input.relationshipStatus,
    goals: input.goals,
    numbers,
    engine_version: numbers.engineVersion,
  };
}

export async function saveProfile(input: ProfileInput, userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(buildProfileRow(input, userId));
  if (error) throw error;
}
```

`apps/mobile/src/features/profile/useProfile.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import type { Database } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
```

- [ ] **Step 5: Run, expect pass**

```bash
pnpm --filter @gan-eden/mobile test
pnpm --filter @gan-eden/mobile typecheck
```
Expected: 2 suites pass. If `supabase.ts` import throws for missing env in tests, add `apps/mobile/jest.setup.js` with `process.env.EXPO_PUBLIC_SUPABASE_URL='http://localhost'; process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY='test';` and `setupFiles: ['./jest.setup.js']` in the jest config.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): profile data layer with computed numbers"
```

---

### Task 11: Onboarding flow

**Files:**
- Create: `apps/mobile/src/store/onboarding.ts`, `src/components/ui/Choice.tsx`, `app/(onboarding)/_layout.tsx`, `language.tsx`, `name.tsx`, `birthday.tsx`, `status.tsx`, `goals.tsx`, `calculating.tsx`, `reveal.tsx`, `src/components/ui/NumberCard.tsx`

**Interfaces:**
- Consumes: `setLanguage`, `useT`, `saveProfile`, `computeProfile`, `GOALS`, `RELATIONSHIP_STATUSES`, `ProfileInputSchema`.
- Produces: Zustand store `useOnboarding()` with `draft: Partial<ProfileInput>`, `set(patch)`, `reset()`; `Choice({ label, selected, onPress, testID })`; `NumberCard({ label, value, meaning? })`.

- [ ] **Step 1: Install**

```bash
cd apps/mobile && pnpm add zustand && pnpm expo install @react-native-community/datetimepicker && cd ../..
```

- [ ] **Step 2: Store and Choice**

`apps/mobile/src/store/onboarding.ts`:
```ts
import { create } from 'zustand';
import type { ProfileInput } from '@gan-eden/shared';

type State = {
  draft: Partial<ProfileInput>;
  set: (patch: Partial<ProfileInput>) => void;
  reset: () => void;
};

export const useOnboarding = create<State>((set) => ({
  draft: { goals: [] },
  set: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: () => set({ draft: { goals: [] } }),
}));
```

`apps/mobile/src/components/ui/Choice.tsx`:
```tsx
import { Pressable, Text } from 'react-native';

type Props = { label: string; selected: boolean; onPress: () => void; testID?: string };

export function Choice({ label, selected, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`mb-3 rounded-card border px-5 py-4 ${selected ? 'border-roseDeep bg-blush' : 'border-blushDeep bg-white'}`}
    >
      <Text className={`text-base ${selected ? 'text-roseDeep font-semibold' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 3: Layout and screens**

`apps/mobile/app/(onboarding)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
```

`apps/mobile/app/(onboarding)/language.tsx`:
```tsx
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Choice } from '../../src/components/ui/Choice';
import { Screen } from '../../src/components/ui/Screen';
import { currentLanguage, setLanguage, useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

export default function LanguageStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  const lang = draft.language ?? currentLanguage();
  return (
    <Screen>
      <Text className="mb-8 text-3xl text-roseDeep">{t('onboarding.language.title')}</Text>
      <Choice label={t('onboarding.language.he')} selected={lang === 'he'} onPress={() => set({ language: 'he' })} testID="lang-he" />
      <Choice label={t('onboarding.language.en')} selected={lang === 'en'} onPress={() => set({ language: 'en' })} testID="lang-en" />
      <View className="flex-1" />
      <Button
        title={t('common.continue')}
        testID="continue"
        onPress={async () => {
          set({ language: lang });
          await setLanguage(lang);
          router.push('/(onboarding)/name');
        }}
      />
    </Screen>
  );
}
```

`apps/mobile/app/(onboarding)/name.tsx`:
```tsx
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

const HEBREW = /[\u05D0-\u05EA]/;

export default function NameStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  const name = draft.fullName ?? '';
  return (
    <Screen>
      <Text className="mb-2 text-3xl text-roseDeep">{t('onboarding.name.title')}</Text>
      <Text className="mb-8 text-base text-muted">{t('onboarding.name.hint')}</Text>
      <TextField
        label={t('onboarding.name.placeholder')}
        value={name}
        onChangeText={(v) => set({ fullName: v, script: HEBREW.test(v) ? 'he' : 'latin' })}
        autoCapitalize="words"
        testID="full-name"
      />
      <View className="flex-1" />
      <Button title={t('common.continue')} testID="continue" disabled={name.trim().length < 2} onPress={() => router.push('/(onboarding)/birthday')} />
    </Screen>
  );
}
```

`apps/mobile/app/(onboarding)/birthday.tsx`:
```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function BirthdayStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  const [date, setDate] = useState<Date>(draft.dob ? new Date(draft.dob) : new Date(1995, 0, 1));
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return (
    <Screen>
      <Text className="mb-8 text-3xl text-roseDeep">{t('onboarding.birthday.title')}</Text>
      <View className="items-center" testID="dob-picker">
        <DateTimePicker value={date} mode="date" display="spinner" maximumDate={eighteenYearsAgo} onChange={(_, d) => d && setDate(d)} />
      </View>
      <View className="flex-1" />
      <Button
        title={t('common.continue')}
        testID="continue"
        onPress={() => {
          set({ dob: toIso(date) });
          router.push('/(onboarding)/status');
        }}
      />
    </Screen>
  );
}
```

`apps/mobile/app/(onboarding)/status.tsx`:
```tsx
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { RELATIONSHIP_STATUSES } from '@gan-eden/shared';
import { Button } from '../../src/components/ui/Button';
import { Choice } from '../../src/components/ui/Choice';
import { Screen } from '../../src/components/ui/Screen';
import { useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

export default function StatusStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  return (
    <Screen>
      <Text className="mb-8 text-3xl text-roseDeep">{t('onboarding.status.title')}</Text>
      {RELATIONSHIP_STATUSES.map((s) => (
        <Choice key={s} label={t(`onboarding.status.${s}`)} selected={draft.relationshipStatus === s} onPress={() => set({ relationshipStatus: s })} testID={`status-${s}`} />
      ))}
      <View className="flex-1" />
      <Button title={t('common.continue')} testID="continue" disabled={!draft.relationshipStatus} onPress={() => router.push('/(onboarding)/goals')} />
    </Screen>
  );
}
```

`apps/mobile/app/(onboarding)/goals.tsx`:
```tsx
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { GOALS, type Goal } from '@gan-eden/shared';
import { Button } from '../../src/components/ui/Button';
import { Choice } from '../../src/components/ui/Choice';
import { Screen } from '../../src/components/ui/Screen';
import { useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

export default function GoalsStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  const goals = draft.goals ?? [];
  const toggle = (g: Goal) => set({ goals: goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g] });
  return (
    <Screen>
      <Text className="mb-2 text-3xl text-roseDeep">{t('onboarding.goals.title')}</Text>
      <Text className="mb-8 text-base text-muted">{t('onboarding.goals.subtitle')}</Text>
      {GOALS.map((g) => (
        <Choice key={g} label={t(`onboarding.goals.${g}`)} selected={goals.includes(g)} onPress={() => toggle(g)} testID={`goal-${g}`} />
      ))}
      <View className="flex-1" />
      <Button title={t('common.continue')} testID="continue" disabled={goals.length === 0} onPress={() => router.replace('/(onboarding)/calculating')} />
    </Screen>
  );
}
```

`apps/mobile/app/(onboarding)/calculating.tsx`:
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ProfileInputSchema } from '@gan-eden/shared';
import { Button } from '../../src/components/ui/Button';
import { saveProfile } from '../../src/features/profile/saveProfile';
import { useT } from '../../src/lib/i18n';
import { supabase } from '../../src/lib/supabase';
import { useOnboarding } from '../../src/store/onboarding';

export default function Calculating() {
  const t = useT();
  const { draft } = useOnboarding();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      const input = ProfileInputSchema.parse(draft);
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('not signed in');
      const started = Date.now();
      await saveProfile(input, data.user.id);
      await qc.invalidateQueries({ queryKey: ['profile', data.user.id] });
      const remaining = 1800 - (Date.now() - started); // let the moment breathe
      setTimeout(() => router.replace('/(onboarding)/reveal'), Math.max(0, remaining));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-cream px-8">
      {error ? (
        <>
          <Text className="mb-4 text-center text-base text-red-600">{error}</Text>
          <Button title={t('common.retry')} onPress={run} />
        </>
      ) : (
        <>
          <ActivityIndicator color="#8E5E4E" size="large" />
          <Text className="mt-6 text-xl text-roseDeep" testID="calculating">{t('onboarding.calculating.title')}</Text>
        </>
      )}
    </View>
  );
}
```

`apps/mobile/src/components/ui/NumberCard.tsx`:
```tsx
import { Text, View } from 'react-native';

type Props = { label: string; value: number; title?: string; body?: string; testID?: string };

export function NumberCard({ label, value, title, body, testID }: Props) {
  return (
    <View testID={testID} className="mb-4 rounded-card bg-white p-5 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm uppercase tracking-wide text-muted">{label}</Text>
        <Text className="text-4xl text-roseDeep">{value}</Text>
      </View>
      {title && <Text className="mt-2 text-lg font-semibold text-ink">{title}</Text>}
      {body && <Text className="mt-1 text-base leading-6 text-mocha">{body}</Text>}
    </View>
  );
}
```

`apps/mobile/app/(onboarding)/reveal.tsx`:
```tsx
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import type { NumerologyProfile } from '@gan-eden/numerology';
import { Button } from '../../src/components/ui/Button';
import { NumberCard } from '../../src/components/ui/NumberCard';
import { Screen } from '../../src/components/ui/Screen';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { useSession } from '../../src/lib/supabase';
import { useOnboarding } from '../../src/store/onboarding';

const ORDER: (keyof Pick<NumerologyProfile, 'lifePath' | 'expression' | 'soulUrge' | 'personality' | 'birthday'>)[] =
  ['lifePath', 'expression', 'soulUrge', 'personality', 'birthday'];
const KEY: Record<(typeof ORDER)[number], string> = {
  lifePath: 'life_path', expression: 'expression', soulUrge: 'soul_urge', personality: 'personality', birthday: 'birthday',
};

export default function Reveal() {
  const t = useT();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const reset = useOnboarding((s) => s.reset);
  if (!profile) return null;
  const numbers = profile.numbers as unknown as NumerologyProfile;
  const firstName = profile.full_name.split(' ')[0];
  return (
    <Screen>
      <Text className="mb-6 text-3xl text-roseDeep" testID="reveal-title">{t('onboarding.reveal.title', { name: firstName })}</Text>
      {ORDER.map((k) => (
        <NumberCard key={k} label={t(`numbers.${KEY[k]}`)} value={numbers[k]} testID={`number-${KEY[k]}`} />
      ))}
      <View className="h-6" />
      <Button
        title={t('onboarding.reveal.cta')}
        testID="enter"
        onPress={() => {
          reset();
          router.replace('/(tabs)/home');
        }}
      />
    </Screen>
  );
}
```

- [ ] **Step 4: Manual test**

Run the app; complete the flow with a Hebrew name and an English name. Expected: Calculating spinner ≥ 1.8 s, then five cards with numbers; `select numbers from profiles` in Supabase Studio (`http://127.0.0.1:54323`) shows the same values. Check RTL: on Hebrew, the "Continue" button text and cards align right.

- [ ] **Step 5: Typecheck + commit**

```bash
pnpm --filter @gan-eden/mobile typecheck
git add apps/mobile
git commit -m "feat(mobile): onboarding flow through numbers reveal"
```

---

### Task 12: Tab shell, Numbers tab with meanings, Me tab

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`, `home.tsx`, `chat.tsx`, `numbers.tsx`, `me.tsx`, `src/features/profile/useMeanings.ts`

**Interfaces:**
- Consumes: `useProfile`, `personalCycles`, `content_meanings` table.
- Produces: `useMeanings(language)` → `Record<'${number_type}:${value}', { title, body }>`; tab routes `/(tabs)/home|chat|numbers|me` that Phases 2–4 fill in.

- [ ] **Step 1: Install icons**

`@expo/vector-icons` ships with the template; no install needed.

- [ ] **Step 2: Meanings hook**

`apps/mobile/src/features/profile/useMeanings.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import type { Language } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

export type Meaning = { title: string; body: string };

export function useMeanings(language: Language) {
  return useQuery({
    queryKey: ['meanings', language],
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<Record<string, Meaning>> => {
      const { data, error } = await supabase.from('content_meanings').select('number_type,value,title,body').eq('language', language);
      if (error) throw error;
      const map: Record<string, Meaning> = {};
      for (const m of data) map[`${m.number_type}:${m.value}`] = { title: m.title, body: m.body };
      return map;
    },
  });
}
```

- [ ] **Step 3: Tabs**

`apps/mobile/app/(tabs)/_layout.tsx`:
```tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useT } from '../../src/lib/i18n';
import { colors } from '../../src/lib/theme';

export default function TabsLayout() {
  const t = useT();
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color }: { color: string }) => <Ionicons name={name} size={22} color={color} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.roseDeep,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.cream, borderTopColor: colors.blushDeep },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: icon('flower-outline') }} />
      <Tabs.Screen name="chat" options={{ title: t('tabs.chat'), tabBarIcon: icon('chatbubble-ellipses-outline') }} />
      <Tabs.Screen name="numbers" options={{ title: t('tabs.numbers'), tabBarIcon: icon('sparkles-outline') }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me'), tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
```

`apps/mobile/app/(tabs)/home.tsx`:
```tsx
import { Text } from 'react-native';
import { personalCycles } from '@gan-eden/numerology';
import { Screen } from '../../src/components/ui/Screen';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { useSession } from '../../src/lib/supabase';

export default function Home() {
  const t = useT();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  if (!profile) return null;
  const today = new Date().toISOString().slice(0, 10);
  const cycles = personalCycles(profile.dob, today);
  return (
    <Screen>
      <Text className="text-3xl text-roseDeep" testID="home-title">{profile.full_name.split(' ')[0]}</Text>
      <Text className="mt-2 text-base text-muted">{t('numbers.personalDay', { n: cycles.personalDay })}</Text>
    </Screen>
  );
}
```

`apps/mobile/app/(tabs)/chat.tsx`:
```tsx
import { Text } from 'react-native';
import { Screen } from '../../src/components/ui/Screen';
import { useT } from '../../src/lib/i18n';

export default function Chat() {
  const t = useT();
  return (
    <Screen>
      <Text className="text-3xl text-roseDeep">{t('tabs.chat')}</Text>
    </Screen>
  );
}
```

`apps/mobile/app/(tabs)/numbers.tsx`:
```tsx
import { Text } from 'react-native';
import type { NumerologyProfile } from '@gan-eden/numerology';
import type { Language } from '@gan-eden/shared';
import { NumberCard } from '../../src/components/ui/NumberCard';
import { Screen } from '../../src/components/ui/Screen';
import { useMeanings } from '../../src/features/profile/useMeanings';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { useSession } from '../../src/lib/supabase';

const ROWS: { key: keyof NumerologyProfile; type: string }[] = [
  { key: 'lifePath', type: 'life_path' },
  { key: 'expression', type: 'expression' },
  { key: 'soulUrge', type: 'soul_urge' },
  { key: 'personality', type: 'personality' },
  { key: 'birthday', type: 'birthday' },
];

export default function Numbers() {
  const t = useT();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const meanings = useMeanings((profile?.language as Language) ?? 'en');
  if (!profile) return null;
  const numbers = profile.numbers as unknown as NumerologyProfile;
  return (
    <Screen>
      <Text className="mb-6 text-3xl text-roseDeep">{t('tabs.numbers')}</Text>
      {ROWS.map(({ key, type }) => {
        const value = numbers[key] as number;
        const m = meanings.data?.[`${type}:${value}`];
        return <NumberCard key={key} label={t(`numbers.${type}`)} value={value} title={m?.title} body={m?.body} testID={`number-${type}`} />;
      })}
    </Screen>
  );
}
```

`apps/mobile/app/(tabs)/me.tsx`:
```tsx
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Choice } from '../../src/components/ui/Choice';
import { Screen } from '../../src/components/ui/Screen';
import { currentLanguage, setLanguage, useT } from '../../src/lib/i18n';
import { supabase } from '../../src/lib/supabase';

export default function Me() {
  const t = useT();
  const lang = currentLanguage();
  return (
    <Screen>
      <Text className="mb-6 text-3xl text-roseDeep">{t('tabs.me')}</Text>
      <Text className="mb-2 text-sm text-muted">{t('me.language')}</Text>
      <Choice label="עברית" selected={lang === 'he'} onPress={() => setLanguage('he')} />
      <Choice label="English" selected={lang === 'en'} onPress={() => setLanguage('en')} />
      <Button
        variant="ghost"
        title={t('me.signOut')}
        testID="sign-out"
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace('/');
        }}
      />
    </Screen>
  );
}
```

- [ ] **Step 4: Manual test**

Run; after onboarding you land on Home showing first name + personal day; Numbers shows five cards, Life Path with title/body from the seed (others have no meaning yet — that is expected until the Mentor's texts arrive); Me → sign out returns to Welcome.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @gan-eden/mobile typecheck
git add apps/mobile
git commit -m "feat(mobile): tab shell, numbers with meanings, me tab"
```

---

### Task 13: Maestro end-to-end flow

**Files:**
- Create: `apps/mobile/.maestro/onboarding.yaml`, `apps/mobile/.maestro/README.md`

**Interfaces:**
- Consumes: testIDs `email`, `send-code`, `code`, `verify`, `lang-en`, `continue`, `full-name`, `status-single`, `goal-find_partner`, `calculating`, `reveal-title`, `enter`, `home-title`.

- [ ] **Step 1: Install Maestro**

Follow https://maestro.mobile.dev/getting-started/installing-maestro (Windows: WSL or the native installer). Verify `maestro --version`.

- [ ] **Step 2: Flow**

`apps/mobile/.maestro/onboarding.yaml`:
```yaml
appId: host.exp.exponent   # Expo Go; switch to co.ganeden.app for dev builds
---
- launchApp
- tapOn:
    id: email
- inputText: "maestro+${TS}@example.com"
- tapOn:
    id: send-code
- assertVisible:
    id: code
# The 6-digit code is read from Inbucket by the runner script (see README), passed as OTP.
- tapOn:
    id: code
- inputText: ${OTP}
- tapOn:
    id: verify
- tapOn:
    id: lang-en
- tapOn:
    id: continue
- tapOn:
    id: full-name
- inputText: "Maya Cohen"
- tapOn:
    id: continue
- tapOn:
    id: continue        # birthday (default date is fine)
- tapOn:
    id: status-single
- tapOn:
    id: continue
- tapOn:
    id: goal-find_partner
- tapOn:
    id: continue
- assertVisible:
    id: calculating
- assertVisible:
    id: reveal-title
    timeout: 15000
- tapOn:
    id: enter
- assertVisible:
    id: home-title
```

`apps/mobile/.maestro/README.md`:
```md
# E2E

1. `npx supabase start` and `pnpm expo start` (Expo Go open on the simulator/emulator).
2. Send the code once manually or fetch it from Inbucket:
   `curl -s http://127.0.0.1:54324/api/v1/mailbox/maestro%2B<TS>@example.com | jq -r '.[0].id'` then read the message body and extract the 6 digits.
3. Run: `maestro test -e TS=$(date +%s) -e OTP=123456 .maestro/onboarding.yaml`

Automating step 2 fully (script that polls Inbucket and injects OTP) is a Phase 5 CI task.
```

- [ ] **Step 3: Run once locally**

Expected: flow passes on the iOS simulator (or Android emulator). If the date picker's `continue` is hidden behind the spinner on small screens, scroll: add `- scrollUntilVisible: { element: { id: continue } }` before that tap.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/.maestro
git commit -m "test(mobile): maestro onboarding flow"
```

---

### Task 14: Docs, env example, definition of done

**Files:**
- Create: `README.md`
- Modify: `docs/ARCHITECTURE.md` (§3.1 session storage note)

- [ ] **Step 1: README**

`README.md`:
```md
# Gan Eden

Numerology & relationship mentoring app. Docs: `docs/PRD.md`, `docs/ARCHITECTURE.md`, plans in `docs/superpowers/plans/`.

## Setup
- Node 24, pnpm 10, Docker Desktop, Expo Go on your phone/simulator.
- `pnpm install`
- `npx supabase start` → copy the anon key into `apps/mobile/.env` (see `.env.example`).
- `pnpm --filter @gan-eden/mobile exec expo start`

## Scripts
- `pnpm test` — all unit tests (engine enforces ≥ 95 % coverage)
- `pnpm typecheck`, `pnpm lint`
- `pnpm db:types` — regenerate `packages/shared/src/database.types.ts` after a migration

## Local services
- API `http://127.0.0.1:54321` · Studio `http://127.0.0.1:54323` · Inbucket (emails) `http://127.0.0.1:54324`
```

- [ ] **Step 2: Architecture note**

In `docs/ARCHITECTURE.md` §3.1 Auth row, replace "session persisted in `expo-secure-store`" with "session persisted in AsyncStorage (Supabase's documented RN adapter; SecureStore's 2 KB limit breaks session JSON) — revisit with an encrypted-storage adapter in Phase 5".

- [ ] **Step 3: Full verification**

```bash
pnpm test
pnpm typecheck
pnpm lint
```
Expected: all green. Then the manual checklist:
- [ ] Fresh install → email code → onboarding in Hebrew (RTL correct) → reveal → Home
- [ ] Sign out → sign in again → lands directly on Home (profile persists)
- [ ] `check_and_increment_usage` returns 4,3,2,1,0 then −1 for that user

- [ ] **Step 4: Commit**

```bash
git add README.md docs/ARCHITECTURE.md
git commit -m "docs: readme and phase-1 notes"
```

---

## Self-review notes

- **Spec coverage (Phase 1 scope):** monorepo (§2) ✔ T1; engine (§7) ✔ T3–T5 with method as replaceable data; schema + RLS + cap function (§4) ✔ T6 — `push_candidates` deliberately deferred to Phase 3 with `push-daily`; app stack (§3.1) ✔ T7–T9; onboarding flow (§8) ✔ T11; RTL rules (§3.3) ✔ Global constraint + T8; testing (§10) ✔ Vitest/Jest/Maestro; Apple/Google sign-in → Phase 5 (roadmap).
- **Not in this phase (by design):** notifications opt-in screen (Phase 3), chat, quotes, compatibility UI, Sentry/PostHog.
- **Type consistency:** `ProfileInput` fields (`fullName, script, dob, language, relationshipStatus, goals`) match `buildProfileRow` and the store; `NumerologyProfile` keys match `reveal.tsx`/`numbers.tsx`; testIDs in T9/T11/T12 match T13.

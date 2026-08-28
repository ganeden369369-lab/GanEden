#!/usr/bin/env node
// Vendors the workspace packages that supabase/functions' deno.json import
// map points at into supabase/functions/_vendor/.
//
// Why: `supabase functions serve` (and `deploy`) bind-mount only
// `supabase/functions` into the edge-runtime container/bundle — an import
// map entry that escapes that directory (e.g. `../../packages/x/src/...`)
// can never resolve there, even though it resolves fine for a bare `deno
// check`/`deno run` on the host filesystem. Vendoring copies the actual
// package sources *inside* `supabase/functions` so the same import map
// specifiers (`@gan-eden/shared`, `@gan-eden/prompts`, `@gan-eden/numerology`)
// resolve to local, in-tree files instead.
//
// Run via `pnpm functions:vendor`, or implicitly via `pnpm functions:serve`.
// `_vendor/` is git-ignored — it is a build artifact, regenerated from
// `packages/*/src` on demand, never hand-edited.

import { existsSync, mkdirSync, readdirSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VENDOR_ROOT = join(ROOT, 'supabase', 'functions', '_vendor');

const PACKAGES = [
  { name: 'shared', src: join(ROOT, 'packages', 'shared', 'src') },
  { name: 'prompts', src: join(ROOT, 'packages', 'prompts', 'src') },
  { name: 'numerology', src: join(ROOT, 'packages', 'numerology', 'src') },
];

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      // *.test.ts is dev-only (vitest); never needed at runtime.
      // database.types.ts is kept — it's generated, not a test, and
      // @gan-eden/shared's index.ts re-exports its `Database` type.
      if (entry.name.endsWith('.test.ts')) continue;
      copyFileSync(srcPath, destPath);
    }
  }
}

if (existsSync(VENDOR_ROOT)) {
  rmSync(VENDOR_ROOT, { recursive: true, force: true });
}
mkdirSync(VENDOR_ROOT, { recursive: true });

for (const pkg of PACKAGES) {
  const dest = join(VENDOR_ROOT, pkg.name);
  copyDir(pkg.src, dest);
  console.log(`vendored ${pkg.name}: ${pkg.src} -> ${dest}`);
}

console.log('vendor-functions: done.');

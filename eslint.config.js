import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**', '**/database.types.ts', 'docs/**', 'assets/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  {
    // CommonJS tooling config files (Node-executed, not bundled by Metro/Babel).
    files: ['**/*.config.js', 'apps/mobile/src/lib/theme.js', 'apps/mobile/jest.setup.js'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        jest: 'readonly',
      },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Node-executed ESM scripts (run directly via `node`, not bundled).
    files: ['apps/mobile/.maestro/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
);

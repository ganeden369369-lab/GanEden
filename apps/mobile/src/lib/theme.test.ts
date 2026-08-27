import { colors } from './theme';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- tailwind config needs CJS
const cjs = require('./theme.js') as { colors: Record<string, string> };

it('theme.ts and theme.js stay in sync', () => {
  expect(cjs.colors).toEqual(colors);
});

import { describe, expect, it } from 'vitest';
import { buildTitlePrompt } from './title';

describe('buildTitlePrompt', () => {
  it('output prompt contains the first user message', () => {
    const { user } = buildTitlePrompt({
      language: 'en',
      firstUserMessage: 'Should I text him back?',
    });
    expect(user).toContain('Should I text him back?');
  });

  it('system instructs a short, plain title with no quotes or emoji', () => {
    const { system } = buildTitlePrompt({ language: 'en', firstUserMessage: 'anything' });
    expect(system).toMatch(/5 words|five words/i);
    expect(system).toMatch(/quote|emoji/i);
  });
});

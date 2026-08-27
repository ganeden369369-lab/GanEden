import { describe, expect, it } from 'vitest';
import { MemoryExtractionSchema, buildMemoryExtractionInput } from './memory';

describe('MemoryExtractionSchema', () => {
  it('accepts a valid object', () => {
    const result = MemoryExtractionSchema.safeParse({
      facts: [
        { category: 'person', text: 'Her sister Dana lives in Haifa.' },
        { category: 'situation', text: 'Recently ended a long relationship.' },
      ],
      summary: 'She is processing a breakup and leans on her sister for support.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid category', () => {
    const result = MemoryExtractionSchema.safeParse({
      facts: [{ category: 'hobby', text: 'Loves painting on weekends.' }],
      summary: 'Enjoys painting.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 8 facts', () => {
    const facts = Array.from({ length: 9 }, (_, i) => ({
      category: 'preference' as const,
      text: `Fact number ${i} about her life and choices.`,
    }));
    const result = MemoryExtractionSchema.safeParse({ facts, summary: 'Summary text.' });
    expect(result.success).toBe(false);
  });
});

describe('buildMemoryExtractionInput', () => {
  it('asks for strict JSON only and embeds the exchange', () => {
    const { system, user } = buildMemoryExtractionInput({
      language: 'en',
      existingSummary: 'She is single and focused on her career.',
      existingFacts: ['Works as a designer.'],
      exchange: { user: 'I finally called my mom back.', assistant: 'That took courage, Noa.' },
    });
    expect(system).toMatch(/JSON/);
    expect(system).not.toMatch(/```/);
    expect(user).toContain('Works as a designer.');
    expect(user).toContain('I finally called my mom back.');
    expect(user).toContain('That took courage, Noa.');
  });

  it('produces Hebrew instructions when language is he', () => {
    const { system } = buildMemoryExtractionInput({
      language: 'he',
      existingSummary: '',
      existingFacts: [],
      exchange: { user: 'שלום', assistant: 'שלום נועה' },
    });
    expect(system).toMatch(/JSON/);
  });
});

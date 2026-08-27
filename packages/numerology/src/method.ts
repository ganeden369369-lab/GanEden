export type Script = 'he' | 'latin';

export interface Method {
  /** Identifier stored alongside ENGINE_VERSION on generated data. */
  id: string;
  masters: readonly number[];
  letters: Record<Script, Readonly<Record<string, number>>>;
  vowels: Record<Script, ReadonlySet<string>>;
}

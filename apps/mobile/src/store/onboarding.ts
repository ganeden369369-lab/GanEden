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

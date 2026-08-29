import { create } from 'zustand';

export type ChatStreamStatus = 'idle' | 'streaming' | 'cap' | 'error';

export type ChatStreamState = {
  streamingText: string;
  status: ChatStreamStatus;
  error?: string;
  remaining?: number;
  /** The `userMessageId` from the turn's `meta` event, kept so a retry can reuse it instead of inserting a duplicate. Cleared by `start()` — only ever set for the turn currently (or most recently) in flight. */
  userMessageId?: string;
};

/** Streaming key for a chat that has not been created yet (first message of a new chat). */
export const NEW_CHAT_KEY = 'new';

const IDLE: ChatStreamState = { streamingText: '', status: 'idle' };

type ChatStreamStore = {
  byChat: Record<string, ChatStreamState>;
  start: (chatKey: string) => void;
  appendDelta: (chatKey: string, text: string) => void;
  finish: (chatKey: string) => void;
  fail: (chatKey: string, error: string) => void;
  cap: (chatKey: string) => void;
  reset: (chatKey: string) => void;
  setMeta: (chatKey: string, meta: { userMessageId?: string; remaining?: number }) => void;
  /**
   * Moves a chat's streaming entry from `fromKey` to `toKey` (e.g. from the
   * `'new'` key to a chat's real id once `meta` resolves it) and resets
   * `fromKey` back to idle. A no-op when the keys are already the same
   * (continuing an existing chat).
   */
  adopt: (fromKey: string, toKey: string) => void;
};

function update(
  byChat: Record<string, ChatStreamState>,
  chatKey: string,
  patch: Partial<ChatStreamState>,
): Record<string, ChatStreamState> {
  const prev = byChat[chatKey] ?? IDLE;
  return { ...byChat, [chatKey]: { ...prev, ...patch } };
}

export const useChatStream = create<ChatStreamStore>((set) => ({
  byChat: {},
  start: (chatKey) =>
    set((s) => ({
      byChat: update(s.byChat, chatKey, { streamingText: '', status: 'streaming', error: undefined, userMessageId: undefined }),
    })),
  appendDelta: (chatKey, text) =>
    set((s) => {
      const prev = s.byChat[chatKey] ?? IDLE;
      return { byChat: update(s.byChat, chatKey, { streamingText: prev.streamingText + text, status: 'streaming' }) };
    }),
  finish: (chatKey) => set((s) => ({ byChat: update(s.byChat, chatKey, { status: 'idle' }) })),
  fail: (chatKey, error) => set((s) => ({ byChat: update(s.byChat, chatKey, { status: 'error', error }) })),
  cap: (chatKey) => set((s) => ({ byChat: update(s.byChat, chatKey, { status: 'cap', remaining: 0 }) })),
  reset: (chatKey) => set((s) => ({ byChat: { ...s.byChat, [chatKey]: { ...IDLE } } })),
  setMeta: (chatKey, meta) => set((s) => ({ byChat: update(s.byChat, chatKey, meta) })),
  adopt: (fromKey, toKey) =>
    set((s) => {
      if (fromKey === toKey) return s;
      const entry = s.byChat[fromKey] ?? IDLE;
      return { byChat: { ...s.byChat, [toKey]: { ...entry }, [fromKey]: { ...IDLE } } };
    }),
}));

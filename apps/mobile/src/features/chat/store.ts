import { create } from 'zustand';

export type ChatStreamStatus = 'idle' | 'streaming' | 'cap' | 'error';

export type ChatStreamState = {
  streamingText: string;
  status: ChatStreamStatus;
  error?: string;
  remaining?: number;
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
    set((s) => ({ byChat: update(s.byChat, chatKey, { streamingText: '', status: 'streaming', error: undefined }) })),
  appendDelta: (chatKey, text) =>
    set((s) => {
      const prev = s.byChat[chatKey] ?? IDLE;
      return { byChat: update(s.byChat, chatKey, { streamingText: prev.streamingText + text, status: 'streaming' }) };
    }),
  finish: (chatKey) => set((s) => ({ byChat: update(s.byChat, chatKey, { status: 'idle' }) })),
  fail: (chatKey, error) => set((s) => ({ byChat: update(s.byChat, chatKey, { status: 'error', error }) })),
  cap: (chatKey) => set((s) => ({ byChat: update(s.byChat, chatKey, { status: 'cap', remaining: 0 }) })),
  reset: (chatKey) => set((s) => ({ byChat: { ...s.byChat, [chatKey]: { ...IDLE } } })),
}));

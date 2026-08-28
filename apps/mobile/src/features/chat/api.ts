import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { parseSseStream, type SseFrame } from './sse';

export type ChatMetaEvent = {
  chatId: string;
  userMessageId: string;
  assistantMessageId: string | null;
  remaining: number;
};
export type ChatDeltaEvent = { text: string };
export type ChatDoneEvent = { status: 'complete' | 'partial'; assistantMessageId: string; title: string | null };
export type ChatCapEvent = { remaining: 0 };
export type ChatErrorEvent = { code: 'budget' | 'provider' | 'auth' | 'bad_request'; message: string };

/** A parsed SSE frame from `chat-send`, narrowed by event name. */
export type ChatSendEvent =
  | { event: 'meta'; data: ChatMetaEvent }
  | { event: 'delta'; data: ChatDeltaEvent }
  | { event: 'done'; data: ChatDoneEvent }
  | { event: 'cap'; data: ChatCapEvent }
  | { event: 'error'; data: ChatErrorEvent };

type SendMessageArgs = {
  chatId?: string;
  text: string;
  onEvent: (event: ChatSendEvent) => void;
  signal?: AbortSignal;
};

type PreStreamErrorBody = { error?: string };

/**
 * Sends a chat message to the `chat-send` edge function and streams the SSE
 * reply, invoking `onEvent` for each frame. Throws with the server's error
 * code (e.g. `'auth'`, `'bad_request'`, `'not_found'`, `'internal'`) when the
 * response is a plain JSON error returned before the stream opens.
 */
export async function sendMessage({ chatId, text, onEvent, signal }: SendMessageArgs): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('auth');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('bad_request');

  const doFetch = Platform.OS === 'web' ? globalThis.fetch : expoFetch;

  const res = await doFetch(`${supabaseUrl}/functions/v1/chat-send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ chatId, text }),
    signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as PreStreamErrorBody | null;
    throw new Error(body?.error ?? `chat-send failed (${res.status})`);
  }

  if (!res.body) throw new Error('internal');

  const reader = res.body.getReader();
  for await (const frame of parseSseStream(reader)) {
    onEvent(frame as ChatSendEvent);
  }
}

// Re-exported so callers can type raw frames before narrowing, if needed.
export type { SseFrame };

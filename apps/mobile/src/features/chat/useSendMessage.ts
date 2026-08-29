import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage, type ChatSendEvent } from './api';
import { NEW_CHAT_KEY, useChatStream } from './store';

type SendMessageInput = { chatId?: string; text: string; retryOfMessageId?: string; signal?: AbortSignal };
/**
 * `chatId` is `null` only for the rare case of a brand-new chat that hits
 * the free-tier cap or the daily budget before the server ever assigns one
 * (the SSE contract sends `cap`/`error` with no preceding `meta` in that
 * path) — the store (keyed `'new'`) already reflects the terminal state.
 */
type SendMessageResult = { chatId: string | null };

/**
 * Sends one chat message and streams the reply into `useChatStream`. Starts
 * out keyed by `chatId ?? 'new'`; once a `meta` event resolves the chat's
 * real id (always true except for a cap/error that lands before `meta` — see
 * `SendMessageResult`), the store entry is moved (`adopt`) onto that real
 * key and every event from then on — including a subsequent `error` —
 * targets it, so a screen watching the real chat id (not just `new.tsx`,
 * which is about to navigate away) sees the outcome. Resolves once the
 * stream ends, with the chat's id.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, text, retryOfMessageId, signal }: SendMessageInput): Promise<SendMessageResult> => {
      let activeKey = chatId ?? NEW_CHAT_KEY;
      const { start, appendDelta, finish, fail, cap, setMeta, adopt } = useChatStream.getState();
      start(activeKey);

      let resolvedChatId: string | null = chatId ?? null;
      // Work kicked off from inside a frame handler that the mutation must
      // still wait for before it resolves (see the `done` case).
      const pending: Array<Promise<void>> = [];

      const handleEvent = (evt: ChatSendEvent): void => {
        switch (evt.event) {
          case 'meta': {
            resolvedChatId = evt.data.chatId;
            if (activeKey !== resolvedChatId) {
              adopt(activeKey, resolvedChatId);
              activeKey = resolvedChatId;
            }
            setMeta(activeKey, { userMessageId: evt.data.userMessageId, remaining: evt.data.remaining });
            break;
          }
          case 'delta':
            appendDelta(activeKey, evt.data.text);
            break;
          case 'done': {
            // `finish` clears the streaming bubble, so the persisted reply
            // has to be on screen first — `invalidateQueries` resolves once
            // the active refetch settles, and only then is it safe to drop
            // the streamed text. Finishing first makes the reply blink out
            // and back in.
            const doneKey = activeKey;
            const doneChatId = resolvedChatId;
            pending.push(
              (async () => {
                if (doneChatId) {
                  await queryClient.invalidateQueries({ queryKey: ['messages', doneChatId] });
                }
                finish(doneKey);
                await queryClient.invalidateQueries({ queryKey: ['chats'] });
              })(),
            );
            break;
          }
          case 'cap':
            cap(activeKey);
            break;
          case 'error':
            fail(activeKey, evt.data.message);
            break;
        }
      };

      try {
        await sendMessage({ chatId, text, retryOfMessageId, signal, onEvent: handleEvent });
      } catch (err) {
        fail(activeKey, err instanceof Error ? err.message : String(err));
        throw err;
      }

      await Promise.all(pending);

      return { chatId: resolvedChatId };
    },
  });
}

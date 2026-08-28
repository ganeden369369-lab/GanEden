import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage, type ChatSendEvent } from './api';
import { NEW_CHAT_KEY, useChatStream } from './store';

type SendMessageInput = { chatId?: string; text: string; signal?: AbortSignal };
/**
 * `chatId` is `null` only for the rare case of a brand-new chat that hits
 * the free-tier cap or the daily budget before the server ever assigns one
 * (the SSE contract sends `cap`/`error` with no preceding `meta` in that
 * path) — the store (keyed `'new'`) already reflects the terminal state.
 */
type SendMessageResult = { chatId: string | null };

/**
 * Sends one chat message and streams the reply into `useChatStream`, keyed
 * by the chat it belongs to (`'new'` until the server assigns an id via the
 * `meta` event). Resolves once the stream ends, with the chat's id.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, text, signal }: SendMessageInput): Promise<SendMessageResult> => {
      const chatKey = chatId ?? NEW_CHAT_KEY;
      const { start, appendDelta, finish, fail, cap } = useChatStream.getState();
      start(chatKey);

      let resolvedChatId: string | null = chatId ?? null;

      const handleEvent = (evt: ChatSendEvent): void => {
        switch (evt.event) {
          case 'meta':
            resolvedChatId = evt.data.chatId;
            break;
          case 'delta':
            appendDelta(chatKey, evt.data.text);
            break;
          case 'done':
            finish(chatKey);
            if (resolvedChatId) {
              void queryClient.invalidateQueries({ queryKey: ['messages', resolvedChatId] });
            }
            void queryClient.invalidateQueries({ queryKey: ['chats'] });
            break;
          case 'cap':
            cap(chatKey);
            break;
          case 'error':
            fail(chatKey, evt.data.message);
            break;
        }
      };

      try {
        await sendMessage({ chatId, text, signal, onEvent: handleEvent });
      } catch (err) {
        fail(chatKey, err instanceof Error ? err.message : String(err));
        throw err;
      }

      return { chatId: resolvedChatId };
    },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a well-formed UUID string (any version). */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type LastMessageRow = { id: string; role: string; user_id: string; content: string } | null;

/**
 * A `retryOfMessageId` is only honored when it names the chat's *last*
 * message, that message is the caller's own `role: 'user'` row, and its
 * stored text matches the retry text exactly — otherwise `chat-send` would
 * silently reuse (or, worse, let another user's) unrelated message id.
 * `lastMessage` is whatever the caller's own last-message-of-the-chat query
 * returned (`null` for an empty chat, which can't happen for a real retry).
 */
export function isValidRetryMessage(
  lastMessage: LastMessageRow,
  retryOfMessageId: string,
  userId: string,
  text: string,
): boolean {
  if (!lastMessage) return false;
  return (
    lastMessage.id === retryOfMessageId &&
    lastMessage.role === 'user' &&
    lastMessage.user_id === userId &&
    lastMessage.content === text
  );
}

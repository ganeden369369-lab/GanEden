const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a well-formed UUID string (any version). */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** The chat's most recent `role: 'user'` row, or `null` for a chat with none. */
export type LastMessageRow = { id: string; role: string; user_id: string; content: string } | null;

/** A row created after the retried user message, oldest first. */
export type TrailingMessageRow = { role: string; status: string };

/** Assistant statuses that mark a turn as failed, and therefore retryable. */
const FAILED_STATUSES = new Set(['error', 'partial']);

/**
 * A `retryOfMessageId` is only honored when it names the caller's own most
 * recent `role: 'user'` row in the chat, that row's stored text matches the
 * retry text exactly, and every message created after it is a *failed*
 * assistant row (`status` `'error'` or `'partial'`) — otherwise `chat-send`
 * would silently reuse an unrelated (or another user's) message id, or
 * re-answer a turn Eden already replied to successfully.
 *
 * `lastMessage` is whatever the caller's most-recent-user-message query
 * returned (`null` for a chat with no user messages, which can't happen for
 * a real retry); `trailing` is every row after it (empty when the failed
 * attempt never even persisted an assistant row).
 */
export function isValidRetryMessage(
  lastMessage: LastMessageRow,
  trailing: TrailingMessageRow[],
  retryOfMessageId: string,
  userId: string,
  text: string,
): boolean {
  if (!lastMessage) return false;
  if (
    lastMessage.id !== retryOfMessageId ||
    lastMessage.role !== 'user' ||
    lastMessage.user_id !== userId ||
    lastMessage.content !== text
  ) {
    return false;
  }
  return trailing.every((row) => row.role === 'assistant' && FAILED_STATUSES.has(row.status));
}

import { strict as assert } from 'node:assert';
import { isUuid, isValidRetryMessage } from './validate.ts';

Deno.test('isUuid accepts well-formed UUIDs and rejects everything else', () => {
  assert.equal(isUuid('39259ecf-1234-4abc-8def-0123456789ab'), true);
  assert.equal(isUuid('not-a-uuid'), false);
  assert.equal(isUuid(''), false);
  assert.equal(isUuid('39259ecf-1234-4abc-8def-0123456789ab; DROP TABLE messages'), false);
});

const USER_ID = 'b7a2354e-4828-40cd-955e-3a3b411a4565';
const MSG_ID = '3102517c-0000-4000-8000-000000000001';

Deno.test('isValidRetryMessage: true only when id, role, owner and text all match the last message', () => {
  const last = { id: MSG_ID, role: 'user', user_id: USER_ID, content: 'Hi Eden' };
  assert.equal(isValidRetryMessage(last, MSG_ID, USER_ID, 'Hi Eden'), true);
});

Deno.test('isValidRetryMessage: false when there is no last message (empty chat)', () => {
  assert.equal(isValidRetryMessage(null, MSG_ID, USER_ID, 'Hi Eden'), false);
});

Deno.test('isValidRetryMessage: false when the retry id does not name the last message', () => {
  const last = { id: 'a-different-id', role: 'user', user_id: USER_ID, content: 'Hi Eden' };
  assert.equal(isValidRetryMessage(last, MSG_ID, USER_ID, 'Hi Eden'), false);
});

Deno.test('isValidRetryMessage: false when the last message is not a user message', () => {
  const last = { id: MSG_ID, role: 'assistant', user_id: USER_ID, content: 'Hi Eden' };
  assert.equal(isValidRetryMessage(last, MSG_ID, USER_ID, 'Hi Eden'), false);
});

Deno.test('isValidRetryMessage: false when it belongs to a different user', () => {
  const last = { id: MSG_ID, role: 'user', user_id: 'someone-else', content: 'Hi Eden' };
  assert.equal(isValidRetryMessage(last, MSG_ID, USER_ID, 'Hi Eden'), false);
});

Deno.test('isValidRetryMessage: false when the retry text does not match the stored text', () => {
  const last = { id: MSG_ID, role: 'user', user_id: USER_ID, content: 'Hi Eden' };
  assert.equal(isValidRetryMessage(last, MSG_ID, USER_ID, 'A different message'), false);
});

import { useChatStream } from './store';

describe('useChatStream', () => {
  beforeEach(() => {
    useChatStream.setState({ byChat: {} });
  });

  it('start -> appendDelta -> finish transitions through streaming to idle with accumulated text', () => {
    const { start, appendDelta, finish } = useChatStream.getState();

    start('new');
    expect(useChatStream.getState().byChat.new).toEqual({ streamingText: '', status: 'streaming' });

    appendDelta('new', 'Hello');
    appendDelta('new', ' world');
    expect(useChatStream.getState().byChat.new).toMatchObject({
      streamingText: 'Hello world',
      status: 'streaming',
    });

    finish('new');
    expect(useChatStream.getState().byChat.new).toMatchObject({
      streamingText: 'Hello world',
      status: 'idle',
    });
  });

  it('fail sets status error with the message, leaving other chats untouched', () => {
    const { start, fail } = useChatStream.getState();
    start('c1');
    start('c2');

    fail('c1', 'boom');

    expect(useChatStream.getState().byChat.c1).toMatchObject({ status: 'error', error: 'boom' });
    expect(useChatStream.getState().byChat.c2).toMatchObject({ status: 'streaming' });
  });

  it('cap sets status cap with remaining 0', () => {
    const { start, appendDelta, cap } = useChatStream.getState();
    start('c3');
    appendDelta('c3', 'partial');

    cap('c3');

    expect(useChatStream.getState().byChat.c3).toMatchObject({
      status: 'cap',
      remaining: 0,
      streamingText: 'partial',
    });
  });

  it('reset clears a chat back to the idle default', () => {
    const { start, appendDelta, fail, reset } = useChatStream.getState();
    start('c4');
    appendDelta('c4', 'hi');
    fail('c4', 'oops');

    reset('c4');

    expect(useChatStream.getState().byChat.c4).toEqual({ streamingText: '', status: 'idle' });
  });

  it('setMeta merges the userMessageId/remaining without disturbing streaming state', () => {
    const { start, appendDelta, setMeta } = useChatStream.getState();
    start('c5');
    appendDelta('c5', 'partial reply');

    setMeta('c5', { userMessageId: 'msg-1', remaining: 3 });

    expect(useChatStream.getState().byChat.c5).toMatchObject({
      status: 'streaming',
      streamingText: 'partial reply',
      userMessageId: 'msg-1',
      remaining: 3,
    });
  });

  it('adopt moves a chat entry onto a new key and resets the old key to idle', () => {
    const { start, appendDelta, setMeta, adopt } = useChatStream.getState();
    start('new');
    appendDelta('new', 'Hello');
    setMeta('new', { userMessageId: 'msg-1', remaining: 4 });

    adopt('new', 'real-chat-id');

    expect(useChatStream.getState().byChat['real-chat-id']).toMatchObject({
      status: 'streaming',
      streamingText: 'Hello',
      userMessageId: 'msg-1',
      remaining: 4,
    });
    expect(useChatStream.getState().byChat.new).toEqual({ streamingText: '', status: 'idle' });
  });

  it('adopt is a no-op when the keys are already the same', () => {
    const { start, appendDelta, adopt } = useChatStream.getState();
    start('c6');
    appendDelta('c6', 'hi');

    adopt('c6', 'c6');

    expect(useChatStream.getState().byChat.c6).toMatchObject({ status: 'streaming', streamingText: 'hi' });
  });

  it('start clears a stale userMessageId from a previous turn under the same key', () => {
    const { start, setMeta } = useChatStream.getState();
    start('c7');
    setMeta('c7', { userMessageId: 'msg-old' });

    start('c7');

    expect(useChatStream.getState().byChat.c7.userMessageId).toBeUndefined();
  });
});

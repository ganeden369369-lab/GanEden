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
});

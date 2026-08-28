import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { starterPrompts } from '@gan-eden/prompts';
import { Avatar, Bubble, Button, Composer, Screen, StarterChip, Text, tokens } from '../../../src/ui';
import { currentLanguage, useT } from '../../../src/lib/i18n';
import { useSession } from '../../../src/lib/session';
import { useProfile } from '../../../src/features/profile/useProfile';
import { useSendMessage } from '../../../src/features/chat/useSendMessage';
import { NEW_CHAT_KEY, useChatStream } from '../../../src/features/chat/store';

const IDLE = { streamingText: '', status: 'idle' as const };

export default function NewChatScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ seed?: string }>();
  const seed = Array.isArray(params.seed) ? params.seed[0] : params.seed;
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const sendMessage = useSendMessage();
  const stream = useChatStream((s) => s.byChat[NEW_CHAT_KEY]) ?? IDLE;
  const [text, setText] = useState('');
  const [lastSent, setLastSent] = useState('');
  const seedHandled = useRef(false);

  const handleSend = async (value: string, retryOfMessageId?: string): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed || sendMessage.isPending) return;
    setText('');
    setLastSent(trimmed);
    try {
      const { chatId } = await sendMessage.mutateAsync({ text: trimmed, retryOfMessageId });
      // A resolved chatId means `meta` arrived — the user's message (and the
      // streaming state, moved by `adopt` in useSendMessage) now live under
      // the real chat id, whether this turn finished with `done` or with a
      // post-meta `error`. Navigate either way: `[id].tsx` shows the reply
      // or the error banner + retry from there. No chatId means the stream
      // never got past `meta` (cap, or a network failure) — stay here, our
      // own cap/error banner below already covers that.
      if (chatId) router.replace(('/(tabs)/chat/' + chatId) as Href);
    } catch {
      // surfaced via the streaming store's error state below
    }
  };

  // The `'new'` store entry outlives this screen (it is keyed by a constant,
  // not by a chat id), so a cap or error banner from a previous visit would
  // otherwise still be showing the next time the user opens a new chat.
  // Declared before the seed effect so the reset can never wipe the seeded
  // turn's own streaming state.
  useEffect(() => {
    const { reset } = useChatStream.getState();
    reset(NEW_CHAT_KEY);
    return () => reset(NEW_CHAT_KEY);
  }, []);

  useEffect(() => {
    if (seed && !seedHandled.current) {
      seedHandled.current = true;
      void handleSend(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the initial seed param only
  }, [seed]);

  const starters = profile ? starterPrompts(currentLanguage(), profile.goals, false) : [];
  // `sendMessage.isPending` covers the brief window right after `meta`
  // arrives, where `adopt()` has already reset this `'new'` entry back to
  // idle (its data now lives under the real chat id) but this screen hasn't
  // navigated away yet — without it, the view would flash back to the
  // starter-chips empty state mid-stream.
  const isStreaming = stream.status === 'streaming' || sendMessage.isPending;
  const isCap = stream.status === 'cap';
  const isError = stream.status === 'error';
  const showStarters = !seed && !isStreaming && !stream.streamingText && stream.status !== 'error' && stream.status !== 'cap';

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
        <Avatar size="sm" />
        <Text variant="heading">{t('chat.title')}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {showStarters ? (
          <View>
            <Text tone="muted" style={{ marginBottom: tokens.space.lg }}>
              {t('chat.empty')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {starters.map((s) => (
                <StarterChip key={s} label={s} onPress={() => void handleSend(s)} />
              ))}
            </View>
          </View>
        ) : null}
        {isStreaming || stream.streamingText ? <Bubble role="assistant" text={stream.streamingText} streaming={isStreaming} /> : null}
      </View>
      {isCap ? (
        <View style={{ marginBottom: tokens.space.md }}>
          <Text tone="accent">{t('chat.capReached')}</Text>
          <Text variant="caption" tone="muted">
            {t('chat.capHint')}
          </Text>
        </View>
      ) : null}
      {isError ? (
        <View style={{ marginBottom: tokens.space.md }}>
          <Text style={{ color: tokens.color.danger }}>{__DEV__ && stream.error ? stream.error : t('chat.errorGeneric')}</Text>
          <Button title={t('chat.retry')} variant="ghost" onPress={() => void handleSend(lastSent, stream.userMessageId)} />
        </View>
      ) : null}
      <Composer
        value={text}
        onChangeText={setText}
        onSend={() => void handleSend(text)}
        disabled={isStreaming || isCap}
        placeholder={t('chat.composerPlaceholder')}
        testID="chat-composer"
        sendTestID="chat-send"
      />
    </Screen>
  );
}

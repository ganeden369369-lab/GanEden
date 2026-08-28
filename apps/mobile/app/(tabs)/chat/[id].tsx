import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Avatar, Bubble, Button, Composer, Screen, Text, tokens } from '../../../src/ui';
import { useT } from '../../../src/lib/i18n';
import { useChats } from '../../../src/features/chat/useChats';
import { useMessages, type MessageRow } from '../../../src/features/chat/useMessages';
import { useSendMessage } from '../../../src/features/chat/useSendMessage';
import { useChatStream } from '../../../src/features/chat/store';

const IDLE = { streamingText: '', status: 'idle' as const };

type Row = MessageRow | { id: 'streaming'; role: 'assistant'; content: string };

export default function ChatConversationScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: chats } = useChats();
  const chat = chats?.find((c) => c.id === id);
  const { data: messages } = useMessages(id);
  const sendMessage = useSendMessage();
  const stream = useChatStream((s) => (id ? s.byChat[id] : undefined)) ?? IDLE;
  const [text, setText] = useState('');
  const [lastSent, setLastSent] = useState('');
  const listRef = useRef<FlatList<Row>>(null);

  const handleSend = async (value: string, retryOfMessageId?: string): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed || !id || sendMessage.isPending) return;
    setText('');
    setLastSent(trimmed);
    try {
      await sendMessage.mutateAsync({ chatId: id, text: trimmed, retryOfMessageId });
    } catch {
      // surfaced via the streaming store's error state below
    }
  };

  const isStreaming = stream.status === 'streaming';
  const isCap = stream.status === 'cap';
  const isError = stream.status === 'error';

  // `error` rows are turns that produced nothing worth showing — the error
  // banner + retry below is the whole UI for them.
  const visibleMessages = (messages ?? []).filter((m) => m.status !== 'error');
  const data: Row[] = [...visibleMessages, ...(isStreaming ? [{ id: 'streaming' as const, role: 'assistant' as const, content: stream.streamingText }] : [])];

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
        <Avatar size="sm" />
        <View>
          <Text variant="heading">{t('chat.title')}</Text>
          {chat?.title ? (
            <Text variant="caption" tone="muted">
              {chat.title}
            </Text>
          ) : null}
        </View>
      </View>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={data}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          // Group consecutive Eden replies under one avatar, like a real
          // messaging thread — only the first assistant bubble in a run
          // shows it.
          const prev = data[index - 1];
          const showAvatar = !(item.role === 'assistant' && prev?.role === 'assistant');
          // A reply the server persisted mid-generation: shown in full, with
          // a quiet marker so the truncation isn't mistaken for Eden's voice.
          const isPartial = 'status' in item && item.status === 'partial';
          return (
            <View>
              <Bubble
                role={item.role === 'user' ? 'user' : 'assistant'}
                text={item.content}
                streaming={item.id === 'streaming'}
                showAvatar={showAvatar}
                testID={item.role === 'user' ? 'bubble-user' : 'bubble-assistant'}
              />
              {isPartial ? (
                <Text variant="caption" tone="muted" testID="bubble-partial">
                  {t('chat.partial')}
                </Text>
              ) : null}
            </View>
          );
        }}
      />
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

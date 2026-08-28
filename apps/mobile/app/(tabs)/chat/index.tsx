import { router, type Href } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { starterPrompts } from '@gan-eden/prompts';
import { Button, Card, Screen, StarterChip, Text, tokens } from '../../../src/ui';
import { currentLanguage, useT } from '../../../src/lib/i18n';
import { relativeTime } from '../../../src/lib/dates';
import { useSession } from '../../../src/lib/session';
import { useProfile } from '../../../src/features/profile/useProfile';
import { useChats, type ChatRow } from '../../../src/features/chat/useChats';

function openNew(seed?: string): void {
  if (seed) {
    router.push({ pathname: '/(tabs)/chat/new', params: { seed } } as unknown as Href);
  } else {
    router.push('/(tabs)/chat/new' as Href);
  }
}

export default function ChatListScreen() {
  const t = useT();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const { data: chats, isLoading } = useChats();

  const isEmpty = !isLoading && (!chats || chats.length === 0);
  const starters = profile ? starterPrompts(currentLanguage(), profile.goals, false) : [];

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space.xl }}>
        <Text variant="title" tone="accent">
          {t('chat.title')}
        </Text>
        <Button title={t('chat.new')} size="md" testID="chat-new" onPress={() => openNew()} />
      </View>
      {isEmpty ? (
        <View style={{ flex: 1 }}>
          <Text tone="muted" style={{ marginBottom: tokens.space.lg }}>
            {t('chat.empty')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {starters.map((s) => (
              <StarterChip key={s} label={s} onPress={() => openNew(s)} />
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }: { item: ChatRow }) => (
            <Pressable testID="chat-list-item" onPress={() => router.push(('/(tabs)/chat/' + item.id) as Href)}>
              <Card style={{ marginBottom: tokens.space.md }}>
                <Text variant="heading">{item.title ?? t('chat.new')}</Text>
                <Text variant="caption" tone="muted" style={{ marginTop: tokens.space.xs }}>
                  {relativeTime(item.last_message_at, currentLanguage())}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

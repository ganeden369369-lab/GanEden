import { personalCycles } from '@gan-eden/numerology';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Avatar, Card, Icon, Screen, Text, tokens } from '../../src/ui';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { todayIso } from '../../src/lib/dates';
import { useSession } from '../../src/lib/session';

export default function Home() {
  const t = useT();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  if (!profile) return null;
  const today = todayIso();
  const cycles = personalCycles(profile.dob.slice(0, 10), today);
  return (
    <Screen>
      <Text variant="title" tone="accent" testID="home-title">
        {profile.full_name.split(' ')[0]}
      </Text>
      <Text tone="muted" style={{ marginTop: tokens.space.sm }}>
        {t('numbers.personalDay', { n: cycles.personalDay })}
      </Text>
      <Pressable testID="home-ask-eden" onPress={() => router.push('/(tabs)/chat/new' as Href)} style={{ marginTop: tokens.space.xl }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.md }}>
          <Avatar size="sm" />
          <View style={{ flex: 1 }}>
            <Text variant="heading">{t('chat.askEden')}</Text>
            <Text variant="caption" tone="muted">
              {t('chat.askEdenHint')}
            </Text>
          </View>
          <Icon name="chevron-forward" flipInRtl />
        </Card>
      </Pressable>
    </Screen>
  );
}

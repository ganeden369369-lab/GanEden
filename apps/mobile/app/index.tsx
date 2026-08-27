import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Button, Screen, Text, tokens } from '../src/ui';
import { useProfile } from '../src/features/profile/useProfile';
import { useT } from '../src/lib/i18n';
import { useSession } from '../src/lib/supabase';

export default function Index() {
  const t = useT();
  const { session, loading } = useSession();
  const profile = useProfile(session?.user.id);
  if (loading || (session && profile.isLoading)) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.color.accent} />
        </View>
      </Screen>
    );
  }
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (profile.isError) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space.lg }}>
          <Text tone="muted" align="center">
            {t('common.loadError')}
          </Text>
          <Button title={t('common.retry')} onPress={() => profile.refetch()} />
        </View>
      </Screen>
    );
  }
  if (!profile.data) return <Redirect href="/(onboarding)/language" />;
  return <Redirect href="/(tabs)/home" />;
}

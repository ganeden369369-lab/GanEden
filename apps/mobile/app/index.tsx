import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Screen, tokens } from '../src/ui';
import { useProfile } from '../src/features/profile/useProfile';
import { useSession } from '../src/lib/supabase';

export default function Index() {
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
  // (onboarding) and (tabs) route groups don't exist yet — added in Tasks 10-14.
  if (!profile.data) return <Redirect href={'/(onboarding)/language' as Href} />;
  return <Redirect href={'/(tabs)/home' as Href} />;
}

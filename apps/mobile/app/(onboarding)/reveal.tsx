import { Redirect, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { NUMBER_I18N, NUMBER_KEYS, safeParseNumbers } from '@gan-eden/shared';
import { Button, NumberBadge, Screen, Text, tokens } from '../../src/ui';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { useSession } from '../../src/lib/session';
import { useOnboarding } from '../../src/store/onboarding';

const OTHERS = NUMBER_KEYS.filter((k) => k !== 'lifePath');

export default function Reveal() {
  const t = useT();
  const { session } = useSession();
  const { data: profile, isLoading, isFetching } = useProfile(session?.user.id);
  const reset = useOnboarding((s) => s.reset);

  if (isLoading || isFetching) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.color.accent} />
        </View>
      </Screen>
    );
  }
  if (!profile) return <Redirect href="/(onboarding)/language" />;

  const numbers = safeParseNumbers(profile.numbers);
  if (!numbers) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space.lg, paddingHorizontal: tokens.space.xl }}>
          <Text tone="muted" align="center">
            {t('common.loadError')}
          </Text>
          <Button title={t('onboarding.reveal.recompute')} onPress={() => router.replace('/(onboarding)/language')} />
        </View>
      </Screen>
    );
  }
  const firstName = profile.full_name.split(' ')[0];
  return (
    <Screen>
      <Text variant="title" tone="accent" align="center" testID="reveal-title" style={{ marginBottom: tokens.space.xl }}>
        {t('onboarding.reveal.title', { name: firstName })}
      </Text>
      <View style={{ alignItems: 'center', marginBottom: tokens.space.xl }}>
        <NumberBadge value={numbers.lifePath} size="lg" />
        <Text variant="caption" tone="muted" style={{ marginTop: tokens.space.sm }}>
          {t(`numbers.${NUMBER_I18N.lifePath}`)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: tokens.space.lg, marginBottom: tokens.space.xl }}>
        {OTHERS.map((k) => (
          <View key={k} style={{ alignItems: 'center' }}>
            <NumberBadge value={numbers[k]} size="sm" />
            <Text variant="caption" tone="muted" style={{ marginTop: tokens.space.xs }}>
              {t(`numbers.${NUMBER_I18N[k]}`)}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Button
        title={t('onboarding.reveal.cta')}
        testID="enter"
        onPress={() => {
          reset();
          router.replace('/(tabs)/home');
        }}
      />
    </Screen>
  );
}

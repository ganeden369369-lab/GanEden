import { Redirect, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import type { NumerologyProfile } from '@gan-eden/numerology';
import { Button, NumberBadge, Screen, Text, tokens } from '../../src/ui';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { useSession } from '../../src/lib/supabase';
import { useOnboarding } from '../../src/store/onboarding';

type NumberKey = keyof Pick<NumerologyProfile, 'lifePath' | 'expression' | 'soulUrge' | 'personality' | 'birthday'>;

const OTHERS: NumberKey[] = ['expression', 'soulUrge', 'personality', 'birthday'];
const I18N_KEY: Record<NumberKey, string> = {
  lifePath: 'life_path',
  expression: 'expression',
  soulUrge: 'soul_urge',
  personality: 'personality',
  birthday: 'birthday',
};

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

  const numbers = profile.numbers as unknown as NumerologyProfile;
  const firstName = profile.full_name.split(' ')[0];
  return (
    <Screen>
      <Text variant="title" tone="accent" align="center" testID="reveal-title" style={{ marginBottom: tokens.space.xl }}>
        {t('onboarding.reveal.title', { name: firstName })}
      </Text>
      <View style={{ alignItems: 'center', marginBottom: tokens.space.xl }}>
        <NumberBadge value={numbers.lifePath} size="lg" />
        <Text variant="caption" tone="muted" style={{ marginTop: tokens.space.sm }}>
          {t(`numbers.${I18N_KEY.lifePath}`)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: tokens.space.lg, marginBottom: tokens.space.xl }}>
        {OTHERS.map((k) => (
          <View key={k} style={{ alignItems: 'center' }}>
            <NumberBadge value={numbers[k]} size="sm" />
            <Text variant="caption" tone="muted" style={{ marginTop: tokens.space.xs }}>
              {t(`numbers.${I18N_KEY[k]}`)}
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

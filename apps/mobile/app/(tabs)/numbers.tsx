import { View } from 'react-native';
import type { NumerologyProfile } from '@gan-eden/numerology';
import type { Language } from '@gan-eden/shared';
import { Card, NumberBadge, Screen, Text, tokens } from '../../src/ui';
import { useMeanings } from '../../src/features/profile/useMeanings';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { useSession } from '../../src/lib/supabase';

const ROWS: { key: keyof NumerologyProfile; type: string }[] = [
  { key: 'lifePath', type: 'life_path' },
  { key: 'expression', type: 'expression' },
  { key: 'soulUrge', type: 'soul_urge' },
  { key: 'personality', type: 'personality' },
  { key: 'birthday', type: 'birthday' },
];

export default function Numbers() {
  const t = useT();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const meanings = useMeanings((profile?.language as Language) ?? 'en');
  if (!profile) return null;
  const numbers = profile.numbers as unknown as NumerologyProfile;
  return (
    <Screen>
      <Text variant="title" tone="accent" style={{ marginBottom: tokens.space.xl }}>
        {t('tabs.numbers')}
      </Text>
      {ROWS.map(({ key, type }) => {
        const value = numbers[key] as number;
        const meaning = meanings.data?.[`${type}:${value}`];
        return (
          <Card key={key} testID={`number-${type}`} style={{ marginBottom: tokens.space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.lg }}>
              <NumberBadge value={value} size="sm" />
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="muted">
                  {t(`numbers.${type}`)}
                </Text>
                <Text variant="heading">{meaning?.title ?? t(`numbers.${type}`)}</Text>
                {meaning ? <Text tone="primary">{meaning.body}</Text> : null}
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

import { View } from 'react-native';
import { NUMBER_I18N, NUMBER_KEYS, parseNumbers, type Language } from '@gan-eden/shared';
import { Card, NumberBadge, Screen, Text, tokens } from '../../src/ui';
import { useMeanings } from '../../src/features/profile/useMeanings';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { useSession } from '../../src/lib/session';

const ROWS = NUMBER_KEYS.map((key) => ({ key, type: NUMBER_I18N[key] }));

export default function Numbers() {
  const t = useT();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const meanings = useMeanings((profile?.language as Language) ?? 'en');
  if (!profile) return null;
  const numbers = parseNumbers(profile.numbers);
  return (
    <Screen>
      <Text variant="title" tone="accent" style={{ marginBottom: tokens.space.xl }}>
        {t('tabs.numbers')}
      </Text>
      {ROWS.map(({ key, type }) => {
        const value = numbers[key];
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

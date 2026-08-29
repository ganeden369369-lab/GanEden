import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { Button } from './Button';
import { Screen } from './Screen';
import { Text } from './Text';
import { tokens } from './tokens';
type Props = PropsWithChildren<{ step: number; total: number; title: string; subtitle?: string; cta: string; ctaDisabled?: boolean; onCta: () => void; ctaTestID?: string }>;
export function StepFrame({ step, total, title, subtitle, cta, ctaDisabled, onCta, ctaTestID = 'continue', children }: Props) {
  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: tokens.space.xs, marginBottom: tokens.space.xl }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? tokens.color.accent : tokens.color.border }} />
        ))}
      </View>
      <Text variant="title" tone="accent" style={{ marginBottom: subtitle ? tokens.space.sm : tokens.space.xl }}>{title}</Text>
      {subtitle ? <Text tone="muted" style={{ marginBottom: tokens.space.xl }}>{subtitle}</Text> : null}
      {children}
      <View style={{ flex: 1 }} />
      <Button title={cta} onPress={onCta} disabled={ctaDisabled} testID={ctaTestID} />
    </Screen>
  );
}

import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';

type Props = { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'md' | 'lg'; loading?: boolean; disabled?: boolean; testID?: string; style?: ViewStyle };

export function Button({ title, onPress, variant = 'primary', size = 'lg', loading, disabled, testID, style }: Props) {
  const bg = variant === 'primary' ? tokens.color.accent : variant === 'secondary' ? tokens.color.surfaceTint : 'transparent';
  const tone = variant === 'primary' ? 'inverse' : 'accent';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: bg, borderRadius: tokens.radius.pill, paddingVertical: size === 'lg' ? 16 : 12, paddingHorizontal: tokens.space.xl, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : tokens.color.accent} /> : <Text variant="heading" tone={tone}>{title}</Text>}
    </Pressable>
  );
}

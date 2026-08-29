import { Pressable } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';

/** A pill outline chip offering a suggested starter question for Eden. */
export function StarterChip({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: tokens.color.border,
        borderRadius: tokens.radius.pill,
        paddingHorizontal: tokens.space.lg,
        paddingVertical: tokens.space.sm,
        marginEnd: tokens.space.sm,
        marginBottom: tokens.space.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text variant="caption" tone="accent">
        {label}
      </Text>
    </Pressable>
  );
}

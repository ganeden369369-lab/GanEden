import { Pressable } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
export function Choice({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress}
      style={{ marginBottom: tokens.space.md, borderRadius: tokens.radius.card, borderWidth: 1, borderColor: selected ? tokens.color.accent : tokens.color.border, backgroundColor: selected ? tokens.color.surfaceTint : tokens.color.surfaceRaised, paddingHorizontal: tokens.space.xl, paddingVertical: tokens.space.lg }}>
      <Text variant={selected ? 'heading' : 'body'} tone={selected ? 'accent' : 'primary'}>{label}</Text>
    </Pressable>
  );
}

import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
// Gradient text is not portable in RN; render the number on a soft gradient disc instead.
export function NumberBadge({ value, size = 'lg' }: { value: number; size?: 'sm' | 'lg' }) {
  const d = size === 'lg' ? 88 : 48;
  return (
    <LinearGradient colors={[...tokens.gradient.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: d, height: d, borderRadius: d / 2, alignItems: 'center', justifyContent: 'center' }}>
      <View><Text variant={size === 'lg' ? 'display' : 'heading'} tone="inverse">{value}</Text></View>
    </LinearGradient>
  );
}

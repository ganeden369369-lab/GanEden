import { View, type ViewProps } from 'react-native';
import { tokens } from './tokens';
export function Card({ raised = true, style, ...p }: ViewProps & { raised?: boolean }) {
  return <View {...p} style={[{ backgroundColor: tokens.color.surfaceRaised, borderRadius: tokens.radius.card, padding: tokens.space.xl }, raised && tokens.shadow.card, style]} />;
}

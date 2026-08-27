import { Ionicons } from '@expo/vector-icons';
import { I18nManager } from 'react-native';
import { tokens } from './tokens';
type Name = keyof typeof Ionicons.glyphMap;
export function Icon({ name, size = 22, color = tokens.color.accent, flipInRtl }: { name: Name; size?: number; color?: string; flipInRtl?: boolean }) {
  return <Ionicons name={name} size={size} color={color} style={flipInRtl && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />;
}

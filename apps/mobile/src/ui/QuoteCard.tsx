import { LinearGradient } from 'expo-linear-gradient';
import { Image, View } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
type Props = { text: string; name: string; date: string; variant?: 'story' | 'square' | 'inline' };
const SIZES = { story: { w: 1080, h: 1920 }, square: { w: 1080, h: 1080 }, inline: { w: 342, h: 220 } };
export function QuoteCard({ text, name, date, variant = 'inline' }: Props) {
  const { w, h } = SIZES[variant];
  const scale = w / 342;
  return (
    <LinearGradient colors={[tokens.color.surface, tokens.color.surfaceTint]} style={{ width: w, height: h, borderRadius: variant === 'inline' ? tokens.radius.card : 0, padding: tokens.space.xl * scale, justifyContent: 'space-between' }}>
      {/* eslint-disable-next-line @typescript-eslint/no-require-imports -- RN/Metro asset loading requires `require()` */}
      <Image source={require('../../../../assets/icon/lotus-mark.png')} style={{ width: 64 * scale, height: 40 * scale, alignSelf: 'center' }} resizeMode="contain" />
      <Text variant="display" tone="accent" style={{ fontSize: 26 * scale, lineHeight: 34 * scale, textAlign: 'center' }}>{text}</Text>
      <View style={{ alignItems: 'center' }}>
        <Text variant="caption" tone="muted" style={{ fontSize: 13 * scale }}>{name} · {date}</Text>
        <Text variant="caption" tone="accent" style={{ fontSize: 12 * scale, marginTop: 4 * scale }}>@eden__harush__ · Gan Eden</Text>
      </View>
    </LinearGradient>
  );
}

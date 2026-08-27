import { Text as RNText, type TextProps } from 'react-native';
import { currentLanguage } from '../lib/i18n';
import { tokens } from './tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption';
type Tone = 'primary' | 'muted' | 'accent' | 'inverse';
const toneColor: Record<Tone, string> = {
  primary: tokens.color.textPrimary, muted: tokens.color.textMuted, accent: tokens.color.accent, inverse: tokens.color.textInverse,
};

export function Text({ variant = 'body', tone = 'primary', style, ...p }: TextProps & { variant?: Variant; tone?: Tone }) {
  const lang = currentLanguage();
  const isDisplay = variant === 'display' || variant === 'title';
  const family = isDisplay ? tokens.font.display[lang] : variant === 'heading' ? tokens.font.bodyBold : tokens.font.body;
  return (
    <RNText
      {...p}
      style={[{ fontFamily: family, fontSize: tokens.size[variant], lineHeight: tokens.size[variant] * (isDisplay ? 1.15 : 1.5), color: toneColor[tone], writingDirection: lang === 'he' ? 'rtl' : 'ltr' }, style]}
    />
  );
}

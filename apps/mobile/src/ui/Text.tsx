import { I18nManager, Text as RNText, type TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { currentLanguage } from '../lib/i18n';
import { tokens } from './tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption';
type Tone = 'primary' | 'muted' | 'accent' | 'inverse';
type Align = 'start' | 'center' | 'end';
const toneColor: Record<Tone, string> = {
  primary: tokens.color.textPrimary, muted: tokens.color.textMuted, accent: tokens.color.accent, inverse: tokens.color.textInverse,
};

function normalizeLang(value: string): 'en' | 'he' {
  return value === 'he' ? 'he' : 'en';
}

export function Text({ variant = 'body', tone = 'primary', align, style, ...p }: TextProps & { variant?: Variant; tone?: Tone; align?: Align }) {
  const { i18n } = useTranslation();
  const lang = normalizeLang(i18n.language ?? currentLanguage());
  const isDisplay = variant === 'display' || variant === 'title';
  const family = isDisplay ? tokens.font.display[lang] : variant === 'heading' ? tokens.font.bodyBold : tokens.font.body;
  const rtl = I18nManager.isRTL;
  const textAlign = align === 'center' ? 'center' : align === 'end' ? (rtl ? 'left' : 'right') : align === 'start' ? (rtl ? 'right' : 'left') : undefined;
  return (
    <RNText
      {...p}
      style={[{ fontFamily: family, fontSize: tokens.size[variant], lineHeight: tokens.size[variant] * (isDisplay ? 1.15 : 1.5), color: toneColor[tone], writingDirection: lang === 'he' ? 'rtl' : 'ltr', textAlign }, style]}
    />
  );
}

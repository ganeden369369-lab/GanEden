import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ marginBottom: tokens.space.lg }}>
      <Text variant="caption" tone="muted" style={{ marginBottom: tokens.space.sm }}>{label}</Text>
      <TextInput
        placeholderTextColor={tokens.color.textMuted}
        style={{ borderWidth: 1, borderColor: error ? tokens.color.danger : tokens.color.border, borderRadius: tokens.radius.field, backgroundColor: tokens.color.surfaceRaised, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, fontSize: tokens.size.body, fontFamily: tokens.font.body, color: tokens.color.textPrimary }}
        {...p}
      />
      {error ? <Text variant="caption" style={{ color: tokens.color.danger, marginTop: tokens.space.xs }}>{error}</Text> : null}
    </View>
  );
}

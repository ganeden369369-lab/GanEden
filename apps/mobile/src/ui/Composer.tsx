import { Pressable, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { tokens } from './tokens';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  testID?: string;
  sendTestID?: string;
};

const LINE_HEIGHT = tokens.size.body * 1.5;

/** Pill message field + round accent send button, per the approved mockups. */
export function Composer({ value, onChangeText, onSend, disabled, placeholder, testID, sendTestID }: Props) {
  const canSend = value.trim().length > 0 && !disabled;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tokens.space.sm }}>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.color.textMuted}
        multiline
        editable={!disabled}
        style={{
          flex: 1,
          maxHeight: LINE_HEIGHT * 4 + tokens.space.md * 2,
          borderWidth: 1,
          borderColor: tokens.color.border,
          borderRadius: tokens.radius.pill,
          backgroundColor: tokens.color.surfaceRaised,
          paddingHorizontal: tokens.space.lg,
          paddingVertical: tokens.space.md,
          fontSize: tokens.size.body,
          lineHeight: LINE_HEIGHT,
          fontFamily: tokens.font.body,
          color: tokens.color.textPrimary,
        }}
      />
      <Pressable
        testID={sendTestID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSend}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: tokens.radius.pill,
          backgroundColor: tokens.color.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !canSend ? 0.4 : pressed ? 0.85 : 1,
        })}
      >
        <Icon name="send" color={tokens.color.textInverse} size={20} />
      </Pressable>
    </View>
  );
}

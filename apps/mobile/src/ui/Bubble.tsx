import { ActivityIndicator, I18nManager, View } from 'react-native';
import { Avatar } from './Avatar';
import { Text } from './Text';
import { tokens } from './tokens';

type Props = {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  showAvatar?: boolean;
  testID?: string;
};

/**
 * A single chat message. Eden's replies (`assistant`) render as plain text
 * with an optional avatar at the start side, no bubble — the user's own
 * messages get a `surfaceTint` bubble aligned to the end side, per the
 * approved mockups (see docs/design/tokens.md "Rules").
 */
export function Bubble({ role, text, streaming, showAvatar = true, testID }: Props) {
  if (role === 'user') {
    return (
      <View
        testID={testID ?? 'bubble-user'}
        style={{
          alignSelf: I18nManager.isRTL ? 'flex-start' : 'flex-end',
          maxWidth: '80%',
          backgroundColor: tokens.color.surfaceTint,
          borderRadius: tokens.radius.bubble,
          paddingHorizontal: tokens.space.lg,
          paddingVertical: tokens.space.md,
          marginBottom: tokens.space.md,
        }}
      >
        <Text>{text}</Text>
      </View>
    );
  }
  return (
    <View
      testID={testID ?? 'bubble-assistant'}
      style={{ flexDirection: 'row', gap: tokens.space.sm, maxWidth: '90%', marginBottom: tokens.space.md }}
    >
      {showAvatar ? <Avatar size="sm" /> : <View style={{ width: 32 }} />}
      <View style={{ flex: 1, paddingTop: tokens.space.xs }}>
        {text ? (
          <Text>
            {text}
            {streaming ? ' ▍' : ''}
          </Text>
        ) : streaming ? (
          <ActivityIndicator size="small" color={tokens.color.accent} style={{ alignSelf: 'flex-start' }} />
        ) : null}
      </View>
    </View>
  );
}

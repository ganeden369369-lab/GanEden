import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from './tokens';

/**
 * Screen container.
 * - Scrolling screens: the ScrollView owns keyboard handling (iOS adjusts its insets
 *   and scrolls the focused input into view; Android resizes the window itself).
 *   Wrapping a flexGrow ScrollView in a "padding" KeyboardAvoidingView pushed the
 *   focused field out of view on iOS.
 * - Non-scrolling screens (chat): KeyboardAvoidingView lifts the composer on iOS.
 */
export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const inner = <View style={{ flexGrow: 1, paddingHorizontal: tokens.space.xl, paddingVertical: tokens.space.xxl }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface }}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {inner}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {inner}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

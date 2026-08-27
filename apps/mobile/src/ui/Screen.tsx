import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from './tokens';
export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const inner = <View style={{ flexGrow: 1, paddingHorizontal: tokens.space.xl, paddingVertical: tokens.space.xxl }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

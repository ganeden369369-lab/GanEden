import { router } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { Button, Field, Screen, Text, tokens } from '../../src/ui';
import { useT } from '../../src/lib/i18n';
import { supabase } from '../../src/lib/supabase';

export default function Welcome() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) return setError(error.message);
    router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: tokens.space.lg }}>
        {/* eslint-disable-next-line @typescript-eslint/no-require-imports -- RN/Metro asset loading requires `require()` */}
        <Image source={require('../../../../assets/icon/lotus-mark.png')} style={{ height: 96, width: 160, alignSelf: 'center', marginBottom: tokens.space.md }} resizeMode="contain" />
        <Text variant="title" tone="accent" align="center" style={{ marginBottom: tokens.space.md }}>
          {t('auth.title')}
        </Text>
        <Field
          label={t('auth.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email"
        />
        {error ? (
          <Text variant="caption" style={{ color: tokens.color.danger, marginBottom: tokens.space.sm }}>
            {error}
          </Text>
        ) : null}
        <Button title={t('auth.sendCode')} onPress={sendCode} loading={busy} disabled={!email.includes('@')} testID="send-code" />
      </View>
    </Screen>
  );
}

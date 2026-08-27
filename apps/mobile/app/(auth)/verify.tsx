import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Screen, Text, tokens } from '../../src/ui';
import { useT } from '../../src/lib/i18n';
import { supabase } from '../../src/lib/supabase';

export default function Verify() {
  const t = useT();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email ?? '', token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace('/');
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: tokens.space.lg }}>
        <Text variant="body" align="center" style={{ marginBottom: tokens.space.md }}>
          {t('auth.sent', { email })}
        </Text>
        <Field label={t('auth.codeLabel')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} testID="code" />
        {error ? (
          <Text variant="caption" style={{ color: tokens.color.danger, marginBottom: tokens.space.sm }}>
            {error}
          </Text>
        ) : null}
        <Button title={t('auth.verify')} onPress={verify} loading={busy} disabled={code.length !== 6} testID="verify" />
      </View>
    </Screen>
  );
}

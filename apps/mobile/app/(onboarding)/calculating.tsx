import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ProfileInputSchema } from '@gan-eden/shared';
import { Button, Screen, Text, tokens } from '../../src/ui';
import { saveProfile } from '../../src/features/profile/saveProfile';
import { useT } from '../../src/lib/i18n';
import { supabase } from '../../src/lib/supabase';
import { useOnboarding } from '../../src/store/onboarding';

export default function Calculating() {
  const t = useT();
  const { draft } = useOnboarding();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function run() {
    setError(null);
    try {
      const input = ProfileInputSchema.parse(draft);
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('not signed in');
      const started = Date.now();
      await saveProfile(input, data.user.id);
      await qc.invalidateQueries({ queryKey: ['profile', data.user.id] });
      if (!active.current) return;
      const remaining = 1800 - (Date.now() - started); // let the moment breathe
      timeoutId.current = setTimeout(() => {
        if (active.current) router.replace('/(onboarding)/reveal' as Href);
      }, Math.max(0, remaining));
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    active.current = true;
    run();
    return () => {
      active.current = false;
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
    // run once on mount
  }, []);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space.lg, paddingHorizontal: tokens.space.xl }}>
        {error ? (
          <>
            <Text tone="muted" align="center">
              {error}
            </Text>
            <Button title={t('common.retry')} onPress={run} />
          </>
        ) : (
          <>
            <ActivityIndicator color={tokens.color.accent} size="large" />
            <Text variant="title" tone="accent" testID="calculating">
              {t('onboarding.calculating.title')}
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

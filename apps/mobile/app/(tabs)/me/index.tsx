import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Choice, Icon, Screen, Text, tokens } from '../../../src/ui';
import { setLanguage, useT } from '../../../src/lib/i18n';
import { supabase } from '../../../src/lib/supabase';

export default function Me() {
  const t = useT();
  const qc = useQueryClient();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return (
    <Screen>
      <Text variant="title" tone="accent" style={{ marginBottom: tokens.space.xl }}>
        {t('tabs.me')}
      </Text>
      <Text variant="caption" tone="muted" style={{ marginBottom: tokens.space.sm }}>
        {t('me.language')}
      </Text>
      <Choice label={t('onboarding.language.he')} selected={lang === 'he'} onPress={() => setLanguage('he')} />
      <Choice label={t('onboarding.language.en')} selected={lang === 'en'} onPress={() => setLanguage('en')} />
      <Pressable testID="me-memory" onPress={() => router.push('/(tabs)/me/memory' as Href)} style={{ marginTop: tokens.space.xl }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{t('me.memoryRow')}</Text>
          </View>
          <Icon name="chevron-forward" flipInRtl />
        </Card>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Button
        variant="ghost"
        title={t('me.signOut')}
        testID="sign-out"
        onPress={async () => {
          await supabase.auth.signOut();
          qc.clear();
          router.replace('/');
        }}
      />
    </Screen>
  );
}

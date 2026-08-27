import DateTimePicker from '@react-native-community/datetimepicker';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Field, StepFrame, Text, tokens } from '../../src/ui';
import { useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

const HEBREW = /[א-ת]/;

function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function defaultDob(): Date {
  return new Date(1995, 0, 1);
}

export default function AboutStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  const name = draft.fullName ?? '';
  const [date, setDate] = useState<Date>(draft.dob ? new Date(draft.dob) : defaultDob());
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);

  function updateDate(d: Date) {
    setDate(d);
    set({ dob: toIso(d) });
  }

  return (
    <StepFrame
      step={2}
      total={4}
      title={t('onboarding.about.title')}
      subtitle={t('onboarding.about.hint')}
      cta={t('common.continue')}
      ctaDisabled={name.trim().length < 2}
      onCta={() => {
        if (!draft.dob) set({ dob: toIso(date) });
        router.push('/(onboarding)/status' as Href);
      }}
    >
      <Field
        label={t('onboarding.about.nameLabel')}
        value={name}
        onChangeText={(v) => set({ fullName: v, script: HEBREW.test(v) ? 'he' : 'latin' })}
        autoCapitalize="words"
        testID="full-name"
      />
      {Platform.OS === 'web' ? (
        <Field
          label={t('onboarding.about.dobLabel')}
          value={draft.dob ?? ''}
          onChangeText={(v) => set({ dob: v })}
          placeholder="YYYY-MM-DD"
          testID="dob-input"
        />
      ) : (
        <>
          <Text variant="caption" tone="muted" style={{ marginBottom: tokens.space.sm }}>
            {t('onboarding.about.dobLabel')}
          </Text>
          <View style={{ alignItems: 'center', marginBottom: tokens.space.lg }} testID="dob-picker">
            <DateTimePicker value={date} mode="date" display="spinner" maximumDate={maxDate} onChange={(_, d) => d && updateDate(d)} />
          </View>
        </>
      )}
    </StepFrame>
  );
}

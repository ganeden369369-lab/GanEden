import DateTimePicker from '@react-native-community/datetimepicker';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Field, StepFrame, Text, tokens } from '../../src/ui';
import { useT } from '../../src/lib/i18n';
import { toIso } from '../../src/lib/dates';
import { useOnboarding } from '../../src/store/onboarding';

const HEBREW = /[א-ת]/;
const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function defaultDob(): Date {
  return new Date(1995, 0, 1);
}

function isValidDob(iso: string): boolean {
  const m = DOB_RE.exec(iso);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return false;
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setUTCFullYear(eighteenYearsAgo.getUTCFullYear() - 18);
  return date.getTime() <= eighteenYearsAgo.getTime();
}

export default function AboutStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  const name = draft.fullName ?? '';
  const [date, setDate] = useState<Date>(draft.dob ? new Date(draft.dob) : defaultDob());
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const dobText = draft.dob ?? '';
  const isWeb = Platform.OS === 'web';
  const nameValid = name.trim().length >= 2;
  const dobValid = isWeb ? isValidDob(dobText) : true;

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
      ctaDisabled={!nameValid || !dobValid}
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
      {isWeb ? (
        <Field
          label={t('onboarding.about.dobLabel')}
          value={dobText}
          onChangeText={(v) => set({ dob: v })}
          placeholder="YYYY-MM-DD"
          testID="dob-input"
          error={dobText.length > 0 && !isValidDob(dobText) ? t('onboarding.about.dobInvalid') : undefined}
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

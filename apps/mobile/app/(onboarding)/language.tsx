import { router, type Href } from 'expo-router';
import { Choice, StepFrame } from '../../src/ui';
import { currentLanguage, setLanguage, useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

export default function LanguageStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  const lang = draft.language ?? currentLanguage();
  return (
    <StepFrame
      step={1}
      total={4}
      title={t('onboarding.language.title')}
      cta={t('common.continue')}
      ctaTestID="continue"
      onCta={async () => {
        set({ language: lang });
        await setLanguage(lang);
        router.push('/(onboarding)/about' as Href);
      }}
    >
      <Choice label={t('onboarding.language.he')} selected={lang === 'he'} onPress={() => set({ language: 'he' })} testID="lang-he" />
      <Choice label={t('onboarding.language.en')} selected={lang === 'en'} onPress={() => set({ language: 'en' })} testID="lang-en" />
    </StepFrame>
  );
}

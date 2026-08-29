import { router, type Href } from 'expo-router';
import { GOALS, type Goal } from '@gan-eden/shared';
import { Choice, StepFrame } from '../../src/ui';
import { useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

export default function GoalsStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  const goals = draft.goals ?? [];
  const toggle = (g: Goal) => set({ goals: goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g] });
  return (
    <StepFrame
      step={4}
      total={4}
      title={t('onboarding.goals.title')}
      subtitle={t('onboarding.goals.subtitle')}
      cta={t('common.continue')}
      ctaDisabled={goals.length === 0}
      onCta={() => router.replace('/(onboarding)/calculating' as Href)}
    >
      {GOALS.map((g) => (
        <Choice key={g} label={t(`onboarding.goals.${g}`)} selected={goals.includes(g)} onPress={() => toggle(g)} testID={`goal-${g}`} />
      ))}
    </StepFrame>
  );
}

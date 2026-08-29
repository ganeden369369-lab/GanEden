import { router, type Href } from 'expo-router';
import { RELATIONSHIP_STATUSES } from '@gan-eden/shared';
import { Choice, StepFrame } from '../../src/ui';
import { useT } from '../../src/lib/i18n';
import { useOnboarding } from '../../src/store/onboarding';

export default function StatusStep() {
  const t = useT();
  const { draft, set } = useOnboarding();
  return (
    <StepFrame
      step={3}
      total={4}
      title={t('onboarding.status.title')}
      cta={t('common.continue')}
      ctaDisabled={!draft.relationshipStatus}
      onCta={() => router.push('/(onboarding)/goals' as Href)}
    >
      {RELATIONSHIP_STATUSES.map((s) => (
        <Choice
          key={s}
          label={t(`onboarding.status.${s}`)}
          selected={draft.relationshipStatus === s}
          onPress={() => set({ relationshipStatus: s })}
          testID={`status-${s}`}
        />
      ))}
    </StepFrame>
  );
}

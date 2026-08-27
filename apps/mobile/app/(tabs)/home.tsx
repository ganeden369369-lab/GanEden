import { personalCycles } from '@gan-eden/numerology';
import { Screen, Text, tokens } from '../../src/ui';
import { useProfile } from '../../src/features/profile/useProfile';
import { useT } from '../../src/lib/i18n';
import { todayIso } from '../../src/lib/dates';
import { useSession } from '../../src/lib/supabase';

export default function Home() {
  const t = useT();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  if (!profile) return null;
  const today = todayIso();
  const cycles = personalCycles(profile.dob.slice(0, 10), today);
  return (
    <Screen>
      <Text variant="title" tone="accent" testID="home-title">
        {profile.full_name.split(' ')[0]}
      </Text>
      <Text tone="muted" style={{ marginTop: tokens.space.sm }}>
        {t('numbers.personalDay', { n: cycles.personalDay })}
      </Text>
    </Screen>
  );
}

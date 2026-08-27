import { Screen, Text } from '../../src/ui';
import { useT } from '../../src/lib/i18n';

export default function Chat() {
  const t = useT();
  return (
    <Screen>
      <Text variant="title" tone="accent">
        {t('tabs.chat')}
      </Text>
    </Screen>
  );
}

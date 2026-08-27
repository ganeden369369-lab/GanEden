import { Text, View } from 'react-native';
import { useT } from '../src/lib/i18n';

export default function Index() {
  const t = useT();
  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <Text className="font-serif text-4xl text-roseDeep">{t('auth.title')}</Text>
    </View>
  );
}

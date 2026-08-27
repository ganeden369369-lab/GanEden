import { Tabs } from 'expo-router';
import { Icon, tokens } from '../../src/ui';
import { useT } from '../../src/lib/i18n';

export default function TabsLayout() {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.accent,
        tabBarInactiveTintColor: tokens.color.textMuted,
        tabBarStyle: { backgroundColor: tokens.color.surface, borderTopColor: tokens.color.border },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Icon name="flower-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.chat'),
          tabBarIcon: ({ color, size }) => <Icon name="chatbubble-ellipses-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="numbers"
        options={{
          title: t('tabs.numbers'),
          tabBarIcon: ({ color, size }) => <Icon name="sparkles-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: t('tabs.me'),
          tabBarIcon: ({ color, size }) => <Icon name="person-outline" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}

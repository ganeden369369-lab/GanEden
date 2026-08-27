import '../global.css';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { initI18n } from '../src/lib/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initI18n().finally(() => {
      setReady(true);
      SplashScreen.hideAsync();
    });
  }, []);
  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

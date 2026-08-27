import '../global.css';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Heebo_400Regular, Heebo_600SemiBold } from '@expo-google-fonts/heebo';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond';
import { FrankRuhlLibre_500Medium } from '@expo-google-fonts/frank-ruhl-libre';
import { initI18n } from '../src/lib/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
    Heebo_600SemiBold,
    CormorantGaramond_500Medium,
    FrankRuhlLibre_500Medium,
  });
  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);
  const ready = fontsLoaded && i18nReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

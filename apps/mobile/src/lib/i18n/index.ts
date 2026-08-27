import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';
import i18next from 'i18next';
import { I18nManager } from 'react-native';
import { initReactI18next, useTranslation } from 'react-i18next';
import type { Language } from '@gan-eden/shared';
import en from './en.json';
import he from './he.json';

const STORAGE_KEY = 'gan-eden.language';

function deviceLanguage(): Language {
  const code = Localization.getLocales()[0]?.languageCode;
  return code === 'he' ? 'he' : 'en';
}

let appliedRtl: boolean = I18nManager.isRTL; // native state at JS load

export async function initI18n(): Promise<Language> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  const lang: Language = stored === 'he' || stored === 'en' ? stored : deviceLanguage();
  await i18next.use(initReactI18next).init({
    resources: { en: { translation: en }, he: { translation: he } },
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  if (applyDirection(lang)) await reloadIfPossible();
  return lang;
}

function applyDirection(lang: Language): boolean {
  const rtl = lang === 'he';
  I18nManager.allowRTL(rtl);
  if (appliedRtl === rtl) return false;
  I18nManager.forceRTL(rtl);
  appliedRtl = rtl;
  return true; // direction changed → native reload needed
}

async function reloadIfPossible(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch {
    // Expo Go cannot reload programmatically; the user reloads manually. Direction applies on next launch.
  }
}

export async function setLanguage(lang: Language): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18next.changeLanguage(lang);
  if (applyDirection(lang)) await reloadIfPossible();
}

export function currentLanguage(): Language {
  return (i18next.language as Language) ?? 'en';
}

export function useT() {
  return useTranslation().t;
}

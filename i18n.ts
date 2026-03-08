import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';

const STORE_LANGUAGE_KEY = '@app_language';

const languageDetectorPlugin = {
    type: 'languageDetector' as const,
    async: true,
    init: () => { },
    detect: async function (callback: (lang: string) => void) {
        try {
            const savedLanguage = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
            if (savedLanguage) {
                return callback(savedLanguage);
            }

            const deviceLang = Localization.getLocales()[0]?.languageCode;
            if (deviceLang) {
                return callback(deviceLang);
            }
        } catch {
            console.log('Error reading saved language');
        }
        callback('en');
    },
    cacheUserLanguage: async function (language: string) {
        try {
            await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
        } catch { }
    },
};

const i18nInstance = createInstance();

i18nInstance
    .use(languageDetectorPlugin)
    .use(initReactI18next)
    .init({
        compatibilityJSON: 'v4',
        resources: {
            en: { translation: en },
            es: { translation: es },
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18nInstance;
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';

const resources = {
  en: { translation: translationEN },
  es: { translation: translationES }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // El idioma de respaldo si el detectado no es ni 'es' ni 'en'
    fallbackLng: "en", 
    detection: {
      // 1. Miramos si el usuario ya eligió uno manualmente (localStorage)
      // 2. Si no, miramos el navegador (navigator)
      order: ['localStorage', 'navigator'],
      // Esto asegura que si el navegador es 'fr' o 'de', salte a 'en' (fallback)
      lookupNavigator: true,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
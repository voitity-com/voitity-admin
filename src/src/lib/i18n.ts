import { use } from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import { logger } from '@/lib/default-logger';

export const fallbackLanguage = 'en';
export const supportedLanguages = ['en', 'es'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export function getSupportedLanguage(language?: null | string): SupportedLanguage {
  const normalizedLanguage = language?.split('-')[0]?.toLowerCase();

  return supportedLanguages.includes(normalizedLanguage as SupportedLanguage)
    ? (normalizedLanguage as SupportedLanguage)
    : fallbackLanguage;
}

export function getBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return fallbackLanguage;
  }

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const supportedLanguage = browserLanguages.find((language) =>
    supportedLanguages.includes(language.split('-')[0]?.toLowerCase() as SupportedLanguage)
  );

  return getSupportedLanguage(supportedLanguage);
}

export const i18n = use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: fallbackLanguage,
    interpolation: { escapeValue: false },
    lng: getBrowserLanguage(),
    load: 'languageOnly',
    supportedLngs: supportedLanguages,
  })
  .catch((err) => {
    logger.error('Failed to initialize i18n', err);
  });

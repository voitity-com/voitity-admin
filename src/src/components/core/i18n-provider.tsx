'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import { getBrowserLanguage, getSupportedLanguage, languageStorageKey } from '@/lib/i18n';

export interface I18nProviderProps {
  children: React.ReactNode;
  language?: string;
}

export function I18nProvider({ children, language }: I18nProviderProps): React.JSX.Element {
  const { i18n } = useTranslation();
  const resolvedLanguage = React.useMemo(
    () => (language ? getSupportedLanguage(language) : getBrowserLanguage()),
    [language]
  );

  React.useEffect(() => {
    i18n.changeLanguage(resolvedLanguage).catch(() => {
      logger.error(`Failed to change language to ${resolvedLanguage}`);
    });
  }, [i18n, resolvedLanguage]);

  React.useEffect(() => {
    const syncDocumentLanguage = (nextLanguage: string): void => {
      const supportedLanguage = getSupportedLanguage(nextLanguage);

      document.documentElement.lang = supportedLanguage;

      try {
        window.localStorage.setItem(languageStorageKey, supportedLanguage);
      } catch {
        // The current session still changes language when storage is unavailable.
      }
    };

    syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language ?? resolvedLanguage);
    i18n.on('languageChanged', syncDocumentLanguage);

    return () => {
      i18n.off('languageChanged', syncDocumentLanguage);
    };
  }, [i18n, resolvedLanguage]);

  return <React.Fragment>{children}</React.Fragment>;
}

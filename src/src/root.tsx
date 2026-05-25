'use client';

import * as React from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import '@/styles/global.css';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { applyDefaultSettings } from '@/lib/settings/apply-default-settings';
import { logger } from '@/lib/default-logger';
import { preloadGoogleScript } from '@/lib/google/oauth';
import { getSettings as getPersistedSettings } from '@/lib/settings/get-settings';
import { UserProvider } from '@/contexts/auth/user-context';
import { SettingsProvider } from '@/contexts/settings';
import { Analytics } from '@/components/core/analytics';
import { I18nProvider } from '@/components/core/i18n-provider';
import { LocalizationProvider } from '@/components/core/localization-provider';
import { SettingsButton } from '@/components/core/settings/settings-button';
import { ThemeProvider } from '@/components/core/theme-provider/theme-provider';
import { Toaster } from '@/components/core/toaster';

const metadata: Metadata = { title: config.site.name };

interface RootProps {
  children: React.ReactNode;
}

export function Root({ children }: RootProps): React.JSX.Element {
  const settings = React.useRef(applyDefaultSettings(getPersistedSettings()));

  React.useEffect(() => {
    if (!config.google?.clientId) {
      logger.warn('VITE_GOOGLE_CLIENT_ID is not configured. Google sign-in will fail until it is set.');
      return;
    }

    preloadGoogleScript().catch((error) => {
      logger.error(error);
    });
  }, []);

  const appTree = (
    <Analytics>
      <LocalizationProvider>
        <UserProvider>
          <SettingsProvider settings={settings.current}>
            <I18nProvider>
              <ThemeProvider>
                {children}
                <SettingsButton />
                <Toaster position="bottom-right" />
              </ThemeProvider>
            </I18nProvider>
          </SettingsProvider>
        </UserProvider>
      </LocalizationProvider>
    </Analytics>
  );
  return (
    <HelmetProvider>
      <Helmet>
        <meta content={config.site.themeColor} name="theme-color" />
        <title>{metadata.title}</title>
      </Helmet>
      {appTree}
    </HelmetProvider>
  );
}

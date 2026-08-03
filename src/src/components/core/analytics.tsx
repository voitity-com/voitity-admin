'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';
import { usePathname } from '@/hooks/use-pathname';
import {
  getAnalyticsConsent,
  initializeGoogleAnalytics,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
  trackPageView,
  type AnalyticsConsent as AnalyticsConsentValue,
} from '@/lib/google-analytics';

interface AnalyticsProps {
  children: React.ReactNode;
}

export function Analytics({ children }: AnalyticsProps): React.JSX.Element {
  const pathname = usePathname();
  const { i18n, t } = useTranslation();
  const [consent, setConsent] = React.useState<AnalyticsConsentValue>(() => getAnalyticsConsent());
  const [isOpen, setIsOpen] = React.useState(consent === 'unset');
  const privacyUrl = `${config.publicProfile?.baseUrl ?? 'https://bigmelo.com'}/${
    i18n.resolvedLanguage?.startsWith('en') ? 'privacy' : 'privacidad'
  }`;

  React.useEffect(() => {
    setConsent(initializeGoogleAnalytics());

    return subscribeToAnalyticsConsent((nextConsent) => {
      setConsent(nextConsent);
      setIsOpen(false);

      if (nextConsent === 'granted') {
        trackPageView(pathname);
      }
    });
  }, [pathname]);

  React.useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  const chooseConsent = React.useCallback((nextConsent: Exclude<AnalyticsConsentValue, 'unset'>): void => {
    setAnalyticsConsent(nextConsent);
  }, []);

  return (
    <React.Fragment>
      {children}
      {isOpen || consent === 'unset' ? (
        <Paper
          aria-label={t('analyticsConsent.title')}
          elevation={16}
          role="dialog"
          sx={{
            alignItems: { md: 'center' },
            bottom: { xs: 16, md: 24 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            left: { xs: 16, md: '50%' },
            maxWidth: 960,
            p: 2.5,
            position: 'fixed',
            right: { xs: 16, md: 'auto' },
            transform: { md: 'translateX(-50%)' },
            width: { md: 'calc(100% - 48px)' },
            zIndex: 1500,
          }}
        >
          <Box sx={{ flex: '1 1 auto' }}>
            <Typography fontWeight={700} variant="subtitle1">
              {t('analyticsConsent.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
              {t('analyticsConsent.body')}{' '}
              <Link href={privacyUrl} rel="noopener noreferrer" target="_blank">
                {t('analyticsConsent.privacy')}
              </Link>
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}>
            <Button fullWidth variant="outlined" onClick={() => chooseConsent('denied')}>
              {t('analyticsConsent.reject')}
            </Button>
            <Button fullWidth variant="contained" onClick={() => chooseConsent('granted')}>
              {t('analyticsConsent.accept')}
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Button
          size="small"
          variant="outlined"
          onClick={() => setIsOpen(true)}
          sx={{
            bgcolor: 'background.paper',
            bottom: 12,
            fontSize: '0.7rem',
            left: 12,
            minWidth: 0,
            position: 'fixed',
            px: 1.25,
            py: 0.5,
            zIndex: 1300,
          }}
        >
          {t('analyticsConsent.manage')}
        </Button>
      )}
    </React.Fragment>
  );
}

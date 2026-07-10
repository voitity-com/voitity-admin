'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import { logger } from '@/lib/default-logger';
import { RouterLink } from '@/components/core/link';

const metadata = { title: `Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    let isMounted = true;

    getSubscriptionLimits()
      .then(() => {
        if (isMounted) {
          navigate(paths.dashboard.profiles, { replace: true });
        }
      })
      .catch((err) => {
        if (err instanceof SubscriptionApiError && err.status === 404) {
          if (isMounted) {
            navigate(paths.dashboard.settings.billing, { replace: true });
          }

          return;
        }

        logger.error(err);

        if (isMounted) {
          setError(err instanceof Error ? err.message : t('dashboard.redirect.errors.generic'));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [navigate, t]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Box
        sx={{
          maxWidth: 'var(--Content-maxWidth)',
          m: 'var(--Content-margin)',
          p: 'var(--Content-padding)',
          width: 'var(--Content-width)',
        }}
      >
        <Stack spacing={3}>
          <Typography variant="h4">{t('dashboard.redirect.title')}</Typography>
          {error ? (
            <Card>
              <Stack spacing={2} sx={{ p: 3 }}>
                <Alert color="error">{error}</Alert>
                <Typography color="text.secondary" variant="body2">
                  {t('dashboard.redirect.errorDescription')}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button component={RouterLink} href={paths.dashboard.settings.billing} variant="contained">
                    {t('dashboard.redirect.actions.billing')}
                  </Button>
                  <Button component={RouterLink} href={paths.dashboard.profiles} variant="outlined">
                    {t('dashboard.redirect.actions.profiles')}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          ) : (
            <Card>
              <Stack spacing={2} sx={{ alignItems: 'center', p: 4 }}>
                <CircularProgress />
                <Typography color="text.secondary" variant="body2">
                  {t('dashboard.redirect.checking')}
                </Typography>
              </Stack>
            </Card>
          )}
        </Stack>
      </Box>
    </React.Fragment>
  );
}

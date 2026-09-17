'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import { RouterLink } from '@/components/core/link';
import { useNoPlanTutorial } from '@/components/dashboard/layout/no-plan-tutorial-context';

type AccessStatus = 'allowed' | 'checking' | 'error' | 'plan-required';

export interface ProfileSubscriptionGateProps {
  children: React.ReactNode;
}

export function ProfileSubscriptionGate({ children }: ProfileSubscriptionGateProps): React.JSX.Element {
  const { t } = useTranslation();
  const { setSuppressed: setNoPlanTutorialSuppressed } = useNoPlanTutorial();
  const [status, setStatus] = React.useState<AccessStatus>('checking');
  const [error, setError] = React.useState('');
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;

    setStatus('checking');
    setError('');

    getSubscriptionLimits()
      .then(() => {
        if (isMounted) {
          setStatus('allowed');
        }
      })
      .catch((loadError: unknown) => {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof SubscriptionApiError && loadError.status === 404) {
          setStatus('plan-required');
          return;
        }

        logger.error(loadError);
        setError(loadError instanceof Error ? loadError.message : t('dashboard.profiles.planRequired.error'));
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [revision, t]);

  React.useEffect(() => {
    setNoPlanTutorialSuppressed(status !== 'allowed');

    return () => {
      setNoPlanTutorialSuppressed(false);
    };
  }, [setNoPlanTutorialSuppressed, status]);

  if (status === 'allowed') {
    return <React.Fragment>{children}</React.Fragment>;
  }

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: 'calc(100dvh - var(--MainNav-height, 64px))',
        p: 'var(--Content-padding)',
      }}
    >
      {status === 'checking' ? <CircularProgress /> : null}
      {status === 'plan-required' ? (
        <Card sx={{ maxWidth: 560, width: '100%' }}>
          <Stack spacing={2} sx={{ p: { sm: 4, xs: 3 } }}>
            <Alert color="warning">{t('dashboard.profiles.planRequired.title')}</Alert>
            <Typography color="text.secondary">{t('dashboard.profiles.planRequired.description')}</Typography>
            <Button component={RouterLink} href={paths.dashboard.settings.billing} variant="contained">
              {t('dashboard.profiles.planRequired.action')}
            </Button>
          </Stack>
        </Card>
      ) : null}
      {status === 'error' ? (
        <Card sx={{ maxWidth: 560, width: '100%' }}>
          <Stack spacing={2} sx={{ p: { sm: 4, xs: 3 } }}>
            <Alert color="error">{error}</Alert>
            <Button
              onClick={() => {
                setRevision((currentRevision) => currentRevision + 1);
              }}
              variant="contained"
            >
              {t('dashboard.profiles.actions.retry')}
            </Button>
          </Stack>
        </Card>
      ) : null}
    </Box>
  );
}

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { SubscriptionLimits } from '@/lib/subscription/api-client';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import { logger } from '@/lib/default-logger';

import { SubscriptionUsage } from './subscription-limits';

export function UsagePageContent(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [limits, setLimits] = React.useState<SubscriptionLimits | null>(null);
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadLimits = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setLimits(await getSubscriptionLimits());
    } catch (err) {
      if (isMissingActiveSubscriptionError(err)) {
        setLimits({});

        return;
      }

      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.settings.usage.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadLimits().catch((err) => {
      logger.error(err);
    });
  }, [loadLimits]);

  return (
    <Stack spacing={4}>
      <div>
        <Typography variant="h4">{t('dashboard.settings.usage.pageTitle')}</Typography>
      </div>
      {error ? <Alert color="error">{error}</Alert> : null}
      {isLoading ? (
        <Card>
          <Stack sx={{ alignItems: 'center', p: 4 }}>
            <CircularProgress />
          </Stack>
        </Card>
      ) : limits ? (
        <SubscriptionUsage data={limits} language={language} />
      ) : null}
    </Stack>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isMissingActiveSubscriptionError(error: unknown): boolean {
  return error instanceof SubscriptionApiError && error.status === 404;
}

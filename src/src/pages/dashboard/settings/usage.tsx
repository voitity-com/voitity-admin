import * as React from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { SubscriptionLimits } from '@/lib/subscription/api-client';
import { getSubscriptionLimits } from '@/lib/subscription/api-client';
import { logger } from '@/lib/default-logger';
import { SubscriptionUsage } from '@/components/dashboard/settings/subscription-limits';

const metadata = { title: `Usage | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
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
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
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
    </React.Fragment>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

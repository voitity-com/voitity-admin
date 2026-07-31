import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { SubscriptionLimits, UsageAnalytics } from '@/lib/subscription/api-client';
import {
  getSubscriptionLimits,
  getUsageAnalytics,
  SubscriptionApiError,
} from '@/lib/subscription/api-client';
import { logger } from '@/lib/default-logger';

import { SubscriptionUsage } from './subscription-limits';
import { UsageAnalyticsPanel } from './usage-analytics-panel';

export function UsagePageContent(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const initialRange = React.useMemo(() => getInitialRange(), []);
  const [limits, setLimits] = React.useState<SubscriptionLimits | null>(null);
  const [analytics, setAnalytics] = React.useState<UsageAnalytics | null>(null);
  const [from, setFrom] = React.useState<string>(initialRange.from);
  const [to, setTo] = React.useState<string>(initialRange.to);
  const [groupBy, setGroupBy] = React.useState<'day' | 'month'>('month');
  const [appliedRange, setAppliedRange] = React.useState<{
    from: string;
    groupBy: 'day' | 'month';
    to: string;
  }>(initialRange);
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadUsage = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const analyticsResult = await getUsageAnalytics({
        from: appliedRange.from,
        groupBy: appliedRange.groupBy,
        to: appliedRange.to,
      });
      setAnalytics(analyticsResult);

      try {
        setLimits(await getSubscriptionLimits());
      } catch (err) {
        if (isMissingActiveSubscriptionError(err)) {
          setLimits({});
        } else {
          throw err;
        }
      }
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.settings.usage.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [appliedRange, t]);

  React.useEffect(() => {
    loadUsage().catch((err) => {
      logger.error(err);
    });
  }, [loadUsage]);

  return (
    <Stack spacing={4}>
      <div>
        <Typography variant="h4">{t('dashboard.settings.usage.pageTitle')}</Typography>
      </div>
      <Card>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'center' }, p: 2 }}
        >
          <TextField
            InputLabelProps={{ shrink: true }}
            fullWidth
            label={t('dashboard.settings.usage.filters.from')}
            onChange={(event) => {
              setFrom(event.target.value);
            }}
            size="small"
            type="date"
            value={from}
          />
          <TextField
            InputLabelProps={{ shrink: true }}
            fullWidth
            inputProps={{ min: from }}
            label={t('dashboard.settings.usage.filters.to')}
            onChange={(event) => {
              setTo(event.target.value);
            }}
            size="small"
            type="date"
            value={to}
          />
          <FormControl fullWidth size="small">
            <InputLabel id="usage-group-by-label">
              {t('dashboard.settings.usage.filters.groupBy')}
            </InputLabel>
            <Select
              label={t('dashboard.settings.usage.filters.groupBy')}
              labelId="usage-group-by-label"
              onChange={(event) => {
                setGroupBy(event.target.value as 'day' | 'month');
              }}
              value={groupBy}
            >
              <MenuItem value="day">{t('dashboard.settings.usage.filters.day')}</MenuItem>
              <MenuItem value="month">{t('dashboard.settings.usage.filters.month')}</MenuItem>
            </Select>
          </FormControl>
          <Button
            disabled={!from || !to || from > to || isLoading}
            onClick={() => {
              setAppliedRange({ from, groupBy, to });
            }}
            size="large"
            variant="contained"
          >
            {t('dashboard.settings.usage.filters.apply')}
          </Button>
        </Stack>
      </Card>
      {error ? <Alert color="error">{error}</Alert> : null}
      {isLoading ? (
        <Card>
          <Stack sx={{ alignItems: 'center', p: 4 }}>
            <CircularProgress />
          </Stack>
        </Card>
      ) : (
        <Stack spacing={4}>
          {limits ? <SubscriptionUsage data={limits} language={language} /> : null}
          {analytics ? <UsageAnalyticsPanel data={analytics} language={language} /> : null}
        </Stack>
      )}
    </Stack>
  );
}

function getInitialRange(): { from: string; groupBy: 'month'; to: string } {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  return {
    from: formatDateInput(from),
    groupBy: 'month',
    to: formatDateInput(today),
  };
}

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isMissingActiveSubscriptionError(error: unknown): boolean {
  return error instanceof SubscriptionApiError && error.status === 404;
}

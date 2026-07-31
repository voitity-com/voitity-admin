import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import type { SubscriptionLimits, UsageAnalytics } from '@/lib/subscription/api-client';
import { getSubscriptionLimits, getUsageAnalytics, SubscriptionApiError } from '@/lib/subscription/api-client';

import { UsageDashboardVariant, type UsageDashboardVersion } from './usage-dashboard-variants';

export interface UsagePageContentProps {
  version: UsageDashboardVersion;
}

type UsageTab = 'credits' | 'plan';

export function UsagePageContent({ version }: UsagePageContentProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const initialRange = React.useMemo(() => getInitialRange(), []);
  const [tab, setTab] = React.useState<UsageTab>('plan');
  const [limits, setLimits] = React.useState<SubscriptionLimits | null>(null);
  const [analytics, setAnalytics] = React.useState<UsageAnalytics | null>(null);
  const [from, setFrom] = React.useState<string>(initialRange.from);
  const [to, setTo] = React.useState<string>(initialRange.to);
  const [groupBy, setGroupBy] = React.useState<'day' | 'month'>(initialRange.groupBy);
  const [appliedRange, setAppliedRange] = React.useState<{
    from: string;
    groupBy: 'day' | 'month';
    to: string;
  }>(initialRange);
  const [limitsError, setLimitsError] = React.useState<string>('');
  const [analyticsError, setAnalyticsError] = React.useState<string>('');
  const [isLimitsLoading, setIsLimitsLoading] = React.useState<boolean>(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let active = true;

    setIsLimitsLoading(true);
    setLimitsError('');
    getSubscriptionLimits()
      .then((result) => {
        if (active) {
          setLimits(result);
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (isMissingActiveSubscriptionError(error)) {
          setLimits({});
          return;
        }

        logger.error(error);
        setLimitsError(getErrorMessage(error, t('dashboard.settings.usage.errors.generic')));
      })
      .finally(() => {
        if (active) {
          setIsLimitsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

  React.useEffect(() => {
    let active = true;

    setIsAnalyticsLoading(true);
    setAnalyticsError('');
    getUsageAnalytics(appliedRange)
      .then((result) => {
        if (active) {
          setAnalytics(result);
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        logger.error(error);
        setAnalyticsError(getErrorMessage(error, t('dashboard.settings.usage.errors.analytics')));
      })
      .finally(() => {
        if (active) {
          setIsAnalyticsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appliedRange, t]);

  const isCurrentTabLoading = tab === 'plan' ? isLimitsLoading : isAnalyticsLoading;
  const currentError = tab === 'plan' ? limitsError : analyticsError;

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">{t('dashboard.settings.usage.pageTitle')}</Typography>
        <Typography color="text.secondary" variant="body2">
          {t(`dashboard.settings.usage.versions.${version}`)}
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          aria-label={t('dashboard.settings.usage.tabs.label')}
          onChange={(_event, value: UsageTab) => {
            setTab(value);
          }}
          value={tab}
        >
          <Tab label={t('dashboard.settings.usage.tabs.plan')} value="plan" />
          <Tab label={t('dashboard.settings.usage.tabs.credits')} value="credits" />
        </Tabs>
      </Box>

      {tab === 'credits' ? (
        <Card variant="outlined">
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: { lg: 'center' }, p: 2 }}>
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
              <InputLabel id="usage-group-by-label">{t('dashboard.settings.usage.filters.groupBy')}</InputLabel>
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
              disabled={!from || !to || from > to || isAnalyticsLoading}
              onClick={() => {
                setAppliedRange({ from, groupBy, to });
              }}
              size="large"
              sx={{ flexShrink: 0 }}
              variant="contained"
            >
              {t('dashboard.settings.usage.filters.apply')}
            </Button>
          </Stack>
        </Card>
      ) : null}

      {currentError ? <Alert color="error">{currentError}</Alert> : null}
      {isCurrentTabLoading ? (
        <Card variant="outlined">
          <Stack sx={{ alignItems: 'center', p: 5 }}>
            <CircularProgress />
          </Stack>
        </Card>
      ) : (
        <UsageDashboardVariant analytics={analytics} language={language} limits={limits} tab={tab} version={version} />
      )}
    </Stack>
  );
}

function getInitialRange(): { from: string; groupBy: 'day'; to: string } {
  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - 1);

  return {
    from: formatDateInput(from),
    groupBy: 'day',
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

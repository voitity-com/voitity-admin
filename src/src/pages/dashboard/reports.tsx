'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import TablePagination from '@mui/material/TablePagination';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import type {
  ActivationCampaign,
  ActivationEventName,
  ActivationFunnelStage,
  ActivationReport,
  ActivationReportFilters,
  ActivationReportUser,
  ActivationReportUsersPage,
} from '@/lib/reports/api-client';
import { getActivationReport, listActivationReportUsers } from '@/lib/reports/api-client';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { RouterLink } from '@/components/core/link';

const metadata = { title: `Reports | Dashboard | ${config.site.name}` } satisfies Metadata;
const DEFAULT_PER_PAGE = 20;

interface FilterValues {
  campaign: string;
  from: string;
  medium: string;
  search: string;
  source: string;
  to: string;
}

export function Page(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [tab, setTab] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [filters, setFilters] = React.useState<FilterValues>(() => defaultFilters());
  const [appliedFilters, setAppliedFilters] = React.useState<FilterValues>(() => defaultFilters());
  const [report, setReport] = React.useState<ActivationReport | null>(null);
  const [usersPage, setUsersPage] = React.useState<ActivationReportUsersPage | null>(null);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  const requestFilters = React.useMemo<ActivationReportFilters>(
    () => ({ ...appliedFilters, page, perPage }),
    [appliedFilters, page, perPage]
  );

  const loadReports = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const [nextReport, nextUsersPage] = await Promise.all([
        getActivationReport(requestFilters),
        listActivationReportUsers(requestFilters),
      ]);
      setReport(nextReport);
      setUsersPage(nextUsersPage);
    } catch (err) {
      logger.error(err);
      setError(err instanceof Error ? err.message : t('dashboard.reports.errors.generic'));
    } finally {
      setIsLoading(false);
    }
  }, [requestFilters, t]);

  React.useEffect(() => {
    loadReports().catch((err) => {
      logger.error(err);
    });
  }, [loadReports]);

  const handleApplyFilters = React.useCallback(
    (event: React.FormEvent): void => {
      event.preventDefault();
      setPage(1);
      setAppliedFilters(filters);
    },
    [filters]
  );

  const setFilter = React.useCallback((key: keyof FilterValues, value: string): void => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const pagination = usersPage?.pagination ?? {
    current_page: page,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

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
        <Stack spacing={4}>
          <Stack spacing={0.5}>
            <Typography variant="h4">{t('dashboard.reports.title')}</Typography>
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.reports.description')}
            </Typography>
          </Stack>

          <Card component="form" onSubmit={handleApplyFilters}>
            <CardHeader title={t('dashboard.reports.filters.title')} />
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { lg: 'repeat(6, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', xs: '1fr' },
                }}
              >
                <TextField
                  InputLabelProps={{ shrink: true }}
                  label={t('dashboard.reports.filters.from')}
                  onChange={(event) => setFilter('from', event.target.value)}
                  type="date"
                  value={filters.from}
                />
                <TextField
                  InputLabelProps={{ shrink: true }}
                  label={t('dashboard.reports.filters.to')}
                  onChange={(event) => setFilter('to', event.target.value)}
                  type="date"
                  value={filters.to}
                />
                <TextField
                  label={t('dashboard.reports.filters.campaign')}
                  onChange={(event) => setFilter('campaign', event.target.value)}
                  value={filters.campaign}
                />
                <TextField
                  label={t('dashboard.reports.filters.source')}
                  onChange={(event) => setFilter('source', event.target.value)}
                  value={filters.source}
                />
                <TextField
                  label={t('dashboard.reports.filters.medium')}
                  onChange={(event) => setFilter('medium', event.target.value)}
                  value={filters.medium}
                />
                <TextField
                  label={t('dashboard.reports.filters.search')}
                  onChange={(event) => setFilter('search', event.target.value)}
                  value={filters.search}
                />
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 2 }}>
                <Button startIcon={<ArrowClockwiseIcon />} type="submit" variant="contained">
                  {t('dashboard.reports.filters.apply')}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {error ? <Alert color="error">{error}</Alert> : null}

          {isLoading && !report ? (
            <Stack sx={{ alignItems: 'center', p: 6 }}>
              <CircularProgress />
            </Stack>
          ) : report ? (
            <React.Fragment>
              <OverviewCards report={report} t={t} />
              <Card>
                <Tabs
                  aria-label={t('dashboard.reports.tabs.ariaLabel')}
                  onChange={(_event, value: number) => setTab(value)}
                  sx={{ px: 2 }}
                  value={tab}
                  variant="scrollable"
                >
                  <Tab label={t('dashboard.reports.tabs.funnel')} />
                  <Tab label={t('dashboard.reports.tabs.users')} />
                  <Tab label={t('dashboard.reports.tabs.campaigns')} />
                  <Tab label={t('dashboard.reports.tabs.conversion')} />
                </Tabs>

                {isLoading ? <LinearProgress /> : null}

                <CardContent>
                  {tab === 0 ? <FunnelPanel rows={report.funnel} t={t} /> : null}
                  {tab === 1 ? (
                    <UsersPanel
                      language={language}
                      onPageChange={setPage}
                      onPerPageChange={(value) => {
                        setPage(1);
                        setPerPage(value);
                      }}
                      page={pagination.current_page}
                      perPage={pagination.per_page}
                      rows={usersPage?.users ?? []}
                      t={t}
                      total={pagination.total}
                    />
                  ) : null}
                  {tab === 2 ? <CampaignsPanel rows={report.campaigns} t={t} /> : null}
                  {tab === 3 ? <ConversionPanel report={report} t={t} /> : null}
                </CardContent>
              </Card>
            </React.Fragment>
          ) : null}
        </Stack>
      </Box>
    </React.Fragment>
  );
}

function OverviewCards({ report, t }: { report: ActivationReport; t: Translation }): React.JSX.Element {
  const cards = [
    ['trialsStarted', report.overview.trials_started],
    ['usersActivated', report.overview.users_activated],
    ['activationRate', `${formatNumber(report.overview.activation_rate)}%`],
    ['convertedToPaid', report.overview.converted_to_paid],
  ] as const;

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { lg: 'repeat(4, 1fr)', sm: 'repeat(2, 1fr)', xs: '1fr' } }}>
      {cards.map(([key, value]) => (
        <Card key={key}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              {t(`dashboard.reports.overview.${key}`)}
            </Typography>
            <Typography sx={{ mt: 1 }} variant="h4">
              {value}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function FunnelPanel({ rows, t }: { rows: ActivationFunnelStage[]; t: Translation }): React.JSX.Element {
  const columns: ColumnDef<ActivationFunnelStage>[] = [
    { name: t('dashboard.reports.columns.stage'), formatter: (row) => eventLabel(row.event, t) },
    { name: t('dashboard.reports.columns.users'), field: 'users', align: 'right' },
    {
      name: t('dashboard.reports.columns.previousConversion'),
      formatter: (row) => `${formatNumber(row.conversion_previous)}%`,
      align: 'right',
    },
    {
      name: t('dashboard.reports.columns.totalConversion'),
      formatter: (row) => (
        <Stack spacing={0.5} sx={{ minWidth: 150 }}>
          <Typography variant="body2">{formatNumber(row.conversion_total)}%</Typography>
          <LinearProgress value={Math.min(100, row.conversion_total)} variant="determinate" />
        </Stack>
      ),
    },
    { name: t('dashboard.reports.columns.dropOff'), field: 'drop_off', align: 'right' },
  ];

  return rows.length ? (
    <Box sx={{ overflowX: 'auto' }}>
      <DataTable columns={columns} rows={rows} uniqueRowId={(row) => row.event} />
    </Box>
  ) : (
    <EmptyState t={t} />
  );
}

function UsersPanel({
  language,
  onPageChange,
  onPerPageChange,
  page,
  perPage,
  rows,
  t,
  total,
}: {
  language: string;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  page: number;
  perPage: number;
  rows: ActivationReportUser[];
  t: Translation;
  total: number;
}): React.JSX.Element {
  const columns: ColumnDef<ActivationReportUser>[] = [
    {
      name: t('dashboard.reports.columns.user'),
      formatter: (row) => (
        <Stack spacing={0.25}>
          <Typography variant="subtitle2">{row.name}</Typography>
          <Typography color="text.secondary" variant="caption">
            {row.email}
          </Typography>
        </Stack>
      ),
    },
    {
      name: t('dashboard.reports.columns.trialStarted'),
      formatter: (row) => formatDate(row.trial_started_at, language),
    },
    {
      name: t('dashboard.reports.columns.progress'),
      formatter: (row) => `${row.completed_events.length}/9`,
      align: 'right',
    },
    {
      name: t('dashboard.reports.columns.nextStep'),
      formatter: (row) => (row.next_step ? eventLabel(row.next_step, t) : t('dashboard.reports.complete')),
    },
    {
      name: t('dashboard.reports.columns.campaign'),
      formatter: (row) => row.attribution.utm_campaign || t('dashboard.reports.direct'),
    },
    {
      name: t('dashboard.reports.columns.status'),
      formatter: (row) => (
        <Chip
          color={row.activated ? 'success' : 'warning'}
          label={row.activated ? t('dashboard.reports.status.activated') : t('dashboard.reports.status.inProgress')}
          size="small"
          variant="soft"
        />
      ),
    },
    {
      name: t('dashboard.reports.columns.profile'),
      formatter: (row) =>
        row.profile ? (
          <Button
            component={RouterLink}
            href={paths.dashboard.profileDetails.profile(String(row.profile.id))}
            size="small"
            variant="text"
          >
            {row.profile.name}
          </Button>
        ) : (
          t('dashboard.reports.noProfile')
        ),
    },
  ];

  return (
    <Stack spacing={1}>
      {rows.length ? (
        <Box sx={{ overflowX: 'auto' }}>
          <DataTable columns={columns} rows={rows} />
        </Box>
      ) : (
        <EmptyState t={t} />
      )}
      <TablePagination
        component="div"
        count={total}
        onPageChange={(_event, nextPage) => onPageChange(nextPage + 1)}
        onRowsPerPageChange={(event) => onPerPageChange(Number(event.target.value))}
        page={Math.max(0, page - 1)}
        rowsPerPage={perPage}
        rowsPerPageOptions={[10, 20, 50, 100]}
      />
    </Stack>
  );
}

function CampaignsPanel({ rows, t }: { rows: ActivationCampaign[]; t: Translation }): React.JSX.Element {
  const columns: ColumnDef<ActivationCampaign>[] = [
    { name: t('dashboard.reports.columns.campaign'), formatter: (row) => row.campaign || t('dashboard.reports.direct') },
    { name: t('dashboard.reports.columns.source'), formatter: (row) => row.source || t('dashboard.reports.direct') },
    { name: t('dashboard.reports.columns.medium'), formatter: (row) => row.medium || '—' },
    { name: t('dashboard.reports.overview.trialsStarted'), field: 'trials_started', align: 'right' },
    { name: t('dashboard.reports.columns.published'), field: 'profiles_published', align: 'right' },
    { name: t('dashboard.reports.overview.usersActivated'), field: 'users_activated', align: 'right' },
    { name: t('dashboard.reports.overview.convertedToPaid'), field: 'converted_to_paid', align: 'right' },
  ];

  return rows.length ? (
    <Box sx={{ overflowX: 'auto' }}>
      <DataTable columns={columns} rows={rows} uniqueRowId={(row) => `${row.campaign}:${row.source}:${row.medium}`} />
    </Box>
  ) : (
    <EmptyState t={t} />
  );
}

function ConversionPanel({ report, t }: { report: ActivationReport; t: Translation }): React.JSX.Element {
  const metrics = [
    ['paidConversionRate', `${formatNumber(report.overview.paid_conversion_rate)}%`],
    ['trialCancelled', report.overview.trial_cancelled],
    ['paymentFailed', report.overview.payment_failed],
    [
      'averageHoursToPublish',
      report.overview.average_hours_to_publish === null ? '—' : formatNumber(report.overview.average_hours_to_publish),
    ],
  ] as const;

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { md: 'repeat(4, 1fr)', sm: 'repeat(2, 1fr)', xs: '1fr' } }}>
      {metrics.map(([key, value]) => (
        <Card key={key} variant="outlined">
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              {t(`dashboard.reports.conversion.${key}`)}
            </Typography>
            <Typography sx={{ mt: 1 }} variant="h5">
              {value}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function EmptyState({ t }: { t: Translation }): React.JSX.Element {
  return (
    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }} variant="body2">
      {t('dashboard.reports.empty')}
    </Typography>
  );
}

function eventLabel(event: ActivationEventName, t: Translation): string {
  return t(`dashboard.reports.events.${event}`);
}

function defaultFilters(): FilterValues {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);

  return {
    campaign: '',
    from: localDate(from),
    medium: '',
    search: '',
    source: '',
    to: localDate(to),
  };
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(value: null | string | undefined, language: string): string {
  if (!value) return '—';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

type Translation = (key: string, options?: Record<string, unknown>) => string;

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { ChartBar as ChartBarIcon } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { ListChecks as ListChecksIcon } from '@phosphor-icons/react/dist/ssr/ListChecks';
import { Warning as WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SubscriptionLimits, UsageAnalytics } from '@/lib/subscription/api-client';
import { NoSsr } from '@/components/core/no-ssr';

import {
  buildPlanUsageModel,
  formatPlanLimitValue,
  formatUsageDate,
  formatUsageNumber,
  getCreditSeries,
  getCreditServiceTotals,
  type PlanLimitMetric,
  type PlanUsageModel,
  type UsageServiceKey,
} from './usage-dashboard-model';

export type UsageDashboardVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5';

export interface UsageDashboardVariantProps {
  analytics?: UsageAnalytics | null;
  language: string;
  limits?: SubscriptionLimits | null;
  tab: 'credits' | 'plan';
  version: UsageDashboardVersion;
}

const serviceColors: Record<UsageServiceKey, string> = {
  avatar_image_created: '#f59e0b',
  avatar_video_created: '#ef4444',
  chat_message_received: '#16a34a',
  incoming_audio_message: '#0284c7',
  voice_cloned: '#7c3aed',
  voice_tts_characters: '#0d9488',
};

const creditColors = {
  consumed: '#0d9488',
  purchased: '#2563eb',
  reserved: '#f59e0b',
  reversed: '#dc2626',
};

export function UsageDashboardVariant({
  analytics,
  language,
  limits,
  tab,
  version,
}: UsageDashboardVariantProps): React.JSX.Element {
  const { t } = useTranslation();
  const plan = limits ? buildPlanUsageModel(limits, t) : null;

  if (tab === 'plan' && !plan) {
    return <Alert severity="info">{t('dashboard.settings.usage.empty.subheader')}</Alert>;
  }

  if (tab === 'credits' && !analytics) {
    return <Alert severity="info">{t('dashboard.settings.usage.analytics.noCreditUsage')}</Alert>;
  }

  if (tab === 'plan' && plan) {
    return {
      v1: <ExecutivePlan language={language} plan={plan} />,
      v2: <CapacityPlan language={language} plan={plan} />,
      v3: <ExplorerPlan language={language} plan={plan} />,
      v4: <MatrixPlan language={language} plan={plan} />,
      v5: <RunwayPlan language={language} plan={plan} />,
    }[version];
  }

  const creditData = analytics!;

  return {
    v1: <ExecutiveCredits data={creditData} language={language} />,
    v2: <CapacityCredits data={creditData} language={language} />,
    v3: <ExplorerCredits data={creditData} language={language} />,
    v4: <MatrixCredits data={creditData} language={language} />,
    v5: <RunwayCredits data={creditData} language={language} />,
  }[version];
}

function ExecutivePlan({ language, plan }: { language: string; plan: PlanUsageModel }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <SummaryCard
          icon={<ListChecksIcon />}
          label={t('dashboard.settings.usage.dashboard.currentPlan')}
          value={plan.planName}
        />
        <SummaryCard
          color={progressColor(plan.highest?.progress ?? 0)}
          icon={<GaugeIcon />}
          label={t('dashboard.settings.usage.dashboard.highestUsage')}
          value={plan.highest ? formatPercent(plan.highest.progress, language) : '-'}
        />
        <SummaryCard
          color={plan.atRisk.length ? 'warning.main' : 'success.main'}
          icon={plan.atRisk.length ? <WarningIcon /> : <GaugeIcon />}
          label={t('dashboard.settings.usage.dashboard.limitsAtRisk')}
          value={formatUsageNumber(plan.atRisk.length, language)}
        />
        <SummaryCard
          icon={<ChartBarIcon />}
          label={t('dashboard.settings.usage.dashboard.renews')}
          value={formatUsageDate(plan.periodEnd, language)}
        />
      </Grid>
      <Card>
        <CardHeader
          subheader={t('dashboard.settings.usage.dashboard.currentPeriod')}
          title={t('dashboard.settings.usage.dashboard.planCapacity')}
        />
        <CardContent>
          <Grid container spacing={3}>
            {plan.metrics.map((metric) => (
              <Grid key={metric.key} md={6} xs={12}>
                <LimitProgress language={language} metric={metric} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}

function ExecutiveCredits({ data, language }: { data: UsageAnalytics; language: string }): React.JSX.Element {
  const { t } = useTranslation();
  const services = getCreditServiceTotals(data, t);

  return (
    <Stack spacing={3}>
      <CreditSummary data={data} language={language} />
      <Card>
        <CardHeader
          subheader={t('dashboard.settings.usage.analytics.chartSubheader')}
          title={t('dashboard.settings.usage.analytics.chartTitle')}
        />
        <CardContent>
          <ServiceStackedChart data={data} />
        </CardContent>
      </Card>
      <ServiceBreakdownTable language={language} services={services} />
    </Stack>
  );
}

function CapacityPlan({ language, plan }: { language: string; plan: PlanUsageModel }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      {plan.atRisk.length ? (
        <Alert severity="warning">
          {t('dashboard.settings.usage.dashboard.attentionCount', { count: plan.atRisk.length })}
        </Alert>
      ) : (
        <Alert severity="success">{t('dashboard.settings.usage.dashboard.allHealthy')}</Alert>
      )}
      <Grid container spacing={3}>
        {plan.metrics.map((metric) => (
          <Grid key={metric.key} lg={3} md={4} sm={6} xs={12}>
            <LimitGauge language={language} metric={metric} />
          </Grid>
        ))}
      </Grid>
      <PeriodBand language={language} plan={plan} />
    </Stack>
  );
}

function CapacityCredits({ data, language }: { data: UsageAnalytics; language: string }): React.JSX.Element {
  const { t } = useTranslation();
  const series = getCreditSeries(data);
  const services = getCreditServiceTotals(data, t);

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid md={5} xs={12}>
          <BalanceGauge data={data} language={language} />
        </Grid>
        <Grid md={7} xs={12}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title={t('dashboard.settings.usage.dashboard.creditFlow')} />
            <CardContent>
              <ChartFrame>
                <AreaChart data={series}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    dataKey="purchased"
                    fill={creditColors.purchased}
                    fillOpacity={0.16}
                    name={t('dashboard.settings.usage.analytics.purchased')}
                    stroke={creditColors.purchased}
                    type="monotone"
                  />
                  <Area
                    dataKey="consumed"
                    fill={creditColors.consumed}
                    fillOpacity={0.16}
                    name={t('dashboard.settings.usage.analytics.consumed')}
                    stroke={creditColors.consumed}
                    type="monotone"
                  />
                </AreaChart>
              </ChartFrame>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <ServiceRanking language={language} services={services} />
    </Stack>
  );
}

function ExplorerPlan({ language, plan }: { language: string; plan: PlanUsageModel }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <PeriodBand language={language} plan={plan} />
      <Grid container spacing={3}>
        <SummaryCard
          color={progressColor(plan.highest?.progress ?? 0)}
          icon={<GaugeIcon />}
          label={t('dashboard.settings.usage.dashboard.topDriver')}
          value={plan.highest?.label ?? '-'}
        />
        <SummaryCard
          icon={<ListChecksIcon />}
          label={t('dashboard.settings.usage.dashboard.trackedLimits')}
          value={formatUsageNumber(plan.metrics.length, language)}
        />
        <SummaryCard
          color={plan.atRisk.length ? 'warning.main' : 'success.main'}
          icon={<WarningIcon />}
          label={t('dashboard.settings.usage.dashboard.needsAttention')}
          value={formatUsageNumber(plan.atRisk.length, language)}
        />
        <SummaryCard
          icon={<ChartBarIcon />}
          label={t('dashboard.settings.usage.dashboard.status')}
          value={plan.status}
        />
      </Grid>
      <LimitTable language={language} metrics={plan.metrics} />
    </Stack>
  );
}

function ExplorerCredits({ data, language }: { data: UsageAnalytics; language: string }): React.JSX.Element {
  const { t } = useTranslation();
  const series = getCreditSeries(data);
  const services = getCreditServiceTotals(data, t);

  return (
    <Stack spacing={3}>
      <CreditSummary data={data} language={language} />
      <Card>
        <CardHeader
          subheader={t('dashboard.settings.usage.dashboard.explorerSubheader')}
          title={t('dashboard.settings.usage.dashboard.creditExplorer')}
        />
        <CardContent>
          <ChartFrame height={360}>
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="purchased"
                fill={creditColors.purchased}
                name={t('dashboard.settings.usage.analytics.purchased')}
                radius={[4, 4, 0, 0]}
              />
              <Line
                dataKey="consumed"
                dot={false}
                name={t('dashboard.settings.usage.analytics.consumed')}
                stroke={creditColors.consumed}
                strokeWidth={3}
                type="monotone"
              />
              <Line
                dataKey="reversed"
                dot={false}
                name={t('dashboard.settings.usage.dashboard.reversed')}
                stroke={creditColors.reversed}
                strokeDasharray="4 4"
                strokeWidth={2}
                type="monotone"
              />
            </ComposedChart>
          </ChartFrame>
        </CardContent>
      </Card>
      <ServiceBreakdownTable language={language} services={services} />
    </Stack>
  );
}

function MatrixPlan({ language, plan }: { language: string; plan: PlanUsageModel }): React.JSX.Element {
  const { t } = useTranslation();
  const healthy = plan.metrics.filter((metric) => metric.progress < 60).length;
  const watch = plan.metrics.filter((metric) => metric.progress >= 60 && metric.progress < 80).length;

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <SummaryCard
          color="success.main"
          icon={<GaugeIcon />}
          label={t('dashboard.settings.usage.dashboard.healthy')}
          value={formatUsageNumber(healthy, language)}
        />
        <SummaryCard
          color="warning.main"
          icon={<GaugeIcon />}
          label={t('dashboard.settings.usage.dashboard.watch')}
          value={formatUsageNumber(watch, language)}
        />
        <SummaryCard
          color="error.main"
          icon={<WarningIcon />}
          label={t('dashboard.settings.usage.dashboard.critical')}
          value={formatUsageNumber(plan.atRisk.length, language)}
        />
        <SummaryCard
          icon={<ListChecksIcon />}
          label={t('dashboard.settings.usage.dashboard.currentPlan')}
          value={plan.planName}
        />
      </Grid>
      <LimitTable dense language={language} metrics={plan.metrics} />
    </Stack>
  );
}

function MatrixCredits({ data, language }: { data: UsageAnalytics; language: string }): React.JSX.Element {
  const { t } = useTranslation();
  const services = getCreditServiceTotals(data, t);
  const series = getCreditSeries(data);

  return (
    <Stack spacing={3}>
      <CreditSummary data={data} language={language} />
      <Grid container spacing={3}>
        <Grid md={5} xs={12}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title={t('dashboard.settings.usage.dashboard.serviceAllocation')} />
            <CardContent>
              <DonutBreakdown language={language} services={services} />
            </CardContent>
          </Card>
        </Grid>
        <Grid md={7} xs={12}>
          <CreditTimelineTable data={series} language={language} />
        </Grid>
      </Grid>
    </Stack>
  );
}

function RunwayPlan({ language, plan }: { language: string; plan: PlanUsageModel }): React.JSX.Element {
  const { t } = useTranslation();
  const spotlight = plan.highest;

  return (
    <Grid container spacing={3}>
      <Grid md={5} xs={12}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            subheader={t('dashboard.settings.usage.dashboard.topDriver')}
            title={spotlight?.label ?? t('dashboard.settings.usage.dashboard.planCapacity')}
          />
          <CardContent>
            {spotlight ? (
              <Stack spacing={3}>
                <Typography color={progressColor(spotlight.progress)} variant="h1">
                  {formatPercent(spotlight.progress, language)}
                </Typography>
                <LinearProgress
                  color={progressMuiColor(spotlight.progress)}
                  sx={{ height: 12 }}
                  value={spotlight.progress}
                  variant="determinate"
                />
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <LabeledNumber
                    label={t('dashboard.settings.billing.fields.used')}
                    language={language}
                    value={spotlight.used}
                  />
                  <LabeledNumber
                    label={t('dashboard.settings.billing.fields.remaining')}
                    language={language}
                    value={spotlight.remaining}
                  />
                </Stack>
                <Divider />
                <Typography color="text.secondary" variant="body2">
                  {t('dashboard.settings.usage.dashboard.periodEnds', {
                    date: formatUsageDate(plan.periodEnd, language),
                  })}
                </Typography>
              </Stack>
            ) : null}
          </CardContent>
        </Card>
      </Grid>
      <Grid md={7} xs={12}>
        <Card>
          <CardHeader title={t('dashboard.settings.usage.dashboard.remainingCapacity')} />
          <CardContent>
            <Stack divider={<Divider />} spacing={2}>
              {plan.metrics.map((metric) => (
                <CompactLimitRow key={metric.key} language={language} metric={metric} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function RunwayCredits({ data, language }: { data: UsageAnalytics; language: string }): React.JSX.Element {
  const { t } = useTranslation();
  const services = getCreditServiceTotals(data, t);
  const series = getCreditSeries(data);
  const activeBuckets = series.filter((item) => item.consumed > 0);
  const averageBurn = activeBuckets.length
    ? activeBuckets.reduce((total, item) => total + item.consumed, 0) / activeBuckets.length
    : 0;
  const runway = averageBurn > 0 ? data.wallet.available / averageBurn : null;

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <SummaryCard
          icon={<CoinsIcon />}
          label={t('dashboard.settings.usage.analytics.available')}
          value={formatUsageNumber(data.wallet.available, language)}
        />
        <SummaryCard
          color="info.main"
          icon={<ChartBarIcon />}
          label={t('dashboard.settings.usage.dashboard.averageBurn')}
          value={formatUsageNumber(averageBurn, language)}
        />
        <SummaryCard
          color={runway !== null && runway < 2 ? 'warning.main' : 'success.main'}
          icon={<GaugeIcon />}
          label={t('dashboard.settings.usage.dashboard.estimatedRunway')}
          value={
            runway === null
              ? '-'
              : t('dashboard.settings.usage.dashboard.monthsValue', {
                  value: formatUsageNumber(runway, language, 1),
                })
          }
        />
        <SummaryCard
          color="error.main"
          icon={<WarningIcon />}
          label={t('dashboard.settings.usage.dashboard.reversed')}
          value={formatUsageNumber(data.summary.credits.reversed, language)}
        />
      </Grid>
      <Card>
        <CardHeader title={t('dashboard.settings.usage.dashboard.consumptionTrend')} />
        <CardContent>
          <ChartFrame>
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Area
                dataKey="consumed"
                fill={creditColors.consumed}
                fillOpacity={0.18}
                name={t('dashboard.settings.usage.analytics.consumed')}
                stroke={creditColors.consumed}
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ChartFrame>
        </CardContent>
      </Card>
      <ServiceRanking language={language} services={services} />
    </Stack>
  );
}

function CreditSummary({ data, language }: { data: UsageAnalytics; language: string }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Grid container spacing={3}>
      <SummaryCard
        icon={<CoinsIcon />}
        label={t('dashboard.settings.usage.analytics.available')}
        value={formatUsageNumber(data.wallet.available, language)}
      />
      <SummaryCard
        color="info.main"
        icon={<ChartBarIcon />}
        label={t('dashboard.settings.usage.analytics.purchased')}
        value={formatUsageNumber(data.summary.credits.purchased, language)}
      />
      <SummaryCard
        color="success.main"
        icon={<GaugeIcon />}
        label={t('dashboard.settings.usage.analytics.consumed')}
        value={formatUsageNumber(data.summary.credits.consumed, language)}
      />
      <SummaryCard
        color="warning.main"
        icon={<WarningIcon />}
        label={t('dashboard.settings.usage.analytics.reserved')}
        value={formatUsageNumber(data.summary.credits.reserved, language)}
      />
    </Grid>
  );
}

function SummaryCard({
  color = 'primary.main',
  icon,
  label,
  value,
}: {
  color?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <Grid lg={3} sm={6} xs={12}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'background.level1', color }}>{icon}</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography color="text.secondary" sx={{ minHeight: { lg: 40, sm: 'auto' } }} variant="body2">
                {label}
              </Typography>
              <Typography sx={{ mt: 0.5, overflowWrap: 'anywhere' }} variant="h6">
                {value}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

function LimitProgress({ language, metric }: { language: string; metric: PlanLimitMetric }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="subtitle2">{metric.label}</Typography>
        <Typography color="text.secondary" variant="body2">
          {t('dashboard.settings.billing.values.usedOfLimit', {
            limit: formatPlanLimitValue(metric, metric.included, language),
            used: formatPlanLimitValue(metric, metric.used, language),
          })}
        </Typography>
      </Stack>
      <LinearProgress
        color={progressMuiColor(metric.progress)}
        sx={{ height: 8 }}
        value={metric.progress}
        variant="determinate"
      />
      <Typography color="text.secondary" variant="caption">
        {t('dashboard.settings.billing.usage.remainingSummary', {
          remaining: formatPlanLimitValue(metric, metric.remaining, language),
        })}
      </Typography>
    </Stack>
  );
}

function LimitGauge({ language, metric }: { language: string; metric: PlanLimitMetric }): React.JSX.Element {
  const { t } = useTranslation();
  const data = [
    { name: 'Empty', value: 100 },
    { name: metric.label, value: metric.progress },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <NoSsr fallback={<Box sx={{ height: 112, width: 112 }} />}>
            <Box
              sx={{
                position: 'relative',
                '& .recharts-layer path[name="Empty"]': { display: 'none' },
                '& .recharts-layer .recharts-radial-bar-background-sector': {
                  fill: 'var(--mui-palette-neutral-100)',
                },
              }}
            >
              <RadialBarChart
                barSize={10}
                data={data}
                endAngle={-270}
                height={112}
                innerRadius={70}
                startAngle={90}
                width={112}
              >
                <RadialBar background cornerRadius={5} dataKey="value" fill={progressHexColor(metric.progress)} />
              </RadialBarChart>
              <Typography
                sx={{
                  left: '50%',
                  position: 'absolute',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                variant="subtitle1"
              >
                {formatPercent(metric.progress, language)}
              </Typography>
            </Box>
          </NoSsr>
          <Typography variant="subtitle2">{metric.label}</Typography>
          <Typography color="text.secondary" variant="caption">
            {t('dashboard.settings.billing.values.remaining', {
              remaining: formatPlanLimitValue(metric, metric.remaining, language),
            })}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function PeriodBand({ language, plan }: { language: string; plan: PlanUsageModel }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        alignItems: { md: 'center' },
        bgcolor: 'background.level1',
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { md: '1fr auto auto', xs: '1fr' },
        px: 2.5,
        py: 2,
      }}
    >
      <Box>
        <Typography variant="subtitle1">{plan.planName}</Typography>
        <Typography color="text.secondary" variant="body2">
          {t('dashboard.settings.usage.dashboard.currentPeriod')}
        </Typography>
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">
          {t('dashboard.settings.billing.fields.startedAt')}
        </Typography>
        <Typography variant="subtitle2">{formatUsageDate(plan.periodStart, language)}</Typography>
      </Box>
      <Box>
        <Typography color="text.secondary" variant="caption">
          {t('dashboard.settings.usage.dashboard.renews')}
        </Typography>
        <Typography variant="subtitle2">{formatUsageDate(plan.periodEnd, language)}</Typography>
      </Box>
    </Box>
  );
}

function LimitTable({
  dense = false,
  language,
  metrics,
}: {
  dense?: boolean;
  language: string;
  metrics: PlanLimitMetric[];
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader title={t('dashboard.settings.usage.dashboard.limitDetails')} />
      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>{t('dashboard.settings.billing.fields.name')}</TableCell>
              <TableCell>{t('dashboard.settings.billing.fields.used')}</TableCell>
              <TableCell>{t('dashboard.settings.billing.fields.remaining')}</TableCell>
              <TableCell>{t('dashboard.settings.billing.fields.limit')}</TableCell>
              <TableCell sx={{ minWidth: 180 }}>{t('dashboard.settings.usage.dashboard.utilization')}</TableCell>
              <TableCell>{t('dashboard.settings.usage.dashboard.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {metrics.map((metric) => (
              <TableRow hover key={metric.key}>
                <TableCell>
                  <Typography variant="subtitle2">{metric.label}</Typography>
                </TableCell>
                <TableCell>{formatPlanLimitValue(metric, metric.used, language)}</TableCell>
                <TableCell>{formatPlanLimitValue(metric, metric.remaining, language)}</TableCell>
                <TableCell>{formatPlanLimitValue(metric, metric.included, language)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <LinearProgress
                      color={progressMuiColor(metric.progress)}
                      sx={{ flex: '1 1 auto', height: 6 }}
                      value={metric.progress}
                      variant="determinate"
                    />
                    <Typography color="text.secondary" variant="caption">
                      {formatPercent(metric.progress, language)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <StatusChip progress={metric.progress} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function BalanceGauge({ data, language }: { data: UsageAnalytics; language: string }): React.JSX.Element {
  const { t } = useTranslation();
  const total = Math.max(data.wallet.available + data.wallet.lifetime_consumed, 1);
  const availablePercent = (data.wallet.available / total) * 100;
  const chartData = [
    { name: 'Empty', value: 100 },
    { name: 'Available', value: availablePercent },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('dashboard.settings.usage.analytics.available')} />
      <CardContent>
        <Stack sx={{ alignItems: 'center' }}>
          <NoSsr fallback={<Box sx={{ height: 220, width: 220 }} />}>
            <Box
              sx={{
                position: 'relative',
                '& .recharts-layer path[name="Empty"]': { display: 'none' },
                '& .recharts-layer .recharts-radial-bar-background-sector': {
                  fill: 'var(--mui-palette-neutral-100)',
                },
              }}
            >
              <RadialBarChart
                barSize={22}
                data={chartData}
                endAngle={-10}
                height={220}
                innerRadius={138}
                startAngle={190}
                width={220}
              >
                <RadialBar background cornerRadius={11} dataKey="value" fill={creditColors.purchased} />
              </RadialBarChart>
              <Box
                sx={{
                  left: '50%',
                  position: 'absolute',
                  textAlign: 'center',
                  top: '45%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Typography variant="h3">{formatUsageNumber(data.wallet.available, language)}</Typography>
                <Typography color="text.secondary" variant="caption">
                  {t('dashboard.settings.usage.dashboard.credits')}
                </Typography>
              </Box>
            </Box>
          </NoSsr>
          <Typography color="text.secondary" sx={{ mt: -5 }} variant="body2">
            {t('dashboard.settings.usage.dashboard.lifetimeConsumed', {
              value: formatUsageNumber(data.wallet.lifetime_consumed, language),
            })}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ServiceStackedChart({ data }: { data: UsageAnalytics }): React.JSX.Element {
  const { t } = useTranslation();
  const chartData = data.series.map((item) => ({
    bucket: item.bucket,
    ...Object.fromEntries(Object.entries(item.services).map(([key, value]) => [key, value.purchased_credits])),
  }));

  if (!chartData.length) {
    return <EmptyChart />;
  }

  return (
    <ChartFrame>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="bucket" />
        <YAxis />
        <Tooltip />
        <Legend />
        {(Object.keys(serviceColors) as UsageServiceKey[]).map((key) => (
          <Bar
            dataKey={key}
            fill={serviceColors[key]}
            key={key}
            name={t(`dashboard.settings.usage.analytics.services.${key}`)}
            stackId="credits"
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

function ServiceBreakdownTable({
  language,
  services,
}: {
  language: string;
  services: ReturnType<typeof getCreditServiceTotals>;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader title={t('dashboard.settings.usage.dashboard.serviceBreakdown')} />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('dashboard.settings.billing.fields.name')}</TableCell>
              <TableCell>{t('dashboard.settings.usage.dashboard.operations')}</TableCell>
              <TableCell>{t('dashboard.settings.usage.analytics.creditUsage')}</TableCell>
              <TableCell>{t('dashboard.settings.usage.dashboard.share')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.length ? (
              services.map((service) => {
                const total = services.reduce((sum, item) => sum + item.credits, 0);

                return (
                  <TableRow hover key={service.key}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Box
                          sx={{
                            bgcolor: serviceColors[service.key],
                            borderRadius: '2px',
                            height: 10,
                            width: 10,
                          }}
                        />
                        <Typography variant="subtitle2">{service.label}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{formatUsageNumber(service.operations, language)}</TableCell>
                    <TableCell>{formatUsageNumber(service.credits, language)}</TableCell>
                    <TableCell>{formatPercent(total > 0 ? (service.credits / total) * 100 : 0, language)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <EmptyChart />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function ServiceRanking({
  language,
  services,
}: {
  language: string;
  services: ReturnType<typeof getCreditServiceTotals>;
}): React.JSX.Element {
  const { t } = useTranslation();
  const max = Math.max(...services.map((service) => service.credits), 1);

  return (
    <Card>
      <CardHeader title={t('dashboard.settings.usage.dashboard.topServices')} />
      <CardContent>
        {services.length ? (
          <Stack spacing={2.5}>
            {services.map((service) => (
              <Stack key={service.key} spacing={0.75}>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2">{service.label}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {formatUsageNumber(service.credits, language)}
                  </Typography>
                </Stack>
                <LinearProgress
                  sx={{
                    height: 7,
                    '& .MuiLinearProgress-bar': { bgcolor: serviceColors[service.key] },
                  }}
                  value={(service.credits / max) * 100}
                  variant="determinate"
                />
              </Stack>
            ))}
          </Stack>
        ) : (
          <EmptyChart />
        )}
      </CardContent>
    </Card>
  );
}

function DonutBreakdown({
  language,
  services,
}: {
  language: string;
  services: ReturnType<typeof getCreditServiceTotals>;
}): React.JSX.Element {
  const { t } = useTranslation();

  if (!services.length) {
    return <EmptyChart />;
  }

  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <ChartFrame height={260}>
        <PieChart>
          <Pie data={services} dataKey="credits" innerRadius={72} nameKey="label" outerRadius={105} paddingAngle={2}>
            {services.map((service) => (
              <Cell fill={serviceColors[service.key]} key={service.key} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ChartFrame>
      <Stack spacing={1} sx={{ width: '100%' }}>
        {services.map((service) => (
          <Stack direction="row" key={service.key} spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  bgcolor: serviceColors[service.key],
                  borderRadius: '2px',
                  height: 8,
                  width: 8,
                }}
              />
              <Typography color="text.secondary" variant="body2">
                {service.label}
              </Typography>
            </Stack>
            <Typography variant="subtitle2">{formatUsageNumber(service.credits, language)}</Typography>
          </Stack>
        ))}
      </Stack>
      <Typography color="text.secondary" variant="caption">
        {t('dashboard.settings.usage.analytics.creditUsage')}
      </Typography>
    </Stack>
  );
}

function CreditTimelineTable({
  data,
  language,
}: {
  data: ReturnType<typeof getCreditSeries>;
  language: string;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('dashboard.settings.usage.dashboard.activityByPeriod')} />
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>{t('dashboard.settings.usage.analytics.period')}</TableCell>
              <TableCell>{t('dashboard.settings.usage.analytics.purchased')}</TableCell>
              <TableCell>{t('dashboard.settings.usage.analytics.consumed')}</TableCell>
              <TableCell>{t('dashboard.settings.usage.dashboard.reversed')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow hover key={item.bucket}>
                <TableCell>{item.bucket}</TableCell>
                <TableCell>{formatUsageNumber(item.purchased, language)}</TableCell>
                <TableCell>{formatUsageNumber(item.consumed, language)}</TableCell>
                <TableCell>{formatUsageNumber(item.reversed, language)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function CompactLimitRow({ language, metric }: { language: string; metric: PlanLimitMetric }): React.JSX.Element {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
        <Typography noWrap variant="subtitle2">
          {metric.label}
        </Typography>
        <LinearProgress
          color={progressMuiColor(metric.progress)}
          sx={{ height: 5, mt: 1 }}
          value={metric.progress}
          variant="determinate"
        />
      </Box>
      <Box sx={{ flex: '0 0 auto', textAlign: 'right' }}>
        <Typography variant="subtitle2">{formatPlanLimitValue(metric, metric.remaining, language)}</Typography>
        <Typography color="text.secondary" variant="caption">
          {formatPercent(metric.progress, language)}
        </Typography>
      </Box>
    </Stack>
  );
}

function LabeledNumber({
  label,
  language,
  value,
}: {
  label: string;
  language: string;
  value: number;
}): React.JSX.Element {
  return (
    <Box>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography variant="h6">{formatUsageNumber(value, language)}</Typography>
    </Box>
  );
}

function StatusChip({ progress }: { progress: number }): React.JSX.Element {
  const { t } = useTranslation();
  const status = progress >= 80 ? 'critical' : progress >= 60 ? 'watch' : 'healthy';

  return (
    <Chip
      color={status === 'critical' ? 'error' : status === 'watch' ? 'warning' : 'success'}
      label={t(`dashboard.settings.usage.dashboard.${status}`)}
      size="small"
      variant="soft"
    />
  );
}

function ChartFrame({ children, height = 320 }: { children: React.ReactElement; height?: number }): React.JSX.Element {
  return (
    <NoSsr fallback={<Box sx={{ height }} />}>
      <ResponsiveContainer height={height} width="100%">
        {children}
      </ResponsiveContainer>
    </NoSsr>
  );
}

function EmptyChart(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }} variant="body2">
      {t('dashboard.settings.usage.analytics.noCreditUsage')}
    </Typography>
  );
}

function formatPercent(value: number, language: string): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value / 100);
}

function progressColor(value: number): string {
  return value >= 80 ? 'error.main' : value >= 60 ? 'warning.main' : 'success.main';
}

function progressHexColor(value: number): string {
  return value >= 80 ? '#dc2626' : value >= 60 ? '#f59e0b' : '#16a34a';
}

function progressMuiColor(value: number): 'error' | 'success' | 'warning' {
  return value >= 80 ? 'error' : value >= 60 ? 'warning' : 'success';
}

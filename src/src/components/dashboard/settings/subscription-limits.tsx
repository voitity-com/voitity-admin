'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { ImageSquare as ImageSquareIcon } from '@phosphor-icons/react/dist/ssr/ImageSquare';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { SpeakerHigh as SpeakerHighIcon } from '@phosphor-icons/react/dist/ssr/SpeakerHigh';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { VideoCamera as VideoCameraIcon } from '@phosphor-icons/react/dist/ssr/VideoCamera';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { RadialBar, RadialBarChart } from 'recharts';

import { NoSsr } from '@/components/core/no-ssr';
import type {
  JsonObject,
  JsonValue,
  SubscriptionLimits as SubscriptionLimitsData,
  SubscriptionPlan,
  SubscriptionPlans,
} from '@/lib/subscription/api-client';

export interface SubscriptionLimitsProps {
  data: SubscriptionLimitsData;
  language: string;
  plansData?: SubscriptionPlans;
}

type BillingInterval = 'annual' | 'monthly';

interface CurrentSubscription {
  active?: boolean;
  currency: string;
  interval: BillingInterval;
  planId?: string;
  planName: string;
  priceUsd?: number;
  renewsAt?: string;
  startedAt?: string;
  status?: string;
}

interface BillingCycleOption {
  currency: string;
  description: string;
  features: string[];
  interval: BillingInterval;
  label: string;
  priceUsd?: number;
  recommended: boolean;
  selected: boolean;
}

interface UsageMetric {
  color: string;
  icon: Icon;
  key: string;
  label: string;
  limit?: number;
  progress: number;
  remaining?: number;
  unlimited: boolean;
  used?: number;
}

const usedFields = ['used', 'current', 'count', 'usage', 'consumed'] as const;
const limitFields = ['limit', 'max', 'maximum', 'total', 'allowed', 'included'] as const;
const remainingFields = ['remaining', 'available', 'left'] as const;
const annualIntervals = new Set(['annual', 'annually', 'year', 'yearly']);

export function SubscriptionLimits({ data, language, plansData }: SubscriptionLimitsProps): React.JSX.Element {
  return (
    <Stack spacing={3}>
      <SubscriptionBilling data={data} language={language} plansData={plansData} />
      <SubscriptionUsage data={data} language={language} />
    </Stack>
  );
}

export function SubscriptionBilling({ data, language, plansData }: SubscriptionLimitsProps): React.JSX.Element {
  const { t } = useTranslation();
  const subscription = getCurrentSubscription(data, plansData, t);
  const cycles = getBillingCycles({ language, plansData, subscription, t });

  if (!Object.keys(data).length && !plansData?.plans.length) {
    return (
      <Card>
        <CardHeader
          avatar={
            <Avatar>
              <CreditCardIcon fontSize="var(--Icon-fontSize)" />
            </Avatar>
          }
          subheader={t('dashboard.settings.billing.subheader')}
          title={t('dashboard.settings.billing.title')}
        />
        <CardContent>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.settings.billing.empty')}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid lg={5} xs={12}>
        <CurrentPlanCard language={language} subscription={subscription} t={t} />
      </Grid>
      <Grid lg={7} xs={12}>
        <BillingCyclesCard cycles={cycles} language={language} planName={subscription.planName} t={t} />
      </Grid>
    </Grid>
  );
}

export function SubscriptionUsage({ data, language }: SubscriptionLimitsProps): React.JSX.Element {
  const { t } = useTranslation();
  const metrics = getUsageMetrics(data, t);

  return <UsageOverview language={language} metrics={metrics} t={t} />;
}

function CurrentPlanCard({
  language,
  subscription,
  t,
}: {
  language: string;
  subscription: CurrentSubscription;
  t: TFunction;
}): React.JSX.Element {
  const status = subscription.status ?? (subscription.active === false ? 'inactive' : 'active');
  const rows = [
    { name: t('dashboard.settings.billing.fields.billingCycle'), value: getIntervalLabel(subscription.interval, t) },
    { name: t('dashboard.settings.billing.fields.currency'), value: subscription.currency },
    {
      name: t('dashboard.settings.billing.fields.renewsAt'),
      value: subscription.renewsAt ? formatDate(subscription.renewsAt, language) : t('dashboard.settings.billing.values.empty'),
    },
    {
      name: t('dashboard.settings.billing.fields.startedAt'),
      value: subscription.startedAt ? formatDate(subscription.startedAt, language) : t('dashboard.settings.billing.values.empty'),
    },
  ];

  return (
    <Card
      sx={{
        bgcolor: 'var(--mui-palette-neutral-950)',
        color: 'var(--mui-palette-common-white)',
        height: '100%',
      }}
    >
      <CardContent>
        <Stack spacing={4}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Avatar
                sx={{
                  '--Avatar-size': '48px',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: 'var(--mui-palette-common-white)',
                }}
              >
                <CrownIcon fontSize="var(--Icon-fontSize)" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography color="rgba(255,255,255,0.72)" variant="overline">
                  {t('dashboard.settings.billing.currentPlan.eyebrow')}
                </Typography>
                <Typography noWrap variant="h5">
                  {subscription.planName}
                </Typography>
              </Box>
            </Stack>
            <Chip
              color={getStatusColor(status)}
              label={getStatusLabel(status, t)}
              size="small"
              variant="soft"
            />
          </Stack>

          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Typography sx={{ lineHeight: 1 }} variant="h2">
                {formatCurrency(subscription.priceUsd, subscription.currency, language)}
              </Typography>
              <Typography color="rgba(255,255,255,0.68)" variant="subtitle2">
                {getPeriodLabel(subscription.interval, t)}
              </Typography>
            </Stack>
            <Typography color="rgba(255,255,255,0.68)" sx={{ mt: 1 }} variant="body2">
              {t('dashboard.settings.billing.currentPlan.subheader')}
            </Typography>
          </Box>

          <Stack divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />} spacing={0}>
            {rows.map((row) => (
              <Stack
                direction="row"
                key={row.name}
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}
              >
                <Typography color="rgba(255,255,255,0.62)" variant="body2">
                  {row.name}
                </Typography>
                <Typography sx={{ textAlign: 'right' }} variant="subtitle2">
                  {row.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function BillingCyclesCard({
  cycles,
  language,
  planName,
  t,
}: {
  cycles: BillingCycleOption[];
  language: string;
  planName: string;
  t: TFunction;
}): React.JSX.Element {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={
          <Avatar>
            <CreditCardIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.billing.cycles.subheader')}
        title={t('dashboard.settings.billing.cycles.title')}
      />
      <CardContent>
        <Grid container spacing={2}>
          {cycles.map((cycle) => (
            <Grid key={cycle.interval} md={6} xs={12}>
              <BillingCycleCard cycle={cycle} language={language} planName={planName} t={t} />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

function BillingCycleCard({
  cycle,
  language,
  planName,
  t,
}: {
  cycle: BillingCycleOption;
  language: string;
  planName: string;
  t: TFunction;
}): React.JSX.Element {
  return (
    <Card
      sx={{
        borderColor: cycle.selected ? 'primary.main' : 'divider',
        borderRadius: 1,
        borderWidth: cycle.selected ? 2 : 1,
        height: '100%',
      }}
      variant="outlined"
    >
      <Stack spacing={2.5} sx={{ height: '100%', p: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            color={cycle.selected ? 'success' : 'default'}
            icon={cycle.selected ? <CheckCircleIcon weight="fill" /> : undefined}
            label={cycle.selected ? t('dashboard.settings.billing.cycles.selected') : cycle.label}
            size="small"
            variant="soft"
          />
          {cycle.recommended ? (
            <Chip color="primary" label={t('dashboard.settings.billing.cycles.bestValue')} size="small" variant="soft" />
          ) : null}
        </Stack>

        <Box>
          <Typography variant="h5">{planName}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
            {cycle.description}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography sx={{ lineHeight: 1 }} variant="h3">
            {formatCurrency(cycle.priceUsd, cycle.currency, language)}
          </Typography>
          <Typography color="text.secondary" variant="subtitle2">
            {getPeriodLabel(cycle.interval, t)}
          </Typography>
        </Stack>

        <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {cycle.features.map((feature) => (
            <Stack component="li" direction="row" key={feature} spacing={1.25} sx={{ alignItems: 'flex-start' }}>
              <CheckCircleIcon color="var(--mui-palette-success-main)" fontSize="var(--icon-fontSize-md)" weight="fill" />
              <Typography color="text.secondary" variant="body2">
                {feature}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

function UsageOverview({
  language,
  metrics,
  t,
}: {
  language: string;
  metrics: UsageMetric[];
  t: TFunction;
}): React.JSX.Element {
  const primaryMetric = getPrimaryMetric(metrics);

  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar>
            <GaugeIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.billing.usage.subheader')}
        title={t('dashboard.settings.billing.usage.title')}
      />
      <CardContent>
        {metrics.length && primaryMetric ? (
          <Grid container spacing={3}>
            <Grid md={4} xs={12}>
              <UsageRadial language={language} metric={primaryMetric} t={t} />
            </Grid>
            <Grid md={8} xs={12}>
              <Grid container spacing={2}>
                {metrics.map((metric) => (
                  <Grid key={metric.key} lg={6} xs={12}>
                    <UsageMetricCard language={language} metric={metric} t={t} />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.settings.billing.emptySection')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function UsageRadial({
  language,
  metric,
  t,
}: {
  language: string;
  metric: UsageMetric;
  t: TFunction;
}): React.JSX.Element {
  const chartSize = 220;
  const chartValue = metric.unlimited ? 100 : metric.progress;
  const data = [
    { name: 'Empty', value: 100 },
    { name: 'Usage', value: chartValue },
  ] satisfies { name: string; value: number }[];

  return (
    <Stack spacing={2} sx={{ alignItems: 'center', height: '100%', justifyContent: 'center', textAlign: 'center' }}>
      <NoSsr fallback={<Box sx={{ height: `${chartSize}px`, width: `${chartSize}px` }} />}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            '& .recharts-layer path[name="Empty"]': { display: 'none' },
            '& .recharts-layer .recharts-radial-bar-background-sector': {
              fill: 'var(--mui-palette-neutral-100)',
            },
          }}
        >
          <RadialBarChart
            barSize={22}
            data={data}
            endAngle={-10}
            height={chartSize}
            innerRadius={138}
            startAngle={190}
            width={chartSize}
          >
            <RadialBar
              animationDuration={300}
              background
              cornerRadius={11}
              dataKey="value"
              endAngle={-320}
              fill="var(--mui-palette-primary-main)"
              startAngle={20}
            />
          </RadialBarChart>
          <Box
            sx={{
              alignItems: 'center',
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              left: 0,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          >
            <Box sx={{ mt: '-42px' }}>
              <Typography variant="h4">
                {metric.unlimited
                  ? t('dashboard.settings.billing.values.unlimited')
                  : new Intl.NumberFormat(language, { maximumFractionDigits: 0, style: 'percent' }).format(
                      metric.progress / 100
                    )}
              </Typography>
            </Box>
          </Box>
        </Box>
      </NoSsr>
      <Box sx={{ mt: '-68px' }}>
        <Typography variant="h6">{metric.label}</Typography>
        <Typography color="text.secondary" variant="body2">
          {getUsageSummary(metric, language, t)}
        </Typography>
      </Box>
    </Stack>
  );
}

function UsageMetricCard({
  language,
  metric,
  t,
}: {
  language: string;
  metric: UsageMetric;
  t: TFunction;
}): React.JSX.Element {
  const Icon = metric.icon;

  return (
    <Card sx={{ borderRadius: 1, height: '100%' }} variant="outlined">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar
            sx={{
              '--Avatar-size': '40px',
              bgcolor: 'background.level1',
              color: metric.color,
            }}
          >
            <Icon fontSize="var(--Icon-fontSize)" />
          </Avatar>
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography noWrap variant="subtitle2">
              {metric.label}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {metric.unlimited
                ? t('dashboard.settings.billing.values.unlimited')
                : t('dashboard.settings.billing.usage.progress', {
                    progress: new Intl.NumberFormat(language, { maximumFractionDigits: 0, style: 'percent' }).format(
                      metric.progress / 100
                    ),
                  })}
            </Typography>
          </Box>
          {typeof metric.remaining === 'number' && !metric.unlimited ? (
            <Chip
              label={t('dashboard.settings.billing.values.remaining', {
                remaining: formatNumber(metric.remaining, language),
              })}
              size="small"
              variant="soft"
            />
          ) : null}
        </Stack>
        <Typography variant="h5">{getUsageValue(metric, language, t)}</Typography>
        {!metric.unlimited && typeof metric.limit === 'number' && metric.limit > 0 ? (
          <LinearProgress sx={{ height: 8 }} value={metric.progress} variant="determinate" />
        ) : null}
      </Stack>
    </Card>
  );
}

function getCurrentSubscription(
  data: JsonObject,
  plansData: SubscriptionPlans | undefined,
  t: TFunction
): CurrentSubscription {
  const subscription = getRecordField(data, ['subscription']) ?? data;
  const planId = getStringField(subscription, ['plan', 'plan_id', 'planId', 'id']);
  const matchingPlan = plansData?.plans.find((plan) => plan.id === planId) ?? plansData?.plans[0];
  const interval = normalizeInterval(getStringField(subscription, ['interval', 'billing_cycle', 'billingCycle']));
  const priceUsd =
    getNumberField(subscription, ['price_usd', 'priceUsd', 'price']) ??
    (matchingPlan?.price_usd === null ? undefined : matchingPlan?.price_usd);

  return {
    active: typeof subscription.active === 'boolean' ? subscription.active : undefined,
    currency: getStringField(subscription, ['currency']) ?? matchingPlan?.currency ?? plansData?.display_currency ?? 'USD',
    interval,
    planId,
    planName:
      getStringField(subscription, ['plan_name', 'planName', 'name']) ??
      matchingPlan?.name ??
      t('dashboard.settings.billing.currentPlan.fallbackName'),
    priceUsd,
    renewsAt: getStringField(subscription, ['renews_at', 'renewsAt', 'current_period_end', 'currentPeriodEnd']),
    startedAt: getStringField(subscription, ['started_at', 'startedAt', 'current_period_start', 'currentPeriodStart']),
    status: getStringField(subscription, ['status']),
  };
}

function getBillingCycles({
  language,
  plansData,
  subscription,
  t,
}: {
  language: string;
  plansData?: SubscriptionPlans;
  subscription: CurrentSubscription;
  t: TFunction;
}): BillingCycleOption[] {
  const matchingPlans = plansData?.plans.filter((plan) => !subscription.planId || plan.id === subscription.planId) ?? [];
  const monthlyPlan = findPlanByInterval(matchingPlans, 'monthly') ?? findPlanByInterval(plansData?.plans ?? [], 'monthly');
  const annualPlan = findPlanByInterval(matchingPlans, 'annual') ?? findPlanByInterval(plansData?.plans ?? [], 'annual');
  const currentPrice = subscription.priceUsd;
  const monthlyPrice =
    monthlyPlan?.price_usd ??
    (subscription.interval === 'monthly'
      ? currentPrice
      : typeof currentPrice === 'number'
        ? Math.round((currentPrice / 10) * 100) / 100
        : undefined);
  const annualPrice =
    annualPlan?.price_usd ??
    (subscription.interval === 'annual'
      ? currentPrice
      : typeof monthlyPrice === 'number'
        ? Math.round(monthlyPrice * 10 * 100) / 100
        : undefined);
  const currency = monthlyPlan?.currency ?? annualPlan?.currency ?? subscription.currency;
  const savings =
    typeof monthlyPrice === 'number' && typeof annualPrice === 'number'
      ? Math.max(monthlyPrice * 12 - annualPrice, 0)
      : undefined;

  return [
    {
      currency,
      description: t('dashboard.settings.billing.cycles.monthly.description'),
      features: getPlanFeatures({ interval: 'monthly', language, savings, t, currency }),
      interval: 'monthly',
      label: t('dashboard.settings.billing.cycles.monthly.label'),
      priceUsd: monthlyPrice,
      recommended: false,
      selected: subscription.interval === 'monthly',
    },
    {
      currency,
      description: t('dashboard.settings.billing.cycles.annual.description'),
      features: getPlanFeatures({ interval: 'annual', language, savings, t, currency }),
      interval: 'annual',
      label: t('dashboard.settings.billing.cycles.annual.label'),
      priceUsd: annualPrice,
      recommended: true,
      selected: subscription.interval === 'annual',
    },
  ];
}

function findPlanByInterval(plans: SubscriptionPlan[], interval: BillingInterval): SubscriptionPlan | undefined {
  return plans.find((plan) => normalizeInterval(plan.interval) === interval);
}

function getPlanFeatures({
  currency,
  interval,
  language,
  savings,
  t,
}: {
  currency: string;
  interval: BillingInterval;
  language: string;
  savings?: number;
  t: TFunction;
}): string[] {
  const features = [
    t('dashboard.settings.billing.planFeatures.profile'),
    t('dashboard.settings.billing.planFeatures.avatar'),
    t('dashboard.settings.billing.planFeatures.voice'),
    t(`dashboard.settings.billing.planFeatures.chat.${interval}`),
    t(`dashboard.settings.billing.planFeatures.tts.${interval}`),
    t('dashboard.settings.billing.planFeatures.credits'),
  ];

  if (interval === 'annual' && typeof savings === 'number' && savings > 0) {
    features.push(
      t('dashboard.settings.billing.planFeatures.savings', {
        amount: formatCurrency(savings, currency, language),
      })
    );
  }

  return features;
}

function getUsageMetrics(data: JsonObject, t: TFunction): UsageMetric[] {
  const metrics = new Map<string, UsageMetric>();
  const sources = [
    getRecordField(data, ['limits']),
    getRecordField(data, ['quota']),
    getRecordField(data, ['quotas']),
  ].filter((source): source is JsonObject => Boolean(source));

  for (const source of sources) {
    addMetricsFromSource(metrics, source, t);
  }

  if (!metrics.size) {
    addMetricsFromSource(metrics, data, t);
  }

  return Array.from(metrics.values()).sort((a, b) => b.progress - a.progress);
}

function addMetricsFromSource(metrics: Map<string, UsageMetric>, source: JsonObject, t: TFunction): void {
  for (const [key, value] of Object.entries(source)) {
    if (metrics.has(key) || !isRecord(value)) {
      continue;
    }

    const metric = getUsageMetric(key, value, t);

    if (metric) {
      metrics.set(key, metric);
    }
  }
}

function getUsageMetric(key: string, value: JsonObject, t: TFunction): UsageMetric | null {
  const explicitUsed = getNumberField(value, usedFields);
  const explicitLimit = getNumberField(value, limitFields);
  const remaining = getNumberField(value, remainingFields);
  const unlimited = value.unlimited === true || hasNullField(value, limitFields) || explicitLimit === -1;
  const limit =
    explicitLimit ??
    (typeof explicitUsed === 'number' && typeof remaining === 'number' ? explicitUsed + remaining : undefined);
  const used =
    explicitUsed ??
    (typeof limit === 'number' && typeof remaining === 'number' ? Math.max(limit - remaining, 0) : undefined);

  if (used === undefined && limit === undefined && remaining === undefined && !unlimited) {
    return null;
  }

  const progress =
    !unlimited && typeof used === 'number' && typeof limit === 'number' && limit > 0
      ? Math.min(Math.max((used / limit) * 100, 0), 100)
      : 0;

  return {
    color: getMetricColor(key),
    icon: getMetricIcon(key),
    key,
    label: getFieldLabel(key, t),
    limit: limit === -1 ? undefined : limit,
    progress,
    remaining,
    unlimited,
    used,
  };
}

function getPrimaryMetric(metrics: UsageMetric[]): UsageMetric | undefined {
  return metrics.find((metric) => metric.key.toLowerCase().includes('credit')) ?? metrics[0];
}

function getUsageValue(metric: UsageMetric, language: string, t: TFunction): string {
  if (metric.unlimited) {
    return t('dashboard.settings.billing.values.unlimited');
  }

  if (typeof metric.used === 'number' && typeof metric.limit === 'number') {
    return t('dashboard.settings.billing.values.usedOfLimit', {
      limit: formatNumber(metric.limit, language),
      used: formatNumber(metric.used, language),
    });
  }

  if (typeof metric.used === 'number') {
    return t('dashboard.settings.billing.values.used', { used: formatNumber(metric.used, language) });
  }

  if (typeof metric.limit === 'number') {
    return formatNumber(metric.limit, language);
  }

  return t('dashboard.settings.billing.values.empty');
}

function getUsageSummary(metric: UsageMetric, language: string, t: TFunction): string {
  if (metric.unlimited) {
    return t('dashboard.settings.billing.usage.unlimitedSummary');
  }

  if (typeof metric.remaining === 'number') {
    return t('dashboard.settings.billing.usage.remainingSummary', {
      remaining: formatNumber(metric.remaining, language),
    });
  }

  return getUsageValue(metric, language, t);
}

function getMetricIcon(key: string): Icon {
  const normalized = key.toLowerCase();

  if (normalized.includes('credit')) {
    return CoinsIcon;
  }

  if (normalized.includes('profile')) {
    return UserCircleIcon;
  }

  if (normalized.includes('image') || normalized.includes('avatar')) {
    return normalized.includes('video') ? VideoCameraIcon : ImageSquareIcon;
  }

  if (normalized.includes('video')) {
    return VideoCameraIcon;
  }

  if (normalized.includes('voice')) {
    return MicrophoneIcon;
  }

  if (normalized.includes('tts') || normalized.includes('character')) {
    return SpeakerHighIcon;
  }

  if (normalized.includes('chat') || normalized.includes('message')) {
    return ChatsCircleIcon;
  }

  return GaugeIcon;
}

function getMetricColor(key: string): string {
  const normalized = key.toLowerCase();

  if (normalized.includes('credit')) {
    return 'var(--mui-palette-primary-main)';
  }

  if (normalized.includes('chat') || normalized.includes('message')) {
    return 'var(--mui-palette-success-main)';
  }

  if (normalized.includes('video') || normalized.includes('avatar')) {
    return 'var(--mui-palette-warning-main)';
  }

  if (normalized.includes('tts') || normalized.includes('voice') || normalized.includes('character')) {
    return 'var(--mui-palette-info-main)';
  }

  return 'var(--mui-palette-text-primary)';
}

function getIntervalLabel(interval: BillingInterval, t: TFunction): string {
  return interval === 'annual'
    ? t('dashboard.settings.billing.cycles.annual.label')
    : t('dashboard.settings.billing.cycles.monthly.label');
}

function getPeriodLabel(interval: BillingInterval, t: TFunction): string {
  return interval === 'annual'
    ? t('dashboard.settings.billing.cycles.annual.period')
    : t('dashboard.settings.billing.cycles.monthly.period');
}

function normalizeInterval(value?: string): BillingInterval {
  return value && annualIntervals.has(value.toLowerCase()) ? 'annual' : 'monthly';
}

function getStatusLabel(status: string, t: TFunction): string {
  return t(`dashboard.settings.billing.status.${toCamelCase(status)}`, { defaultValue: toTitle(status) });
}

function getStatusColor(status: string): 'default' | 'error' | 'success' | 'warning' {
  const normalized = status.toLowerCase();

  if (['active', 'paid', 'succeeded', 'valid'].includes(normalized)) {
    return 'success';
  }

  if (['canceled', 'cancelled', 'expired', 'failed', 'inactive'].includes(normalized)) {
    return 'error';
  }

  if (['past_due', 'pending', 'trialing'].includes(normalized)) {
    return 'warning';
  }

  return 'default';
}

function getRecordField(value: JsonObject, fields: string[]): JsonObject | undefined {
  for (const field of fields) {
    const recordValue = value[field];

    if (isRecord(recordValue)) {
      return recordValue;
    }
  }

  return undefined;
}

function getStringField(value: JsonObject, fields: string[]): string | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'string' && rawValue) {
      return rawValue;
    }
  }

  return undefined;
}

function getNumberField(value: JsonObject, fields: readonly string[]): number | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return rawValue;
    }

    if (typeof rawValue === 'string') {
      const parsedValue = Number(rawValue);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return undefined;
}

function hasNullField(value: JsonObject, fields: readonly string[]): boolean {
  return fields.some((field) => value[field] === null);
}

function isRecord(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getFieldLabel(field: string, t: TFunction): string {
  return t(`dashboard.settings.billing.fields.${toCamelCase(field)}`, { defaultValue: toTitle(field) });
}

function toCamelCase(value: string): string {
  const [first = '', ...rest] = value.split(/[-_\s]+/).filter(Boolean);

  return `${first}${rest.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join('')}`;
}

function toTitle(value: string): string {
  return value
    .replace(/(?<lower>[a-z])(?<upper>[A-Z])/g, '$<lower> $<upper>')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number | undefined, currency: string, language: string): string {
  if (typeof value !== 'number') {
    return '-';
  }

  return new Intl.NumberFormat(language, {
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    style: 'currency',
  }).format(value);
}

function formatDate(value: string, language: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
}

function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language).format(value);
}

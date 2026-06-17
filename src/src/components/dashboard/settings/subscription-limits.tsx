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
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { JsonObject, JsonValue, SubscriptionLimits as SubscriptionLimitsData } from '@/lib/subscription/api-client';
import { PropertyItem } from '@/components/core/property-item';
import { PropertyList } from '@/components/core/property-list';

export interface SubscriptionLimitsProps {
  data: SubscriptionLimitsData;
  language: string;
}

interface UsageMetric {
  limit?: number;
  remaining?: number;
  unlimited: boolean;
  used?: number;
}

const usedFields = ['used', 'current', 'count', 'usage', 'consumed'] as const;
const limitFields = ['limit', 'max', 'maximum', 'total', 'allowed'] as const;
const remainingFields = ['remaining', 'available', 'left'] as const;

export function SubscriptionLimits({ data, language }: SubscriptionLimitsProps): React.JSX.Element {
  const { t } = useTranslation();
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const primitiveEntries = entries.filter(([, value]) => !isRecord(value) && !Array.isArray(value));
  const sectionEntries = entries.filter(([, value]) => isRecord(value) || Array.isArray(value));

  if (!entries.length) {
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
    <Stack spacing={3}>
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
        {primitiveEntries.length ? (
          <CardContent>
            <PropertyList divider={<Divider />} sx={{ '--PropertyItem-padding': '12px 0' }}>
              {primitiveEntries.map(([key, value]) => (
                <PropertyItem
                  key={key}
                  name={getFieldLabel(key, t)}
                  value={renderValue({ field: key, language, t, value })}
                />
              ))}
            </PropertyList>
          </CardContent>
        ) : null}
      </Card>
      {sectionEntries.map(([key, value]) => (
        <SubscriptionSection key={key} language={language} sectionKey={key} t={t} value={value} />
      ))}
    </Stack>
  );
}

function SubscriptionSection({
  language,
  sectionKey,
  t,
  value,
}: {
  language: string;
  sectionKey: string;
  t: TFunction;
  value: JsonValue;
}): React.JSX.Element {
  if (Array.isArray(value)) {
    return <ArraySection language={language} sectionKey={sectionKey} t={t} value={value} />;
  }

  if (!isRecord(value)) {
    return (
      <Card>
        <CardHeader title={getSectionLabel(sectionKey, t)} />
        <CardContent>
          <Typography variant="body2">{formatPrimitiveValue({ field: sectionKey, language, t, value })}</Typography>
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  const metricEntries = entries
    .map(([entryKey, entryValue]) => ({ key: entryKey, metric: getUsageMetric(entryValue) }))
    .filter((entry): entry is { key: string; metric: UsageMetric } => Boolean(entry.metric));
  const metricKeys = new Set(metricEntries.map((entry) => entry.key));
  const detailEntries = entries.filter(([entryKey]) => !metricKeys.has(entryKey));

  return (
    <Card>
      <CardHeader
        avatar={
          metricEntries.length ? (
            <Avatar>
              <GaugeIcon fontSize="var(--Icon-fontSize)" />
            </Avatar>
          ) : undefined
        }
        title={getSectionLabel(sectionKey, t)}
      />
      <CardContent>
        <Stack spacing={3}>
          {metricEntries.length ? (
            <Grid container spacing={2}>
              {metricEntries.map(({ key, metric }) => (
                <Grid key={key} md={4} sm={6} xs={12}>
                  <UsageMetricCard label={getFieldLabel(key, t)} metric={metric} t={t} />
                </Grid>
              ))}
            </Grid>
          ) : null}
          {detailEntries.length ? (
            <Card sx={{ borderRadius: 1 }} variant="outlined">
              <PropertyList divider={<Divider />} sx={{ '--PropertyItem-padding': '12px 24px' }}>
                {detailEntries.map(([entryKey, entryValue]) => (
                  <PropertyItem
                    key={entryKey}
                    name={getFieldLabel(entryKey, t)}
                    value={renderValue({ field: entryKey, language, t, value: entryValue })}
                  />
                ))}
              </PropertyList>
            </Card>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ArraySection({
  language,
  sectionKey,
  t,
  value,
}: {
  language: string;
  sectionKey: string;
  t: TFunction;
  value: JsonValue[];
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader title={getSectionLabel(sectionKey, t)} />
      <CardContent>
        {value.length ? (
          <Stack spacing={2}>
            {value.map((item, index) => (
              <Card
                // eslint-disable-next-line react/no-array-index-key -- Endpoint arrays are rendered read-only and are not reordered here.
                key={`${sectionKey}-${index}`}
                sx={{ borderRadius: 1 }}
                variant="outlined"
              >
                <CardContent>
                  {isRecord(item) ? (
                    <PropertyList divider={<Divider />} sx={{ '--PropertyItem-padding': '12px 0' }}>
                      {Object.entries(item).map(([entryKey, entryValue]) => (
                        <PropertyItem
                          key={entryKey}
                          name={getFieldLabel(entryKey, t)}
                          value={renderValue({ field: entryKey, language, t, value: entryValue })}
                        />
                      ))}
                    </PropertyList>
                  ) : (
                    <Typography variant="body2">{formatPrimitiveValue({ field: sectionKey, language, t, value: item })}</Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.settings.billing.emptySection')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function UsageMetricCard({
  label,
  metric,
  t,
}: {
  label: string;
  metric: UsageMetric;
  t: TFunction;
}): React.JSX.Element {
  const limit = metric.limit;
  const hasLimit = typeof limit === 'number' && limit > 0 && !metric.unlimited;
  const progress =
    hasLimit && typeof metric.used === 'number' ? Math.min(Math.max((metric.used / limit) * 100, 0), 100) : 0;
  const primaryValue = metric.unlimited
    ? t('dashboard.settings.billing.values.unlimited')
    : typeof metric.used === 'number' && typeof metric.limit === 'number'
      ? t('dashboard.settings.billing.values.usedOfLimit', {
          limit: formatNumber(metric.limit),
          used: formatNumber(metric.used),
        })
      : typeof metric.used === 'number'
        ? t('dashboard.settings.billing.values.used', { used: formatNumber(metric.used) })
        : typeof metric.limit === 'number'
          ? formatNumber(metric.limit)
          : '-';

  return (
    <Card sx={{ borderRadius: 1, height: '100%' }} variant="outlined">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2">{label}</Typography>
          {typeof metric.remaining === 'number' ? (
            <Chip
              label={t('dashboard.settings.billing.values.remaining', { remaining: formatNumber(metric.remaining) })}
              size="small"
              variant="soft"
            />
          ) : null}
        </Stack>
        <Typography variant="h6">{primaryValue}</Typography>
        {hasLimit ? <LinearProgress value={progress} variant="determinate" /> : null}
      </Stack>
    </Card>
  );
}

function renderValue({
  field,
  language,
  t,
  value,
}: {
  field: string;
  language: string;
  t: TFunction;
  value: JsonValue;
}): React.ReactNode {
  if (isRecord(value) || Array.isArray(value)) {
    return (
      <Box
        component="pre"
        sx={{
          bgcolor: 'background.level1',
          borderRadius: 1,
          fontFamily: 'var(--fontFamily-mono)',
          fontSize: '0.8125rem',
          m: 0,
          maxHeight: 240,
          overflow: 'auto',
          p: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <Chip
        color={value ? 'success' : 'default'}
        label={value ? t('dashboard.settings.billing.values.yes') : t('dashboard.settings.billing.values.no')}
        size="small"
        variant="soft"
      />
    );
  }

  if (field.toLowerCase().includes('status') && typeof value === 'string') {
    return <Chip label={formatStatus(value)} size="small" variant="soft" />;
  }

  return formatPrimitiveValue({ field, language, t, value });
}

function formatPrimitiveValue({
  field,
  language,
  t,
  value,
}: {
  field: string;
  language: string;
  t: TFunction;
  value: JsonValue;
}): string {
  if (value === null || value === '') {
    return t('dashboard.settings.billing.values.empty');
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (typeof value === 'boolean') {
    return value ? t('dashboard.settings.billing.values.yes') : t('dashboard.settings.billing.values.no');
  }

  if (typeof value === 'string' && isDateField(field, value)) {
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  return String(value);
}

function getUsageMetric(value: JsonValue): null | UsageMetric {
  if (!isRecord(value)) {
    return null;
  }

  const used = getNumberField(value, usedFields);
  const limit = getNumberField(value, limitFields);
  const remaining = getNumberField(value, remainingFields);
  const unlimited = value.unlimited === true || limit === -1 || limit === null;

  if (used === undefined && limit === undefined && remaining === undefined && !unlimited) {
    return null;
  }

  return { limit, remaining, unlimited, used };
}

function getNumberField(value: JsonObject, fields: readonly string[]): number | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'number') {
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

function isRecord(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateField(field: string, value: string): boolean {
  if (!Number.isFinite(new Date(value).getTime())) {
    return false;
  }

  return /(?:_at|At|date|Date|period|Period|expires|Expires|until|Until|start|Start|end|End)$/.test(field);
}

function getSectionLabel(section: string, t: TFunction): string {
  return t(`dashboard.settings.billing.sections.${toCamelCase(section)}`, { defaultValue: toTitle(section) });
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

function formatStatus(value: string): string {
  return toTitle(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

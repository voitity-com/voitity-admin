import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { UsageAnalytics } from '@/lib/subscription/api-client';

const serviceKeys = [
  'chat_message_received',
  'incoming_audio_message',
  'voice_tts_characters',
  'voice_cloned',
  'avatar_image_created',
  'avatar_video_created',
] as const;

const serviceColors: Record<(typeof serviceKeys)[number], string> = {
  avatar_image_created: '#f59e0b',
  avatar_video_created: '#ef4444',
  chat_message_received: '#16a34a',
  incoming_audio_message: '#0284c7',
  voice_cloned: '#7c3aed',
  voice_tts_characters: '#0d9488',
};

export function UsageAnalyticsPanel({
  data,
  language,
}: {
  data: UsageAnalytics;
  language: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const chartData = data.series.map((item) => ({
    bucket: item.bucket,
    ...Object.fromEntries(
      serviceKeys.map((key) => [key, item.services[key]?.purchased_credits ?? 0])
    ),
  }));

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <SummaryValue
          label={t('dashboard.settings.usage.analytics.available')}
          value={formatNumber(data.wallet.available, language)}
        />
        <SummaryValue
          label={t('dashboard.settings.usage.analytics.purchased')}
          value={formatNumber(data.summary.credits.purchased, language)}
        />
        <SummaryValue
          label={t('dashboard.settings.usage.analytics.consumed')}
          value={formatNumber(data.summary.credits.consumed, language)}
        />
        <SummaryValue
          label={t('dashboard.settings.usage.analytics.reserved')}
          value={formatNumber(data.summary.credits.reserved, language)}
        />
      </Grid>

      <Card>
        <CardHeader
          subheader={t('dashboard.settings.usage.analytics.chartSubheader')}
          title={t('dashboard.settings.usage.analytics.chartTitle')}
        />
        <CardContent>
          {chartData.length ? (
            <ResponsiveContainer height={320} width="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Legend />
                {serviceKeys.map((key) => (
                  <Bar
                    dataKey={key}
                    fill={serviceColors[key]}
                    key={key}
                    name={t(`dashboard.settings.usage.analytics.services.${key}`)}
                    stackId="credits"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }} variant="body2">
              {t('dashboard.settings.usage.analytics.noCreditUsage')}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          subheader={t('dashboard.settings.usage.analytics.periodsSubheader')}
          title={t('dashboard.settings.usage.analytics.periodsTitle')}
        />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('dashboard.settings.usage.analytics.period')}</TableCell>
                <TableCell>{t('dashboard.settings.usage.analytics.plan')}</TableCell>
                <TableCell>{t('dashboard.settings.usage.analytics.planMessages')}</TableCell>
                <TableCell>{t('dashboard.settings.usage.analytics.planTts')}</TableCell>
                <TableCell>{t('dashboard.settings.usage.analytics.creditUsage')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell>
                    {formatDateRange(period.period_started_at, period.period_renews_at, language)}
                  </TableCell>
                  <TableCell>{period.plan}</TableCell>
                  <TableCell>
                    {formatUsedOfIncluded(period.plan_used.chat_messages, period.included.chat_messages, language)}
                  </TableCell>
                  <TableCell>
                    {formatUsedOfIncluded(period.plan_used.tts_characters, period.included.tts_characters, language)}
                  </TableCell>
                  <TableCell>{formatNumber(period.purchased_credits_used, language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Grid md={3} sm={6} xs={12}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
          <Typography sx={{ mt: 1 }} variant="h4">
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function formatUsedOfIncluded(used: number | undefined, included: number | undefined, language: string): string {
  return `${formatNumber(used ?? 0, language)} / ${formatNumber(included ?? 0, language)}`;
}

function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(value);
}

function formatDateRange(from: string, to: string, language: string): string {
  const formatter = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' });

  return `${formatter.format(new Date(from))} - ${formatter.format(new Date(to))}`;
}

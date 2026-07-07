'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { ProfileQuality, ProfileQualityCheck } from '@/lib/profiles/api-client';
import { getProfileQuality } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';

const metadata = { title: `Quality | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [quality, setQuality] = React.useState<null | ProfileQuality>(null);
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadQuality = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setQuality(await getProfileQuality(profileId));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

  React.useEffect(() => {
    loadQuality().catch((err) => {
      logger.error(err);
    });
  }, [loadQuality]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            subheader={quality?.profession.label ?? t('dashboard.profiles.detail.quality.subheader')}
            title={t('dashboard.profiles.detail.quality.title')}
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : quality ? (
            <CardContent>
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h5">{t('dashboard.profiles.detail.quality.score', { score: quality.score })}</Typography>
                    <Chip
                      color={quality.score >= 80 ? 'success' : quality.score >= 50 ? 'warning' : 'error'}
                      label={t('dashboard.profiles.detail.quality.scoreLabel', { score: quality.score })}
                    />
                  </Stack>
                  <LinearProgress value={quality.score} variant="determinate" />
                </Stack>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  }}
                >
                  <Metric label={t('dashboard.profiles.detail.quality.metrics.sources')} value={quality.counts.sources ?? 0} />
                  <Metric
                    label={t('dashboard.profiles.detail.quality.metrics.approvedFacts')}
                    value={quality.counts.approved_facts ?? 0}
                  />
                  <Metric
                    label={t('dashboard.profiles.detail.quality.metrics.indexedFacts')}
                    value={quality.counts.indexed_facts ?? 0}
                  />
                </Box>
                <DataTable<ProfileQualityCheck> columns={getColumns(t)} rows={quality.checks} uniqueRowId={(row) => row.key} />
              </Stack>
            </CardContent>
          ) : null}
        </Card>
      </Stack>
    </React.Fragment>
  );
}

function Metric({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <Box sx={{ border: '1px solid var(--mui-palette-divider)', borderRadius: 1, p: 2 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography variant="h5">{value}</Typography>
    </Box>
  );
}

function getColumns(t: (key: string, options?: Record<string, unknown>) => string): ColumnDef<ProfileQualityCheck>[] {
  return [
    {
      formatter: (check): React.ReactNode => (
        <Chip
          color={check.passed ? 'success' : 'warning'}
          label={
            check.passed
              ? t('dashboard.profiles.detail.quality.status.passed')
              : t('dashboard.profiles.detail.quality.status.missing')
          }
          size="small"
          variant="outlined"
        />
      ),
      name: t('dashboard.profiles.detail.quality.fields.status'),
      width: '130px',
    },
    {
      field: 'label',
      name: t('dashboard.profiles.detail.quality.fields.check'),
      width: '260px',
    },
    {
      formatter: (check): string => String(check.actual ?? 0),
      name: t('dashboard.profiles.detail.quality.fields.actual'),
      width: '120px',
    },
    {
      formatter: (check): string => String(check.required ?? 1),
      name: t('dashboard.profiles.detail.quality.fields.required'),
      width: '120px',
    },
    {
      formatter: (check): string => String(check.weight),
      name: t('dashboard.profiles.detail.quality.fields.weight'),
      width: '100px',
    },
  ];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

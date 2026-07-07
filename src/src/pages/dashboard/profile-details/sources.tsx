'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { Helmet } from 'react-helmet-async';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { ProfileKnowledgeSource, ProfileSourcesPage } from '@/lib/profiles/api-client';
import { approveProfileSource, listProfileSources, uploadProfileCvSource } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Sources | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

interface Values {
  name: string;
  text: string;
}

function createSchema(t: (key: string) => string, hasFile: boolean): zod.ZodType<Values> {
  return zod
    .object({
      name: zod.string().max(150, t('dashboard.profiles.detail.sources.validation.nameMax')),
      text: zod.string().max(50000, t('dashboard.profiles.detail.sources.validation.textMax')),
    })
    .refine((values) => hasFile || values.text.trim().length > 0, {
      message: t('dashboard.profiles.detail.sources.validation.fileOrText'),
      path: ['text'],
    });
}

const defaultValues = {
  name: '',
  text: '',
} satisfies Values;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [sourcesPage, setSourcesPage] = React.useState<ProfileSourcesPage>({ page: 1, sources: [] });
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [approvingId, setApprovingId] = React.useState<null | string>(null);
  const schema = React.useMemo(() => createSchema(t, Boolean(file)), [file, t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  const loadSources = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setSourcesPage(await listProfileSources({ profileId }));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

  React.useEffect(() => {
    loadSources().catch((err) => {
      logger.error(err);
    });
  }, [loadSources]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      try {
        await uploadProfileCvSource({
          file: file ?? undefined,
          name: values.name.trim() || undefined,
          profileId,
          text: values.text.trim() || undefined,
        });
        toast.success(t('dashboard.profiles.detail.sources.toasts.imported'));
        setFile(null);
        reset(defaultValues);
        await loadSources();
      } catch (err) {
        toast.error(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
        throw err;
      }
    },
    [file, loadSources, profileId, reset, t]
  );

  const handleApprove = React.useCallback(
    async (source: ProfileKnowledgeSource): Promise<void> => {
      setApprovingId(String(source.id));

      try {
        await approveProfileSource(profileId, source.id);
        toast.success(
          source.status === 'indexed'
            ? t('dashboard.profiles.detail.sources.toasts.synced')
            : t('dashboard.profiles.detail.sources.toasts.approved')
        );
        await loadSources();
      } catch (err) {
        toast.error(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
      } finally {
        setApprovingId(null);
      }
    },
    [loadSources, profileId, t]
  );

  const columns = React.useMemo(
    () => getColumns({ approvingId, language, onApprove: handleApprove, t }),
    [approvingId, handleApprove, language, t]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardHeader
              subheader={t('dashboard.profiles.detail.sources.uploadSubheader')}
              title={t('dashboard.profiles.detail.sources.uploadTitle')}
            />
            <CardContent>
              <Stack spacing={2}>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormControl error={Boolean(errors.name)}>
                      <InputLabel>{t('dashboard.profiles.detail.sources.fields.name')}</InputLabel>
                      <OutlinedInput {...field} label={t('dashboard.profiles.detail.sources.fields.name')} />
                      {errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}
                    </FormControl>
                  )}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
                  <Button component="label" startIcon={<UploadSimpleIcon />} variant="outlined">
                    {t('dashboard.profiles.detail.sources.actions.selectFile')}
                    <input
                      accept=".pdf,.doc,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      hidden
                      onChange={(event) => {
                        setFile(event.target.files?.[0] ?? null);
                      }}
                      type="file"
                    />
                  </Button>
                  <Typography color="text.secondary" variant="body2">
                    {file?.name ?? t('dashboard.profiles.detail.sources.noFile')}
                  </Typography>
                </Stack>
                <Controller
                  control={control}
                  name="text"
                  render={({ field }) => (
                    <FormControl error={Boolean(errors.text)}>
                      <InputLabel>{t('dashboard.profiles.detail.sources.fields.text')}</InputLabel>
                      <OutlinedInput
                        {...field}
                        label={t('dashboard.profiles.detail.sources.fields.text')}
                        multiline
                        rows={7}
                      />
                      <FormHelperText>
                        {errors.text?.message ?? t('dashboard.profiles.detail.sources.textHelper')}
                      </FormHelperText>
                    </FormControl>
                  )}
                />
              </Stack>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end', p: 3, pt: 0 }}>
              <Button disabled={isSubmitting} type="submit" variant="contained">
                {t('dashboard.profiles.detail.sources.actions.importCv')}
              </Button>
            </CardActions>
          </form>
        </Card>
        <Card>
          <CardHeader
            subheader={t('dashboard.profiles.detail.sources.listSubheader')}
            title={t('dashboard.profiles.detail.sources.listTitle')}
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <CardContent>
              {sourcesPage.sources.length ? (
                <Box sx={{ overflowX: 'auto' }}>
                  <DataTable<ProfileKnowledgeSource> columns={columns} rows={sourcesPage.sources} />
                </Box>
              ) : (
                <Typography color="text.secondary" variant="body2">
                  {t('dashboard.profiles.detail.sources.empty')}
                </Typography>
              )}
            </CardContent>
          )}
        </Card>
      </Stack>
    </React.Fragment>
  );
}

function getColumns({
  approvingId,
  language,
  onApprove,
  t,
}: {
  approvingId: null | string;
  language: string;
  onApprove: (source: ProfileKnowledgeSource) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ColumnDef<ProfileKnowledgeSource>[] {
  return [
    {
      formatter: (source): string => source.name,
      name: t('dashboard.profiles.detail.sources.fields.name'),
      width: '220px',
    },
    {
      formatter: (source): string => t(`dashboard.profiles.detail.sources.types.${source.type}`, { defaultValue: source.type }),
      name: t('dashboard.profiles.detail.sources.fields.type'),
      width: '120px',
    },
    {
      formatter: (source): React.ReactNode => (
        <Chip
          color={source.status === 'indexed' ? 'success' : source.status === 'failed' ? 'error' : 'default'}
          label={t(`dashboard.profiles.detail.sources.status.${source.status ?? 'unknown'}`, {
            defaultValue: source.status ?? t('dashboard.profiles.detail.sources.status.unknown'),
          })}
          size="small"
          variant="outlined"
        />
      ),
      name: t('dashboard.profiles.detail.sources.fields.status'),
      width: '150px',
    },
    {
      formatter: (source): string => String(getFactCount(source)),
      name: t('dashboard.profiles.detail.sources.fields.facts'),
      width: '100px',
    },
    {
      formatter: (source): string => formatDate(source.updated_at ?? source.created_at, language),
      name: t('dashboard.profiles.detail.sources.fields.updated'),
      width: '180px',
    },
    {
      formatter: (source): React.ReactNode =>
        <Button
          disabled={approvingId === String(source.id)}
          onClick={() => {
            void onApprove(source);
          }}
          size="small"
          variant={source.status === 'indexed' ? 'text' : 'outlined'}
        >
          {source.status === 'indexed'
            ? t('dashboard.profiles.detail.sources.actions.sync')
            : t('dashboard.profiles.detail.sources.actions.approve')}
        </Button>,
      name: t('dashboard.profiles.detail.sources.fields.actions'),
      width: '160px',
    },
  ];
}

function getFactCount(source: ProfileKnowledgeSource): number {
  return (source.items ?? []).reduce((total, item) => total + (item.facts?.length ?? 0), 0);
}

function formatDate(value: null | string | undefined, language: string): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { Helmet } from 'react-helmet-async';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { ProfileKnowledgeSource, ProfileSourcesPage } from '@/lib/profiles/api-client';
import {
  approveProfileSource,
  downloadProfileSourceFile,
  listProfileSources,
  uploadProfileCvSource,
} from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Sources | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const acceptedSourceFormats = ['PDF', 'DOC', 'DOCX', 'TXT', 'MD'];

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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState<boolean>(false);
  const [approvingId, setApprovingId] = React.useState<null | string>(null);
  const [previewingId, setPreviewingId] = React.useState<null | string>(null);
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
        setIsUploadDialogOpen(false);
        reset(defaultValues);
        await loadSources();
      } catch (err) {
        toast.error(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
        throw err;
      }
    },
    [file, loadSources, profileId, reset, t]
  );

  const handleCloseUploadDialog = React.useCallback((): void => {
    if (isSubmitting) {
      return;
    }

    setFile(null);
    reset(defaultValues);
    setIsUploadDialogOpen(false);
  }, [isSubmitting, reset]);

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

  const handlePreviewFile = React.useCallback(
    async (source: ProfileKnowledgeSource): Promise<void> => {
      setPreviewingId(String(source.id));
      const previewWindow = window.open('', '_blank');

      try {
        const fileDownload = await downloadProfileSourceFile({ profileId, sourceId: source.id });
        openBlobInNewTab(fileDownload.blob, fileDownload.filename ?? getSourceFileName(source), previewWindow);
      } catch (err) {
        previewWindow?.close();
        logger.error(err);
        toast.error(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
      } finally {
        setPreviewingId(null);
      }
    },
    [profileId, t]
  );

  const columns = React.useMemo(
    () =>
      getColumns({
        approvingId,
        language,
        onApprove: handleApprove,
        onPreviewFile: handlePreviewFile,
        previewingId,
        t,
      }),
    [approvingId, handleApprove, handlePreviewFile, language, previewingId, t]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Box
          sx={(theme) => ({
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.22),
            borderLeft: '4px solid',
            borderLeftColor: 'primary.main',
            borderRadius: 1,
            p: { md: 3, xs: 2 },
          })}
        >
          <Stack spacing={2}>
            <Stack spacing={0.75}>
              <Typography
                color="primary.main"
                sx={{ fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase' }}
                variant="overline"
              >
                {t('dashboard.profiles.detail.sources.intro.eyebrow')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  letterSpacing: 0,
                }}
                variant="h5"
              >
                {t('dashboard.profiles.detail.sources.intro.title')}
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: '860px' }} variant="body1">
                {t('dashboard.profiles.detail.sources.intro.description')}
              </Typography>
            </Stack>
            <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <Typography color="text.secondary" sx={{ fontWeight: 600 }} variant="body2">
                {t('dashboard.profiles.detail.sources.intro.formats')}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {acceptedSourceFormats.map((format) => (
                  <Chip color="primary" key={format} label={format} size="small" variant="outlined" />
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Box>
        <Card>
          <CardHeader
            action={
              <Button
                onClick={() => {
                  setIsUploadDialogOpen(true);
                }}
                startIcon={<PlusIcon />}
                variant="contained"
              >
                {t('dashboard.profiles.detail.sources.actions.addSource')}
              </Button>
            }
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
      <Dialog fullWidth maxWidth="md" onClose={handleCloseUploadDialog} open={isUploadDialogOpen}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{t('dashboard.profiles.detail.sources.uploadTitle')}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.profiles.detail.sources.uploadSubheader')}
              </Typography>
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
          </DialogContent>
          <DialogActions>
            <Button disabled={isSubmitting} onClick={handleCloseUploadDialog}>
              {t('dashboard.profiles.detail.sources.actions.cancel')}
            </Button>
            <Button disabled={isSubmitting} type="submit" variant="contained">
              {t('dashboard.profiles.detail.sources.actions.importCv')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </React.Fragment>
  );
}

function getColumns({
  approvingId,
  language,
  onApprove,
  onPreviewFile,
  previewingId,
  t,
}: {
  approvingId: null | string;
  language: string;
  onApprove: (source: ProfileKnowledgeSource) => Promise<void>;
  onPreviewFile: (source: ProfileKnowledgeSource) => Promise<void>;
  previewingId: null | string;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ColumnDef<ProfileKnowledgeSource>[] {
  return [
    {
      formatter: (source): React.ReactNode => (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{source.name}</Typography>
          {getSourceFileName(source) ? (
            <Typography color="text.secondary" variant="body2">
              {getSourceFileName(source)}
            </Typography>
          ) : null}
        </Stack>
      ),
      name: t('dashboard.profiles.detail.sources.fields.name'),
      width: '260px',
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
        <Stack direction="row" spacing={1}>
          <Button
            disabled={!hasSourceFile(source) || previewingId === String(source.id)}
            onClick={() => {
              void onPreviewFile(source);
            }}
            size="small"
            startIcon={<EyeIcon />}
            variant="text"
          >
            {t('dashboard.profiles.detail.sources.actions.previewFile')}
          </Button>
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
          </Button>
        </Stack>,
      name: t('dashboard.profiles.detail.sources.fields.actions'),
      width: '260px',
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

function hasSourceFile(source: ProfileKnowledgeSource): boolean {
  return Boolean(source.file?.available || source.storage_path);
}

function getSourceFileName(source: ProfileKnowledgeSource): string {
  return source.file?.name ?? source.original_filename ?? '';
}

function openBlobInNewTab(blob: Blob, filename: string, previewWindow: Window | null): void {
  const objectUrl = URL.createObjectURL(blob);

  if (previewWindow) {
    previewWindow.opener = null;
    previewWindow.location.href = objectUrl;
  } else {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename || 'profile-source';
    document.body.append(link);
    link.click();
    link.remove();
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

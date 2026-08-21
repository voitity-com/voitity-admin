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
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DownloadSimple as DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import type { TFunction } from 'i18next';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import { logger } from '@/lib/default-logger';
import type { BusinessSource } from '@/lib/business/api-client';
import { createBusinessSource, deleteBusinessSource, downloadBusinessSource, listBusinessSources } from '@/lib/business/api-client';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { toast } from '@/components/core/toaster';

const acceptedFormats = ['PDF', 'TXT', 'MD', 'CSV', 'JSON'];
interface Values { content: string; name: string }
const defaultValues: Values = { content: '', name: '' };

export function Page(): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [sources, setSources] = React.useState<BusinessSource[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [deletingSource, setDeletingSource] = React.useState<BusinessSource | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [downloadingId, setDownloadingId] = React.useState<number | null>(null);
  const schema = React.useMemo(() => zod.object({
    name: zod.string().trim().min(1, t('dashboard.business.validation.nameRequired')).max(180),
    content: zod.string().max(500000),
  }).refine((values) => Boolean(file) || values.content.trim().length > 0, {
    message: t('dashboard.business.sources.contentRequired'), path: ['content'],
  }), [file, t]);
  const { control, formState: { errors, isSubmitting }, handleSubmit, reset } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  const load = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setSources(await listBusinessSources(businessId));
      setError('');
    } catch (reason) {
      logger.error(reason);
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [businessId, t]);
  React.useEffect(() => { load().catch(logger.error); }, [load]);

  const closeUpload = (): void => {
    if (isSubmitting) return;
    setFile(null);
    reset(defaultValues);
    setUploadOpen(false);
  };

  const handleDownload = React.useCallback(async (source: BusinessSource): Promise<void> => {
    setDownloadingId(source.id);
    try {
      const result = await downloadBusinessSource(businessId, source.id);
      const objectUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = result.filename ?? source.original_filename ?? source.name;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => { URL.revokeObjectURL(objectUrl); }, 1000);
    } catch (reason) {
      logger.error(reason);
      toast.error(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setDownloadingId(null);
    }
  }, [businessId, t]);

  const handleDelete = async (): Promise<void> => {
    if (!deletingSource) return;
    setDeleting(true);
    try {
      await deleteBusinessSource(businessId, deletingSource.id);
      toast.success(t('dashboard.business.toasts.sourceDeleted'));
      setDeletingSource(null);
      await load();
    } catch (reason) {
      logger.error(reason);
      toast.error(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setDeleting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<BusinessSource>[]>(() => getColumns({
    downloadingId,
    language,
    onDelete: setDeletingSource,
    onDownload: handleDownload,
    t,
  }), [downloadingId, handleDownload, language, t]);

  return (
    <React.Fragment>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Box sx={(theme) => ({ bgcolor: alpha(theme.palette.primary.main, 0.06), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.22), borderLeft: '4px solid', borderLeftColor: 'primary.main', borderRadius: 1, p: { md: 3, xs: 2 } })}>
          <Stack spacing={2}>
            <Stack spacing={0.75}>
              <Typography color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }} variant="overline">{t('dashboard.business.sources.intro.eyebrow')}</Typography>
              <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }} variant="h5">{t('dashboard.business.sources.intro.title')}</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 860 }} variant="body1">{t('dashboard.business.sources.intro.description')}</Typography>
            </Stack>
            <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <Typography color="text.secondary" sx={{ fontWeight: 600 }} variant="body2">{t('dashboard.business.sources.intro.formats')}</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>{acceptedFormats.map((format) => <Chip color="primary" key={format} label={format} size="small" variant="outlined" />)}</Stack>
            </Stack>
          </Stack>
        </Box>
        <Card>
          <CardHeader action={<Button onClick={() => { setUploadOpen(true); }} startIcon={<PlusIcon />} variant="contained">{t('dashboard.business.sources.actions.add')}</Button>} subheader={t('dashboard.business.sources.listSubtitle')} title={t('dashboard.business.sources.listTitle')} />
          {loading ? <Stack sx={{ alignItems: 'center', p: 4 }}><CircularProgress /></Stack> : <CardContent>{sources.length ? <Box sx={{ overflowX: 'auto' }}><DataTable<BusinessSource> columns={columns} rows={sources} /></Box> : <Typography color="text.secondary" variant="body2">{t('dashboard.business.sources.empty')}</Typography>}</CardContent>}
        </Card>
      </Stack>

      <Dialog fullWidth maxWidth="md" onClose={closeUpload} open={uploadOpen}>
        <form onSubmit={handleSubmit(async (values) => {
          const data = new FormData();
          data.append('name', values.name.trim());
          if (file) data.append('file', file);
          if (values.content.trim()) data.append('content', values.content.trim());
          try {
            await createBusinessSource(businessId, data);
            toast.success(t('dashboard.business.toasts.sourceAdded'));
            setFile(null); reset(defaultValues); setUploadOpen(false); await load();
          } catch (reason) { toast.error(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic')); }
        })}>
          <DialogTitle>{t('dashboard.business.sources.addTitle')}</DialogTitle>
          <DialogContent dividers><Stack spacing={2}>
            <Typography color="text.secondary" variant="body2">{t('dashboard.business.sources.uploadSubtitle')}</Typography>
            <Controller control={control} name="name" render={({ field }) => <FormControl error={Boolean(errors.name)}><InputLabel>{t('dashboard.business.sources.name')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.sources.name')} />{errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}</FormControl>} />
            <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}><Button component="label" startIcon={<UploadSimpleIcon />} variant="outlined">{t('dashboard.business.sources.actions.selectFile')}<input accept=".pdf,.txt,.md,.csv,.json" hidden onChange={(event) => { setFile(event.target.files?.[0] ?? null); }} type="file" /></Button><Typography color="text.secondary" variant="body2">{file?.name ?? t('dashboard.business.sources.noFile')}</Typography></Stack>
            <Controller control={control} name="content" render={({ field }) => <FormControl error={Boolean(errors.content)}><InputLabel>{t('dashboard.business.sources.textContent')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.sources.textContent')} multiline rows={7} /><FormHelperText>{errors.content?.message ?? t('dashboard.business.sources.textHelper')}</FormHelperText></FormControl>} />
          </Stack></DialogContent>
          <DialogActions><Button disabled={isSubmitting} onClick={closeUpload}>{t('dashboard.business.actions.cancel')}</Button><Button disabled={isSubmitting} type="submit" variant="contained">{t('dashboard.business.actions.save')}</Button></DialogActions>
        </form>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => { if (!deleting) setDeletingSource(null); }} open={Boolean(deletingSource)}>
        <DialogTitle>{t('dashboard.business.sources.delete.title')}</DialogTitle>
        <DialogContent dividers><Typography>{t('dashboard.business.sources.delete.description', { name: deletingSource?.name ?? '' })}</Typography></DialogContent>
        <DialogActions><Button disabled={deleting} onClick={() => { setDeletingSource(null); }}>{t('dashboard.business.actions.cancel')}</Button><Button color="error" disabled={deleting} onClick={() => { void handleDelete(); }} variant="contained">{t('dashboard.business.actions.delete')}</Button></DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function formatDate(value: null | string | undefined, language: string): string {
  return value ? new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value)) : '-';
}

function getColumns({
  downloadingId,
  language,
  onDelete,
  onDownload,
  t,
}: {
  downloadingId: null | number;
  language: string;
  onDelete: (source: BusinessSource) => void;
  onDownload: (source: BusinessSource) => Promise<void>;
  t: TFunction;
}): ColumnDef<BusinessSource>[] {
  return [
    {
      formatter: (source) => <Stack spacing={0.5}><Typography variant="subtitle2">{source.name}</Typography><Typography color="text.secondary" variant="body2">{source.original_filename ?? t('dashboard.business.sources.textOnly')}</Typography></Stack>,
      name: t('dashboard.business.sources.name'), width: '260px',
    },
    { formatter: (source) => t(`dashboard.business.sources.types.${source.type}`, { defaultValue: source.type }), name: t('dashboard.business.sources.fields.type'), width: '140px' },
    { formatter: (source) => <Chip color={source.status === 'indexed' ? 'success' : source.status === 'failed' ? 'error' : 'warning'} label={t(`dashboard.business.sources.status.${source.status}`)} size="small" variant="outlined" />, name: t('dashboard.business.sources.fields.status'), width: '140px' },
    { formatter: (source) => source.token_count.toLocaleString(language), name: t('dashboard.business.sources.fields.tokens'), width: '110px' },
    { formatter: (source) => formatDate(source.updated_at ?? source.created_at, language), name: t('dashboard.business.sources.fields.updated'), width: '160px' },
    {
      formatter: (source) => <Stack direction="row" spacing={1}>
        <Button disabled={!source.original_filename || downloadingId === source.id} onClick={() => { void onDownload(source); }} size="small" startIcon={<DownloadSimpleIcon />} variant="text">{t('dashboard.business.sources.actions.download')}</Button>
        <Tooltip title={t('dashboard.business.actions.delete')}><IconButton aria-label={t('dashboard.business.actions.delete')} color="error" onClick={() => { onDelete(source); }} size="small"><TrashIcon /></IconButton></Tooltip>
      </Stack>,
      name: t('dashboard.business.sources.fields.actions'), width: '230px',
    },
  ];
}

'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DownloadSimple as DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { FileCsv as FileCsvIcon } from '@phosphor-icons/react/dist/ssr/FileCsv';

import type {
  ProfileProductImportAction,
  ProfileProductImportPreview,
  ProfileProductImportResult,
  ProfileProductImportRow,
} from '@/lib/products/api-client';
import {
  applyProfileProductCsv,
  downloadProfileProductCsvTemplate,
  previewProfileProductCsv,
} from '@/lib/products/api-client';
import { toast } from '@/components/core/toaster';

import type { ProductLanguage } from './profile-product-copy';
import { interpolate, productCopy } from './profile-product-copy';

interface ProfileProductImportDialogProps {
  language: ProductLanguage;
  onClose: () => void;
  onImported: (result: ProfileProductImportResult) => Promise<void>;
  open: boolean;
  profileId: number | string;
}

export function ProfileProductImportDialog({
  language,
  onClose,
  onImported,
  open,
  profileId,
}: ProfileProductImportDialogProps): React.JSX.Element {
  const copy = productCopy[language];
  const [actions, setActions] = React.useState<Record<number, ProfileProductImportAction>>({});
  const [error, setError] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [preview, setPreview] = React.useState<ProfileProductImportPreview | null>(null);

  React.useEffect(() => {
    if (open) {
      setActions({});
      setError('');
      setFile(null);
      setPreview(null);
    }
  }, [open]);

  const handleFileSelected = React.useCallback(
    async (nextFile: File | null): Promise<void> => {
      if (!nextFile) {
        return;
      }

      setFile(nextFile);
      setPreview(null);
      setActions({});
      setIsPreviewing(true);
      setError('');

      try {
        const nextPreview = await previewProfileProductCsv(profileId, nextFile);
        setPreview(nextPreview);
        setActions(initialActions(nextPreview));
      } catch (err) {
        setError(getErrorMessage(err, copy.errors.generic));
      } finally {
        setIsPreviewing(false);
      }
    },
    [copy.errors.generic, profileId]
  );

  const handleApply = React.useCallback(async (): Promise<void> => {
    if (!preview) {
      return;
    }

    setIsApplying(true);
    setError('');

    try {
      const result = await applyProfileProductCsv(
        profileId,
        preview.id,
        preview.rows.map((row) => ({ action: actions[row.id] ?? 'skip', id: row.id }))
      );
      toast.success(
        interpolate(copy.toasts.imported, {
          created: result.created,
          replaced: result.replaced,
          skipped: result.skipped,
        })
      );
      await onImported(result);
    } catch (err) {
      setError(getErrorMessage(err, copy.errors.generic));
    } finally {
      setIsApplying(false);
    }
  }, [actions, copy.errors.generic, copy.toasts.imported, onImported, preview, profileId]);

  const selectedImports = Object.values(actions).filter((action) => action === 'import').length;
  const availableSlots = preview?.summary.available_slots ?? 0;
  const busy = isApplying || isPreviewing;

  return (
    <Dialog fullWidth maxWidth="md" onClose={busy ? undefined : onClose} open={open}>
      <DialogTitle>{copy.import.title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error ? <Alert color="error">{error}</Alert> : null}
          <Alert color="info">{copy.import.requirements}</Alert>
          <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
            <Button
              aria-busy={isPreviewing}
              component="label"
              disabled={busy}
              startIcon={isPreviewing ? <CircularProgress size={16} /> : <FileCsvIcon />}
              variant="outlined"
            >
              {file?.name ?? copy.import.choose}
              <input
                accept=".csv,text/csv"
                hidden
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  event.target.value = '';
                  void handleFileSelected(nextFile);
                }}
                type="file"
              />
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                downloadProfileProductCsvTemplate(profileId).catch((err) => {
                  setError(getErrorMessage(err, copy.errors.generic));
                });
              }}
              startIcon={<DownloadSimpleIcon />}
            >
              {copy.actions.downloadTemplate}
            </Button>
          </Stack>

          {preview ? (
            <React.Fragment>
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {interpolate(copy.import.summary, {
                    duplicates: preview.duplicate_rows,
                    invalid: preview.invalid_rows,
                    valid: preview.valid_rows,
                  })}
                </Typography>
                <Alert color={preview.valid_rows > availableSlots ? 'warning' : 'info'}>
                  {interpolate(copy.import.available, { count: availableSlots })}{' '}
                  {preview.valid_rows > availableSlots
                    ? interpolate(copy.import.limit, { max: preview.summary.max_products })
                    : copy.import.help}
                </Alert>
              </Stack>

              <Stack spacing={1.25}>
                {preview.rows.map((row) => {
                  const action = actions[row.id] ?? 'skip';
                  const disableImport = action !== 'import' && selectedImports >= availableSlots;

                  return (
                    <Box
                      key={row.id}
                      sx={{
                        alignItems: { sm: 'center' },
                        border: '1px solid var(--mui-palette-divider)',
                        borderRadius: 1,
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: { sm: '64px minmax(0, 1fr) 190px', xs: '1fr' },
                        p: 1.5,
                      }}
                    >
                      <Box
                        alt=""
                        component="img"
                        src={row.payload.image_url}
                        sx={{
                          aspectRatio: '1',
                          bgcolor: 'background.level1',
                          borderRadius: 1,
                          objectFit: 'cover',
                          width: 64,
                        }}
                      />
                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography noWrap variant="subtitle2">
                            {row.payload.name || interpolate(copy.import.row, { row: row.row_number })}
                          </Typography>
                          <RowStatusChip copy={copy} row={row} />
                        </Stack>
                        <Typography color="text.secondary" noWrap variant="body2">
                          {rowDescription(row, copy)}
                        </Typography>
                      </Stack>
                      <FormControl disabled={row.status === 'invalid'} size="small">
                        <Select
                          inputProps={{
                            'aria-label': interpolate(copy.import.row, { row: row.row_number }),
                          }}
                          onChange={(event) => {
                            setActions((current) => ({
                              ...current,
                              [row.id]: event.target.value as ProfileProductImportAction,
                            }));
                          }}
                          value={action}
                        >
                          {row.status === 'duplicate_existing' ? (
                            <MenuItem value="replace">{copy.import.actions.replace}</MenuItem>
                          ) : (
                            <MenuItem disabled={disableImport} value="import">
                              {copy.import.actions.import}
                            </MenuItem>
                          )}
                          <MenuItem value="skip">{copy.import.actions.skip}</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  );
                })}
              </Stack>
            </React.Fragment>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          {copy.actions.cancel}
        </Button>
        <Button disabled={!preview || busy} onClick={handleApply} variant="contained">
          {copy.actions.apply}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function initialActions(preview: ProfileProductImportPreview): Record<number, ProfileProductImportAction> {
  let slots = preview.summary.available_slots;

  return Object.fromEntries(
    preview.rows.map((row): [number, ProfileProductImportAction] => {
      if (row.status === 'valid' && slots > 0) {
        slots--;
        return [row.id, 'import'];
      }

      return [row.id, 'skip'];
    })
  );
}

function RowStatusChip({
  copy,
  row,
}: {
  copy: (typeof productCopy)[ProductLanguage];
  row: ProfileProductImportRow;
}): React.JSX.Element {
  if (row.status === 'valid') {
    return <Chip color="success" label={copy.import.actions.import} size="small" variant="outlined" />;
  }

  if (row.status === 'invalid') {
    return <Chip color="error" label={copy.import.invalid} size="small" />;
  }

  return <Chip color="warning" label={copy.import.conflict} size="small" />;
}

function rowDescription(row: ProfileProductImportRow, copy: (typeof productCopy)[ProductLanguage]): string {
  if (row.status === 'duplicate_existing' && row.duplicate_product) {
    return interpolate(copy.import.duplicateExisting, { name: row.duplicate_product.name });
  }

  if (row.status === 'duplicate_file') {
    return interpolate(copy.import.duplicateFile, { row: row.duplicate_row_number ?? '-' });
  }

  if (row.status === 'invalid') {
    return (
      Object.values(row.errors ?? {})
        .flat()
        .join(' · ') || copy.import.invalid
    );
  }

  return row.payload.description;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

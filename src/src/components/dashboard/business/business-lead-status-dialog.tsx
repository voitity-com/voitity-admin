import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import type { BusinessLeadStatus } from '@/lib/business/api-client';

interface BusinessLeadStatusDialogProps {
  currentStatus: BusinessLeadStatus;
  loading: boolean;
  nextStatus: BusinessLeadStatus;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
  open: boolean;
}

interface StatusFormValues {
  note: string;
}

export function BusinessLeadStatusDialog({ currentStatus, loading, nextStatus, onClose, onConfirm, open }: BusinessLeadStatusDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const schema = React.useMemo(() => zod.object({ note: zod.string().max(2000, t('dashboard.business.leads.statusChange.noteMax')) }), [t]);
  const { control, formState, handleSubmit, reset } = useForm<StatusFormValues>({ defaultValues: { note: '' }, resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (open) reset({ note: '' });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    await onConfirm(values.note.trim());
  });

  return (
    <Dialog fullWidth maxWidth="sm" onClose={loading ? undefined : onClose} open={open}>
      <form onSubmit={(event) => { submit(event).catch(() => undefined); }}>
        <DialogTitle>{t('dashboard.business.leads.statusChange.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('dashboard.business.leads.statusChange.description', {
              from: t(`dashboard.business.leads.status.${currentStatus}`),
              to: t(`dashboard.business.leads.status.${nextStatus}`),
            })}
          </DialogContentText>
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <TextField
                {...field}
                error={Boolean(formState.errors.note)}
                fullWidth
                helperText={formState.errors.note?.message ?? t('dashboard.business.leads.statusChange.noteHelp')}
                label={t('dashboard.business.leads.statusChange.observations')}
                minRows={4}
                multiline
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={loading} onClick={onClose}>{t('dashboard.business.actions.cancel')}</Button>
          <Button disabled={loading} type="submit" variant="contained">{t('dashboard.business.leads.statusChange.confirm')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

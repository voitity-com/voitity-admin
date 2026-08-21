import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import type { BusinessPayload } from '@/lib/business/api-client';

interface Values {
  description: string;
  name: string;
}

export function BusinessFormDialog({ onClose, onSubmit, open }: { onClose: () => void; onSubmit: (payload: BusinessPayload) => Promise<void>; open: boolean }): React.JSX.Element {
  const { t } = useTranslation();
  const schema = React.useMemo(() => zod.object({
    name: zod.string().trim().min(1, t('dashboard.business.validation.nameRequired')).max(150),
    description: zod.string().trim().max(10000),
  }), [t]);
  const { control, formState: { errors, isSubmitting }, handleSubmit, reset } = useForm<Values>({ defaultValues: { description: '', name: '' }, resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!open) reset({ description: '', name: '' });
  }, [open, reset]);

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <form onSubmit={handleSubmit(async (values) => { await onSubmit({ description: values.description, name: values.name.trim() }); })}>
        <DialogTitle>{t('dashboard.business.form.createTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Controller control={control} name="name" render={({ field }) => (
              <FormControl error={Boolean(errors.name)}>
                <InputLabel>{t('dashboard.business.fields.name')}</InputLabel>
                <OutlinedInput {...field} label={t('dashboard.business.fields.name')} />
                {errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}
              </FormControl>
            )} />
            <Controller control={control} name="description" render={({ field }) => (
              <FormControl error={Boolean(errors.description)}>
                <InputLabel>{t('dashboard.business.fields.description')}</InputLabel>
                <OutlinedInput {...field} label={t('dashboard.business.fields.description')} multiline rows={4} />
                {errors.description ? <FormHelperText>{errors.description.message}</FormHelperText> : null}
              </FormControl>
            )} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="secondary" disabled={isSubmitting} onClick={onClose}>{t('dashboard.business.actions.cancel')}</Button>
          <Button disabled={isSubmitting} type="submit" variant="contained">{t('dashboard.business.actions.create')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';

interface Values {
  active: boolean;
  alias: string;
  description: string;
  genre: string;
  name: string;
  personality: string;
}

function createSchema(t: (key: string) => string): zod.ZodType<Values> {
  return zod.object({
    active: zod.boolean(),
    alias: zod.string().max(100, t('dashboard.profiles.form.validation.aliasMax')),
    description: zod.string().min(1, t('dashboard.profiles.form.validation.descriptionRequired')).max(500),
    genre: zod.string().min(1, t('dashboard.profiles.form.validation.genreRequired')).max(10),
    name: zod.string().min(1, t('dashboard.profiles.form.validation.nameRequired')).max(100),
    personality: zod.string().min(1, t('dashboard.profiles.form.validation.personalityRequired')).max(200),
  });
}

function getDefaultValues(profile?: null | Profile): Values {
  return {
    active: profile?.active ?? true,
    alias: profile?.alias ?? '',
    description: profile?.description ?? '',
    genre: profile?.genre ?? '',
    name: profile?.name ?? '',
    personality: profile?.personality ?? '',
  };
}

export interface ProfileFormDialogProps {
  onClose?: () => void;
  onSubmit: (payload: ProfilePayload) => Promise<void>;
  open?: boolean;
  profile?: null | Profile;
}

export function ProfileFormDialog({
  onClose,
  onSubmit,
  open = false,
  profile,
}: ProfileFormDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const schema = React.useMemo(() => createSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: getDefaultValues(profile), resolver: zodResolver(schema) });

  React.useEffect(() => {
    reset(getDefaultValues(profile));
  }, [profile, reset, open]);

  const handleFormSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      await onSubmit(toPayload(values));
    },
    [onSubmit]
  );

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5">
            {profile ? t('dashboard.profiles.form.editTitle') : t('dashboard.profiles.form.createTitle')}
          </Typography>
        </Box>
        <DialogContent>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <FormControl error={Boolean(errors.name)}>
                  <InputLabel>{t('dashboard.profiles.fields.name')}</InputLabel>
                  <OutlinedInput {...field} label={t('dashboard.profiles.fields.name')} />
                  {errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="alias"
              render={({ field }) => (
                <FormControl error={Boolean(errors.alias)}>
                  <InputLabel>{t('dashboard.profiles.fields.alias')}</InputLabel>
                  <OutlinedInput {...field} label={t('dashboard.profiles.fields.alias')} />
                  {errors.alias ? <FormHelperText>{errors.alias.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <FormControl error={Boolean(errors.description)}>
                  <InputLabel>{t('dashboard.profiles.fields.description')}</InputLabel>
                  <OutlinedInput {...field} label={t('dashboard.profiles.fields.description')} multiline rows={3} />
                  {errors.description ? <FormHelperText>{errors.description.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="genre"
              render={({ field }) => (
                <FormControl error={Boolean(errors.genre)}>
                  <InputLabel>{t('dashboard.profiles.fields.genre')}</InputLabel>
                  <OutlinedInput {...field} label={t('dashboard.profiles.fields.genre')} />
                  {errors.genre ? <FormHelperText>{errors.genre.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="personality"
              render={({ field }) => (
                <FormControl error={Boolean(errors.personality)}>
                  <InputLabel>{t('dashboard.profiles.fields.personality')}</InputLabel>
                  <OutlinedInput {...field} label={t('dashboard.profiles.fields.personality')} />
                  {errors.personality ? <FormHelperText>{errors.personality.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => {
                        field.onChange(event.target.checked);
                      }}
                    />
                  }
                  label={t('dashboard.profiles.fields.active')}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="secondary" disabled={isSubmitting} onClick={onClose}>
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          <Button disabled={isSubmitting} type="submit" variant="contained">
            {profile ? t('dashboard.profiles.actions.saveChanges') : t('dashboard.profiles.actions.createProfile')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function toPayload(values: Values): ProfilePayload {
  return {
    ...values,
    alias: values.alias.trim() || null,
  };
}

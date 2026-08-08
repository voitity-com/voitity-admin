'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { getBrowserLanguage, getSupportedLanguage, supportedLanguages } from '@/lib/i18n';
import { applyProfileFormApiErrors } from '@/lib/profiles/profile-form-errors';
import { isProfileGenre, normalizeProfileGenre, profileGenreValues, toProfileGenre } from '@/lib/profiles/profile-genre';

interface Values {
  alias: string;
  description: string;
  genre: string;
  locale: string;
  name: string;
  personality: string;
}

function createSchema(t: (key: string) => string): zod.ZodType<Values> {
  return zod.object({
    alias: zod
      .string()
      .trim()
      .min(1, t('dashboard.profiles.form.validation.aliasRequired'))
      .max(100, t('dashboard.profiles.form.validation.aliasMax')),
    description: zod.string().trim().min(1, t('dashboard.profiles.form.validation.descriptionRequired')).max(500),
    genre: zod
      .string()
      .min(1, t('dashboard.profiles.form.validation.genreRequired'))
      .refine(isProfileGenre, t('dashboard.profiles.form.validation.genreInvalid')),
    locale: zod
      .string()
      .min(1, t('dashboard.profiles.form.validation.localeRequired'))
      .refine((value) => supportedLanguages.includes(value as (typeof supportedLanguages)[number]), t('dashboard.profiles.form.validation.localeInvalid')),
    name: zod.string().min(1, t('dashboard.profiles.form.validation.nameRequired')).max(100),
    personality: zod.string().min(1, t('dashboard.profiles.form.validation.personalityRequired')).max(200),
  });
}

function getDefaultValues(profile?: null | Profile): Values {
  return {
    alias: profile?.alias ?? '',
    description: profile?.description ?? '',
    genre: normalizeProfileGenre(profile?.genre),
    locale: getSupportedLanguage(profile?.locale ?? getBrowserLanguage()),
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: getDefaultValues(profile), resolver: zodResolver(schema) });

  React.useEffect(() => {
    reset(getDefaultValues(profile));
  }, [profile, reset, open]);

  const handleFormSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      try {
        await onSubmit(toPayload(values));
      } catch (err) {
        if (!applyProfileFormApiErrors<Values>(err, setError)) {
          throw err;
        }
      }
    },
    [onSubmit, setError]
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
                  <InputLabel id="profile-form-genre-label">{t('dashboard.profiles.fields.genre')}</InputLabel>
                  <Select
                    {...field}
                    label={t('dashboard.profiles.fields.genre')}
                    labelId="profile-form-genre-label"
                    value={normalizeProfileGenre(field.value)}
                  >
                    {profileGenreValues.map((value) => (
                      <MenuItem key={value} value={value}>
                        {t(`dashboard.profiles.genreOptions.${value}`)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.genre ? <FormHelperText>{errors.genre.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="locale"
              render={({ field }) => (
                <FormControl error={Boolean(errors.locale)}>
                  <InputLabel id="profile-form-locale-label">{t('dashboard.profiles.fields.locale')}</InputLabel>
                  <Select
                    {...field}
                    label={t('dashboard.profiles.fields.locale')}
                    labelId="profile-form-locale-label"
                    value={getSupportedLanguage(field.value)}
                  >
                    {supportedLanguages.map((value) => (
                      <MenuItem key={value} value={value}>
                        {t(`languages.${value}`)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.locale ? <FormHelperText>{errors.locale.message}</FormHelperText> : null}
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
    alias: values.alias.trim(),
    description: values.description,
    genre: toProfileGenre(values.genre),
    locale: getSupportedLanguage(values.locale),
    name: values.name,
    personality: values.personality,
  };
}

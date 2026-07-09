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

import type { Profile, ProfilePayload, ProfileProfession } from '@/lib/profiles/api-client';
import { listProfileProfessions } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { isProfileGenre, normalizeProfileGenre, profileGenreValues, toProfileGenre } from '@/lib/profiles/profile-genre';

interface Values {
  alias: string;
  description: string;
  genre: string;
  name: string;
  personality: string;
  professionKey: string;
}

function createSchema(t: (key: string) => string): zod.ZodType<Values> {
  return zod.object({
    alias: zod.string().max(100, t('dashboard.profiles.form.validation.aliasMax')),
    description: zod.string().min(1, t('dashboard.profiles.form.validation.descriptionRequired')).max(500),
    genre: zod
      .string()
      .min(1, t('dashboard.profiles.form.validation.genreRequired'))
      .refine(isProfileGenre, t('dashboard.profiles.form.validation.genreInvalid')),
    name: zod.string().min(1, t('dashboard.profiles.form.validation.nameRequired')).max(100),
    personality: zod.string().min(1, t('dashboard.profiles.form.validation.personalityRequired')).max(200),
    professionKey: zod.string().min(1, t('dashboard.profiles.form.validation.professionRequired')).max(80),
  });
}

const fallbackProfessions = [{ key: 'custom', label: 'Custom profile' }] satisfies ProfileProfession[];

function getDefaultValues(profile?: null | Profile): Values {
  return {
    alias: profile?.alias ?? '',
    description: profile?.description ?? '',
    genre: normalizeProfileGenre(profile?.genre),
    name: profile?.name ?? '',
    personality: profile?.personality ?? '',
    professionKey: profile?.profession_key ?? 'custom',
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
  const [professions, setProfessions] = React.useState<ProfileProfession[]>(fallbackProfessions);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: getDefaultValues(profile), resolver: zodResolver(schema) });

  React.useEffect(() => {
    reset(getDefaultValues(profile));
  }, [profile, reset, open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    listProfileProfessions()
      .then((catalog) => {
        setProfessions(catalog.professions.length > 0 ? catalog.professions : fallbackProfessions);
      })
      .catch((err) => {
        logger.error(err);
        setProfessions(fallbackProfessions);
      });
  }, [open]);

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
              name="professionKey"
              render={({ field }) => (
                <FormControl error={Boolean(errors.professionKey)}>
                  <InputLabel id="profile-form-profession-label">{t('dashboard.profiles.fields.profession')}</InputLabel>
                  <Select
                    {...field}
                    label={t('dashboard.profiles.fields.profession')}
                    labelId="profile-form-profession-label"
                  >
                    {professions.map((profession) => (
                      <MenuItem key={profession.key} value={profession.key}>
                        {profession.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.professionKey ? <FormHelperText>{errors.professionKey.message}</FormHelperText> : null}
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
    alias: values.alias.trim() || null,
    description: values.description,
    genre: toProfileGenre(values.genre),
    name: values.name,
    personality: values.personality,
    profession_key: values.professionKey,
  };
}

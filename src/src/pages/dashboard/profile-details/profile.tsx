'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { Helmet } from 'react-helmet-async';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { getProfile, updateProfile } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Profile | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

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

const defaultValues = {
  active: true,
  alias: '',
  description: '',
  genre: '',
  name: '',
  personality: '',
} satisfies Values;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const schema = React.useMemo(() => createSchema(t), [t]);
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  const loadProfile = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const nextProfile = await getProfile(profileId);
      setProfile(nextProfile);
      reset(toValues(nextProfile));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, reset, t]);

  React.useEffect(() => {
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      const payload: ProfilePayload = toPayload(values);

      try {
        const updatedProfile = await updateProfile(profileId, payload);
        setProfile(updatedProfile);
        reset(toValues(updatedProfile));
        toast.success(t('dashboard.profiles.detail.profile.toasts.updated'));
      } catch (err) {
        toast.error(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
        throw err;
      }
    },
    [profileId, reset, t]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            subheader={profile ? `ID ${profile.id}` : t('dashboard.profiles.detail.profile.subheader')}
            title={profile?.name ?? t('dashboard.profiles.detail.profile.title')}
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent>
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
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 3, pt: 0 }}>
                <Button disabled={isSubmitting} type="submit" variant="contained">
                  {t('dashboard.profiles.actions.saveChanges')}
                </Button>
              </CardActions>
            </form>
          )}
        </Card>
      </Stack>
    </React.Fragment>
  );
}

function toValues(profile: Profile): Values {
  return {
    active: profile.active ?? true,
    alias: profile.alias ?? '',
    description: profile.description ?? '',
    genre: profile.genre ?? '',
    name: profile.name ?? '',
    personality: profile.personality ?? '',
  };
}

function toPayload(values: Values): ProfilePayload {
  return {
    ...values,
    alias: values.alias.trim() || null,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

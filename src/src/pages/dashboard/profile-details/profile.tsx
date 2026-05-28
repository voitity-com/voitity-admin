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
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { getProfile, updateProfile } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Profile | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

const schema = zod.object({
  active: zod.boolean(),
  description: zod.string().min(1, 'Description is required').max(500),
  genre: zod.string().min(1, 'Genre is required').max(10),
  name: zod.string().min(1, 'Name is required').max(100),
  personality: zod.string().min(1, 'Personality is required').max(200),
});

type Values = zod.infer<typeof schema>;

const defaultValues = {
  active: true,
  description: '',
  genre: '',
  name: '',
  personality: '',
} satisfies Values;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
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
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, reset]);

  React.useEffect(() => {
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      const payload: ProfilePayload = values;

      try {
        const updatedProfile = await updateProfile(profileId, payload);
        setProfile(updatedProfile);
        reset(toValues(updatedProfile));
        toast.success('Profile updated');
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    [profileId, reset]
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
            subheader={profile ? `ID ${profile.id}` : 'Update profile information'}
            title={profile?.name ?? 'Profile'}
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
                        <InputLabel>Name</InputLabel>
                        <OutlinedInput {...field} label="Name" />
                        {errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}
                      </FormControl>
                    )}
                  />
                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <FormControl error={Boolean(errors.description)}>
                        <InputLabel>Description</InputLabel>
                        <OutlinedInput {...field} label="Description" multiline rows={3} />
                        {errors.description ? <FormHelperText>{errors.description.message}</FormHelperText> : null}
                      </FormControl>
                    )}
                  />
                  <Controller
                    control={control}
                    name="genre"
                    render={({ field }) => (
                      <FormControl error={Boolean(errors.genre)}>
                        <InputLabel>Genre</InputLabel>
                        <OutlinedInput {...field} label="Genre" />
                        {errors.genre ? <FormHelperText>{errors.genre.message}</FormHelperText> : null}
                      </FormControl>
                    )}
                  />
                  <Controller
                    control={control}
                    name="personality"
                    render={({ field }) => (
                      <FormControl error={Boolean(errors.personality)}>
                        <InputLabel>Personality</InputLabel>
                        <OutlinedInput {...field} label="Personality" />
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
                        label="Active"
                      />
                    )}
                  />
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 3, pt: 0 }}>
                <Button disabled={isSubmitting} type="submit" variant="contained">
                  Save changes
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
    description: profile.description ?? '',
    genre: profile.genre ?? '',
    name: profile.name ?? '',
    personality: profile.personality ?? '',
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

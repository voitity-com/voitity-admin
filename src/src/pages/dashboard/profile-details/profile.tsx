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
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { Helmet } from 'react-helmet-async';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile, ProfileAudioTranscriptionField, ProfilePayload } from '@/lib/profiles/api-client';
import { getProfile, updateProfile } from '@/lib/profiles/api-client';
import { isProfileGenre, normalizeProfileGenre, profileGenreValues, toProfileGenre } from '@/lib/profiles/profile-genre';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';
import { ProfileAudioTranscriptionDialog } from '@/components/dashboard/profiles/profile-audio-transcription-dialog';

const metadata = { title: `Profile | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const profileTextFieldLimits = {
  description: { max: 500, min: 1 },
  personality: { max: 200, min: 1 },
} satisfies Record<ProfileAudioTranscriptionField, { max: number; min: number }>;

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
    description: zod
      .string()
      .min(profileTextFieldLimits.description.min, t('dashboard.profiles.form.validation.descriptionRequired'))
      .max(profileTextFieldLimits.description.max),
    genre: zod
      .string()
      .min(1, t('dashboard.profiles.form.validation.genreRequired'))
      .refine(isProfileGenre, t('dashboard.profiles.form.validation.genreInvalid')),
    name: zod.string().min(1, t('dashboard.profiles.form.validation.nameRequired')).max(100),
    personality: zod
      .string()
      .min(profileTextFieldLimits.personality.min, t('dashboard.profiles.form.validation.personalityRequired'))
      .max(profileTextFieldLimits.personality.max),
  });
}

const defaultValues = {
  active: true,
  alias: '',
  description: '',
  genre: 'na',
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
  const [audioField, setAudioField] = React.useState<ProfileAudioTranscriptionField | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues, mode: 'onChange', resolver: zodResolver(schema) });
  const descriptionValue = watch('description');
  const personalityValue = watch('personality');
  const activeAudioField = audioField ?? 'description';
  const activeAudioFieldLabel = t(`dashboard.profiles.fields.${activeAudioField}`);
  const activeAudioFieldValue = activeAudioField === 'description' ? descriptionValue : personalityValue;
  const activeAudioFieldLimits = profileTextFieldLimits[activeAudioField];

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
                    render={({ field }) => {
                      const limitState = getProfileFieldLimitState(field.value, profileTextFieldLimits.description, t);

                      return (
                        <FormControl error={Boolean(errors.description) || limitState.hasError}>
                          <InputLabel>{t('dashboard.profiles.fields.description')}</InputLabel>
                          <OutlinedInput
                            {...field}
                            endAdornment={
                              <AudioInputAdornment
                                align="start"
                                label={t('dashboard.profiles.detail.profile.audio.open', {
                                  field: t('dashboard.profiles.fields.description'),
                                })}
                                onClick={() => {
                                  setAudioField('description');
                                }}
                              />
                            }
                            label={t('dashboard.profiles.fields.description')}
                            multiline
                            rows={3}
                          />
                          <FormHelperText>{limitState.message}</FormHelperText>
                        </FormControl>
                      );
                    }}
                  />
                  <Controller
                    control={control}
                    name="genre"
                    render={({ field }) => (
                      <FormControl error={Boolean(errors.genre)}>
                        <InputLabel id="profile-genre-label">{t('dashboard.profiles.fields.genre')}</InputLabel>
                        <Select
                          {...field}
                          label={t('dashboard.profiles.fields.genre')}
                          labelId="profile-genre-label"
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
                    name="personality"
                    render={({ field }) => {
                      const limitState = getProfileFieldLimitState(field.value, profileTextFieldLimits.personality, t);

                      return (
                        <FormControl error={Boolean(errors.personality) || limitState.hasError}>
                          <InputLabel>{t('dashboard.profiles.fields.personality')}</InputLabel>
                          <OutlinedInput
                            {...field}
                            endAdornment={
                              <AudioInputAdornment
                                label={t('dashboard.profiles.detail.profile.audio.open', {
                                  field: t('dashboard.profiles.fields.personality'),
                                })}
                                onClick={() => {
                                  setAudioField('personality');
                                }}
                              />
                            }
                            label={t('dashboard.profiles.fields.personality')}
                          />
                          <FormHelperText>{limitState.message}</FormHelperText>
                        </FormControl>
                      );
                    }}
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
      <ProfileAudioTranscriptionDialog
        currentValue={activeAudioFieldValue}
        field={activeAudioField}
        fieldLabel={activeAudioFieldLabel}
        maxLength={activeAudioFieldLimits.max}
        minLength={activeAudioFieldLimits.min}
        onApply={(value) => {
          if (!audioField) {
            return;
          }

          setValue(audioField, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }}
        onClose={() => {
          setAudioField(null);
        }}
        open={audioField !== null}
        profileId={profileId}
      />
    </React.Fragment>
  );
}

function AudioInputAdornment({
  align = 'center',
  label,
  onClick,
}: {
  align?: 'center' | 'start';
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <InputAdornment
      position="end"
      sx={
        align === 'start'
          ? { alignSelf: 'flex-start', mt: 0.5 }
          : { alignSelf: 'center', height: '100%', maxHeight: 'none' }
      }
    >
      <Tooltip title={label}>
        <IconButton aria-label={label} edge="end" onClick={onClick}>
          <MicrophoneIcon />
        </IconButton>
      </Tooltip>
    </InputAdornment>
  );
}

function getProfileFieldLimitState(
  value: string,
  limits: { max: number; min: number },
  t: (key: string, options?: Record<string, unknown>) => string
): { hasError: boolean; message: string } {
  const characters = Array.from(value).length;

  if (characters < limits.min) {
    return {
      hasError: true,
      message: t('dashboard.profiles.detail.profile.fieldLimits.belowMinimum', {
        count: limits.min - characters,
        min: limits.min,
      }),
    };
  }

  if (characters > limits.max) {
    return {
      hasError: true,
      message: t('dashboard.profiles.detail.profile.fieldLimits.exceedsMaximum', {
        count: characters - limits.max,
        max: limits.max,
      }),
    };
  }

  return {
    hasError: false,
    message: t('dashboard.profiles.detail.profile.fieldLimits.valid', {
      count: characters,
      max: limits.max,
      min: limits.min,
    }),
  };
}

function toValues(profile: Profile): Values {
  return {
    active: profile.active ?? true,
    alias: profile.alias ?? '',
    description: profile.description ?? '',
    genre: normalizeProfileGenre(profile.genre),
    name: profile.name ?? '',
    personality: profile.personality ?? '',
  };
}

function toPayload(values: Values): ProfilePayload {
  return {
    active: values.active,
    alias: values.alias.trim() || null,
    description: values.description,
    genre: toProfileGenre(values.genre),
    name: values.name,
    personality: values.personality,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

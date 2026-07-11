'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { XCircle as XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { Helmet } from 'react-helmet-async';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile, ProfileAudioTranscriptionField, ProfilePayload, ProfileProfession } from '@/lib/profiles/api-client';
import { getProfile, listProfileProfessions, updateProfile } from '@/lib/profiles/api-client';
import { applyProfileFormApiErrors } from '@/lib/profiles/profile-form-errors';
import { isProfileGenre, normalizeProfileGenre, profileGenreValues, toProfileGenre } from '@/lib/profiles/profile-genre';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';
import { ProfileAudioTranscriptionDialog } from '@/components/dashboard/profiles/profile-audio-transcription-dialog';

const metadata = { title: `Profile | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const defaultProfileTextFieldLimits = {
  description: { max: 500, min: 1 },
  personality: { max: 200, min: 1 },
} satisfies Record<ProfileAudioTranscriptionField, { max: number; min: number }>;

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
    alias: zod
      .string()
      .trim()
      .min(1, t('dashboard.profiles.form.validation.aliasRequired'))
      .max(100, t('dashboard.profiles.form.validation.aliasMax')),
    description: zod
      .string()
      .trim()
      .min(defaultProfileTextFieldLimits.description.min, t('dashboard.profiles.form.validation.descriptionRequired'))
      .max(defaultProfileTextFieldLimits.description.max),
    genre: zod
      .string()
      .min(1, t('dashboard.profiles.form.validation.genreRequired'))
      .refine(isProfileGenre, t('dashboard.profiles.form.validation.genreInvalid')),
    name: zod.string().min(1, t('dashboard.profiles.form.validation.nameRequired')).max(100),
    personality: zod
      .string()
      .min(defaultProfileTextFieldLimits.personality.min, t('dashboard.profiles.form.validation.personalityRequired'))
      .max(defaultProfileTextFieldLimits.personality.max),
    professionKey: zod.string().min(1, t('dashboard.profiles.form.validation.professionRequired')).max(80),
  });
}

const defaultValues = {
  alias: '',
  description: '',
  genre: 'na',
  name: '',
  personality: '',
  professionKey: 'custom',
} satisfies Values;

const fallbackProfessions = [{ key: 'custom', label: 'Custom profile' }] satisfies ProfileProfession[];
const profileStatusValues = ['draft', 'ready', 'published', 'hidden'] as const;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const schema = React.useMemo(() => createSchema(t), [t]);
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const [audioField, setAudioField] = React.useState<ProfileAudioTranscriptionField | null>(null);
  const [professions, setProfessions] = React.useState<ProfileProfession[]>(fallbackProfessions);

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues, mode: 'onChange', resolver: zodResolver(schema) });
  const descriptionValue = watch('description');
  const personalityValue = watch('personality');
  const selectedProfessionKey = watch('professionKey');
  const textFieldLimits = React.useMemo(
    () => getProfileTextFieldLimits(selectedProfessionKey, professions),
    [professions, selectedProfessionKey]
  );
  const activeAudioField = audioField ?? 'description';
  const activeAudioFieldLabel = t(`dashboard.profiles.fields.${activeAudioField}`);
  const activeAudioFieldValue = activeAudioField === 'description' ? descriptionValue : personalityValue;
  const activeAudioFieldLimits = textFieldLimits[activeAudioField];

  const loadProfile = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const [nextProfile, catalog] = await Promise.all([
        getProfile(profileId),
        listProfileProfessions().catch((err) => {
          logger.error(err);
          return { default: 'custom', professions: fallbackProfessions };
        }),
      ]);

      setProfessions(catalog.professions.length > 0 ? catalog.professions : fallbackProfessions);
      setProfile(nextProfile);
      reset(toValues(nextProfile));
      setIsEditing(false);
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

  React.useEffect(() => {
    const handlePublicationChange = (): void => {
      loadProfile().catch((err) => {
        logger.error(err);
      });
    };

    window.addEventListener('profile-publication:changed', handlePublicationChange);

    return () => {
      window.removeEventListener('profile-publication:changed', handlePublicationChange);
    };
  }, [loadProfile]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      const payload: ProfilePayload = toPayload(values);

      try {
        const updatedProfile = await updateProfile(profileId, payload);
        setProfile(updatedProfile);
        reset(toValues(updatedProfile));
        setIsEditing(false);
        window.dispatchEvent(new Event('profile-publication:refresh'));
        toast.success(t('dashboard.profiles.detail.profile.toasts.updated'));
      } catch (err) {
        if (applyProfileFormApiErrors<Values>(err, setFormError)) {
          return;
        }

        toast.error(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
        throw err;
      }
    },
    [profileId, reset, setFormError, t]
  );

  const handleCancelEdit = React.useCallback((): void => {
    if (profile) {
      reset(toValues(profile));
    }

    setIsEditing(false);
  }, [profile, reset]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        {isLoading ? (
          <Card>
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          </Card>
        ) : profile && !isEditing ? (
          <ProfileOverview
            language={language}
            onEdit={() => {
              setIsEditing(true);
            }}
            professions={professions}
            profile={profile}
            t={t}
          />
        ) : (
          <Card>
            <CardHeader
              action={
                <Button disabled={isSubmitting} onClick={handleCancelEdit}>
                  {t('dashboard.profiles.actions.cancel')}
                </Button>
              }
              subheader={profile ? `ID ${profile.id}` : t('dashboard.profiles.detail.profile.subheader')}
              title={t('dashboard.profiles.form.editTitle')}
            />
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
                      const limitState = getProfileFieldLimitState(field.value, textFieldLimits.description, t);

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
                    name="professionKey"
                    render={({ field }) => (
                      <FormControl error={Boolean(errors.professionKey)}>
                        <InputLabel id="profile-profession-label">{t('dashboard.profiles.fields.profession')}</InputLabel>
                        <Select
                          {...field}
                          label={t('dashboard.profiles.fields.profession')}
                          labelId="profile-profession-label"
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
                    render={({ field }) => {
                      const limitState = getProfileFieldLimitState(field.value, textFieldLimits.personality, t);

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
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 3, pt: 0 }}>
                <Button disabled={isSubmitting} onClick={handleCancelEdit}>
                  {t('dashboard.profiles.actions.cancel')}
                </Button>
                <Button disabled={isSubmitting} type="submit" variant="contained">
                  {t('dashboard.profiles.actions.saveChanges')}
                </Button>
              </CardActions>
            </form>
          </Card>
        )}
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

function ProfileOverview({
  language,
  onEdit,
  profile,
  professions,
  t,
}: {
  language: string;
  onEdit: () => void;
  profile: Profile;
  professions: ProfileProfession[];
  t: (key: string, options?: Record<string, unknown>) => string;
}): React.JSX.Element {
  const active = profile.active ?? false;
  const status = normalizeProfileStatus(profile.status);
  const professionLabel = getProfessionLabel(profile.profession_key, professions);
  const notProvided = t('dashboard.profiles.detail.profile.emptyValue');
  const isPublic = active && status === 'published';

  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'common.white',
            p: { md: 4, xs: 3 },
          }}
        >
          <Stack direction={{ sm: 'row', xs: 'column' }} spacing={3} sx={{ alignItems: { sm: 'center' } }}>
            <Avatar
              sx={{
                bgcolor: 'common.white',
                color: 'primary.main',
                fontSize: '1.25rem',
                fontWeight: 700,
                height: 72,
                width: 72,
              }}
            >
              {getInitials(profile.name)}
            </Avatar>
            <Stack spacing={1} sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Stack spacing={0.5}>
                <Typography color="inherit" variant="h4">
                  {profile.name}
                </Typography>
                <Typography color="rgba(255,255,255,0.78)" variant="body1">
                  {profile.alias ? `@${profile.alias}` : t('dashboard.profiles.detail.profile.aliasMissing')}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={active ? <CheckCircleIcon weight="fill" /> : <XCircleIcon weight="fill" />}
                  label={active ? t('dashboard.profiles.status.active') : t('dashboard.profiles.status.inactive')}
                  size="small"
                  sx={{ bgcolor: 'common.white', color: active ? 'success.main' : 'text.secondary' }}
                />
                <Chip
                  label={t(`dashboard.profiles.status.${status}`)}
                  size="small"
                  sx={{ bgcolor: isPublic ? 'success.light' : 'rgba(255,255,255,0.16)', color: isPublic ? 'success.contrastText' : 'common.white' }}
                />
                <Chip label={professionLabel} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }} />
                <Chip
                  label={t(`dashboard.profiles.genreOptions.${normalizeProfileGenre(profile.genre)}`)}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }}
                />
              </Stack>
            </Stack>
            <Button
              onClick={onEdit}
              startIcon={<PencilSimpleIcon />}
              sx={{
                '& .MuiButton-startIcon': { color: 'inherit' },
                '&:hover': {
                  backgroundColor: '#0f172a',
                  boxShadow: '0 12px 24px rgba(15,23,42,0.28)',
                },
                backgroundColor: '#111827',
                border: '1px solid rgba(255,255,255,0.72)',
                boxShadow: '0 8px 20px rgba(15,23,42,0.22)',
                color: '#fff',
                flex: '0 0 auto',
                fontWeight: 700,
              }}
              variant="contained"
            >
              {t('dashboard.profiles.actions.edit')}
            </Button>
          </Stack>
        </Box>
        <Stack divider={<Divider />} spacing={3} sx={{ p: { md: 4, xs: 3 } }}>
          <ProfileTextSection
            collapsible
            label={t('dashboard.profiles.fields.description')}
            prominent
            t={t}
            value={profile.description || notProvided}
          />
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { md: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', xs: '1fr' },
            }}
          >
            <ProfileAttribute label={t('dashboard.profiles.detail.profile.fields.profileId')} value={String(profile.id)} />
            <ProfileAttribute label={t('dashboard.profiles.fields.alias')} value={profile.alias ? `@${profile.alias}` : notProvided} />
            <ProfileAttribute label={t('dashboard.profiles.fields.profession')} value={professionLabel} />
            <ProfileAttribute
              label={t('dashboard.profiles.fields.genre')}
              value={t(`dashboard.profiles.genreOptions.${normalizeProfileGenre(profile.genre)}`)}
            />
            <ProfileAttribute
              label={t('dashboard.profiles.fields.status')}
              value={t(`dashboard.profiles.status.${status}`)}
            />
            <ProfileAttribute
              label={t('dashboard.profiles.detail.profile.fields.publicVisibility')}
              value={
                isPublic
                  ? t('dashboard.profiles.detail.profile.publicVisibility.public')
                  : t('dashboard.profiles.detail.profile.publicVisibility.private')
              }
            />
            <ProfileAttribute
              label={t('dashboard.profiles.fields.updated')}
              value={formatDate(profile.updated_at ?? profile.created_at, language)}
            />
          </Box>
          <ProfileTextSection
            collapsible
            label={t('dashboard.profiles.fields.personality')}
            t={t}
            value={profile.personality || notProvided}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProfileAttribute({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Box
      sx={{
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 1,
        minHeight: 88,
        p: 2,
      }}
    >
      <Stack spacing={0.75}>
        <Typography color="text.secondary" variant="caption">
          {label}
        </Typography>
        <Typography sx={{ overflowWrap: 'anywhere' }} variant="subtitle2">
          {value}
        </Typography>
      </Stack>
    </Box>
  );
}

function ProfileTextSection({
  collapsible = false,
  label,
  prominent = false,
  t,
  value,
}: {
  collapsible?: boolean;
  label: string;
  prominent?: boolean;
  t: (key: string) => string;
  value: string;
}): React.JSX.Element {
  const [expanded, setExpanded] = React.useState<boolean>(false);
  const [canExpand, setCanExpand] = React.useState<boolean>(false);
  const textRef = React.useRef<HTMLParagraphElement | null>(null);
  const shouldClamp = collapsible && !expanded;

  React.useEffect(() => {
    setExpanded(false);
  }, [value]);

  React.useEffect(() => {
    if (!collapsible || expanded) {
      return undefined;
    }

    const element = textRef.current;

    if (!element) {
      setCanExpand(false);
      return undefined;
    }

    const measureOverflow = (): void => {
      setCanExpand(element.scrollHeight > element.clientHeight + 1);
    };
    const frame = window.requestAnimationFrame(measureOverflow);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            measureOverflow();
          });

    resizeObserver?.observe(element);
    window.addEventListener('resize', measureOverflow);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureOverflow);
    };
  }, [collapsible, expanded, prominent, value]);

  return (
    <Box
      sx={{
        bgcolor: 'background.level1',
        borderRadius: 1,
        p: { md: prominent ? 3 : 2.5, xs: 2 },
      }}
    >
      <Stack spacing={1.5}>
        <Typography sx={{ fontWeight: 700 }} variant={prominent ? 'h6' : 'subtitle1'}>
          {label}
        </Typography>
        <Typography
          color="text.secondary"
          ref={textRef}
          sx={{
            fontSize: prominent ? '1.0625rem' : '1rem',
            lineHeight: prominent ? 1.75 : 1.7,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            ...(shouldClamp
              ? {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: prominent ? 5 : 4,
                }
              : {}),
          }}
          variant="body1"
        >
          {value}
        </Typography>
        {canExpand ? (
          <Button
            onClick={() => {
              setExpanded((current) => !current);
            }}
            size="small"
            sx={{ alignSelf: 'flex-start', px: 0 }}
          >
            {expanded
              ? t('dashboard.profiles.detail.profile.readLess')
              : t('dashboard.profiles.detail.profile.readMore')}
          </Button>
        ) : null}
      </Stack>
    </Box>
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

function getProfileTextFieldLimits(
  professionKey: null | string | undefined,
  professions: ProfileProfession[]
): Record<ProfileAudioTranscriptionField, { max: number; min: number }> {
  const limits = {
    description: { ...defaultProfileTextFieldLimits.description },
    personality: { ...defaultProfileTextFieldLimits.personality },
  };
  const profession = professions.find((item) => item.key === (professionKey || 'custom'));

  for (const rule of profession?.quality_rules ?? []) {
    if (String(rule.type ?? '') !== 'profile_field') {
      continue;
    }

    const field = String(rule.field ?? '');
    const minLength = Number(rule.min_length ?? 0);

    if (field === 'personality' && minLength > 0) {
      limits[field].min = Math.max(limits[field].min, minLength);
    }
  }

  return limits;
}

function toValues(profile: Profile): Values {
  return {
    alias: profile.alias ?? '',
    description: profile.description ?? '',
    genre: normalizeProfileGenre(profile.genre),
    name: profile.name ?? '',
    personality: profile.personality ?? '',
    professionKey: profile.profession_key ?? 'custom',
  };
}

function toPayload(values: Values): ProfilePayload {
  return {
    alias: values.alias.trim(),
    description: values.description,
    genre: toProfileGenre(values.genre),
    name: values.name,
    personality: values.personality,
    profession_key: values.professionKey,
  };
}

function isProfileStatus(value: string): boolean {
  return (profileStatusValues as readonly string[]).includes(value);
}

function normalizeProfileStatus(status: null | string | undefined): string {
  return isProfileStatus(status ?? '') ? String(status) : 'draft';
}

function getProfessionLabel(professionKey: null | string | undefined, professions: ProfileProfession[]): string {
  const key = professionKey || 'custom';

  return professions.find((profession) => profession.key === key)?.label ?? key;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(value: null | string | undefined, language: string): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

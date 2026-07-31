'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import { toast } from '@/components/core/toaster';
import { useUser } from '@/hooks/use-user';
import { logger } from '@/lib/default-logger';
import type { Profile } from '@/lib/profiles/api-client';
import { listProfiles } from '@/lib/profiles/api-client';
import { createSupportRequest, SupportApiError } from '@/lib/support/api-client';

interface Values {
  description: string;
  profileId: string;
}

function createSchema(t: (key: string) => string): zod.ZodType<Values> {
  return zod.object({
    description: zod
      .string()
      .trim()
      .min(10, t('dashboard.help.support.form.validation.descriptionMin'))
      .max(3000, t('dashboard.help.support.form.validation.descriptionMax')),
    profileId: zod.string(),
  });
}

function getDefaultValues(profiles: Profile[] = []): Values {
  const firstActiveProfile = profiles.find((profile) => profile.active === true);

  return {
    description: '',
    profileId: firstActiveProfile ? String(firstActiveProfile.id) : '',
  };
}

export interface SupportRequestDialogProps {
  onClose: () => void;
  open: boolean;
}

export function SupportRequestDialog({ onClose, open }: SupportRequestDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const { user } = useUser();
  const schema = React.useMemo(() => createSchema(t), [t]);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = React.useState(false);
  const [profilesError, setProfilesError] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<null | string>(null);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: getDefaultValues(),
    resolver: zodResolver(schema),
  });
  const description = useWatch({ control, name: 'description' }) ?? '';

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    let active = true;

    setProfiles([]);
    setProfilesError(false);
    setProfilesLoading(true);
    setSubmitError(null);
    reset(getDefaultValues());

    listProfiles()
      .then((nextProfiles) => {
        if (!active) {
          return;
        }

        setProfiles(nextProfiles);
        reset(getDefaultValues(nextProfiles));
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }

        logger.error(err);
        setProfilesError(true);
        reset(getDefaultValues());
      })
      .finally(() => {
        if (active) {
          setProfilesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, reset]);

  const handleFormSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setSubmitError(null);

      try {
        await createSupportRequest({
          description: values.description.trim(),
          profileId: values.profileId ? Number(values.profileId) : null,
        });
        toast.success(t('dashboard.help.support.form.success'));
        onClose();
      } catch (err) {
        if (err instanceof SupportApiError) {
          const descriptionError = err.errors.description?.[0];
          const profileError = err.errors.profile_id?.[0];

          if (descriptionError) {
            setError('description', { message: descriptionError });
          }

          if (profileError) {
            setError('profileId', { message: profileError });
          }

          if (!descriptionError && !profileError) {
            setSubmitError(err.message);
          }

          return;
        }

        logger.error(err);
        setSubmitError(t('dashboard.help.support.form.errors.generic'));
      }
    },
    [onClose, setError, t]
  );

  return (
    <Dialog fullWidth maxWidth="sm" onClose={isSubmitting ? undefined : onClose} open={open}>
      <form noValidate onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogTitle>{t('dashboard.help.support.form.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.help.support.form.introduction')}
            </Typography>

            {submitError ? <Alert severity="error">{submitError}</Alert> : null}

            <TextField
              InputProps={{ readOnly: true }}
              fullWidth
              helperText={t('dashboard.help.support.form.emailHelper')}
              label={t('dashboard.help.support.form.emailLabel')}
              value={user?.email ?? ''}
            />

            <Controller
              control={control}
              name="profileId"
              render={({ field }) => (
                <FormControl error={Boolean(errors.profileId)} fullWidth>
                  <InputLabel id="support-request-profile-label">
                    {t('dashboard.help.support.form.profileLabel')}
                  </InputLabel>
                  <Select
                    {...field}
                    disabled={profilesLoading}
                    label={t('dashboard.help.support.form.profileLabel')}
                    labelId="support-request-profile-label"
                  >
                    <MenuItem value="">
                      <em>{t('dashboard.help.support.form.noProfile')}</em>
                    </MenuItem>
                    {profiles.map((profile) => (
                      <MenuItem key={profile.id} value={String(profile.id)}>
                        {profile.alias ?? profile.name} —{' '}
                        {t(
                          profile.active
                            ? 'dashboard.help.support.form.profileState.active'
                            : 'dashboard.help.support.form.profileState.inactive'
                        )}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {errors.profileId?.message ?? t('dashboard.help.support.form.profileHelper')}
                  </FormHelperText>
                </FormControl>
              )}
            />

            {profilesLoading ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={16} />
                <Typography color="text.secondary" variant="caption">
                  {t('dashboard.help.support.form.loadingProfiles')}
                </Typography>
              </Stack>
            ) : null}

            {profilesError ? (
              <Alert severity="warning">{t('dashboard.help.support.form.errors.profilesLoad')}</Alert>
            ) : null}

            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextField
                  {...field}
                  error={Boolean(errors.description)}
                  fullWidth
                  helperText={
                    errors.description?.message ??
                    t('dashboard.help.support.form.descriptionCounter', { count: description.length })
                  }
                  inputProps={{ maxLength: 3000 }}
                  label={t('dashboard.help.support.form.descriptionLabel')}
                  minRows={5}
                  multiline
                  required
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5 }}>
          <Button color="secondary" disabled={isSubmitting} onClick={onClose}>
            {t('dashboard.help.support.form.cancel')}
          </Button>
          <Button
            disabled={isSubmitting || profilesLoading}
            startIcon={isSubmitting ? <CircularProgress color="inherit" size={16} /> : undefined}
            type="submit"
            variant="contained"
          >
            {isSubmitting
              ? t('dashboard.help.support.form.sending')
              : t('dashboard.help.support.form.send')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { UserCirclePlus as UserCirclePlusIcon } from '@phosphor-icons/react/dist/ssr/UserCirclePlus';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { trackAnalyticsEvent } from '@/lib/google-analytics';
import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { createProfile, listProfiles, ProfileApiError } from '@/lib/profiles/api-client';
import { getLastVisitedProfileId, saveLastVisitedProfileId } from '@/lib/profiles/last-visited-profile';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import { toast } from '@/components/core/toaster';
import { ProfileFormDialog } from '@/components/dashboard/profiles/profile-form-dialog';

const metadata = { title: `Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);

  const loadProfileEntry = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      try {
        await getSubscriptionLimits();
      } catch (subscriptionError) {
        if (subscriptionError instanceof SubscriptionApiError && subscriptionError.status === 404) {
          navigate(paths.dashboard.settings.billing, { replace: true });
          return;
        }

        throw subscriptionError;
      }

      const profiles = await listProfiles();
      const targetProfile = getEntryProfile(profiles);

      if (targetProfile) {
        navigate(paths.dashboard.profileDetails.profileChat(String(targetProfile.id)), { replace: true });
        return;
      }

      setFormOpen(true);
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [navigate, t]);

  React.useEffect(() => {
    loadProfileEntry().catch((err) => {
      logger.error(err);
    });
  }, [loadProfileEntry]);

  const handleFormSubmit = React.useCallback(
    async (payload: ProfilePayload): Promise<void> => {
      try {
        const profile = await createProfile(payload);
        trackAnalyticsEvent('profile_created', { creation_surface: 'profiles_dashboard' });
        toast.success(t('dashboard.profiles.list.toasts.created'));
        saveLastVisitedProfileId(profile.id);
        navigate(paths.dashboard.profileDetails.profileChat(String(profile.id)), { replace: true });
      } catch (err) {
        if (!(err instanceof ProfileApiError && Object.keys(err.errors).length > 0)) {
          toast.error(getErrorMessage(err, t('dashboard.profiles.errors.generic')));
        }

        throw err;
      }
    },
    [navigate, t]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Box
        sx={{
          alignItems: 'flex-start',
          display: 'flex',
          justifyContent: 'center',
          minHeight: 'calc(100dvh - var(--MainNav-height, 64px))',
          p: 'var(--Content-padding)',
          pt: { md: 10, sm: 8, xs: 5 },
        }}
      >
        {isLoading ? <CircularProgress /> : null}
        {!isLoading && error ? (
          <Stack spacing={2} sx={{ maxWidth: 520, width: '100%' }}>
            <Alert color="error">{error}</Alert>
            <Button
              onClick={() => {
                void loadProfileEntry();
              }}
              variant="contained"
            >
              {t('dashboard.profiles.actions.retry')}
            </Button>
          </Stack>
        ) : null}
        {!isLoading && !error && !formOpen ? (
          <Paper
            elevation={0}
            sx={{
              background:
                'linear-gradient(145deg, rgba(var(--mui-palette-primary-mainChannel) / 0.12) 0%, var(--mui-palette-background-paper) 46%, rgba(var(--mui-palette-primary-lightChannel) / 0.1) 100%)',
              border: '1px solid rgba(var(--mui-palette-primary-mainChannel) / 0.2)',
              borderRadius: 4,
              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.1)',
              maxWidth: 560,
              overflow: 'hidden',
              px: { sm: 6, xs: 3 },
              py: { sm: 5.5, xs: 4 },
              position: 'relative',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.08)',
                borderRadius: '50%',
                height: 180,
                position: 'absolute',
                right: -72,
                top: -92,
                width: 180,
              }}
            />
            <Box
              aria-hidden="true"
              sx={{
                bgcolor: 'rgba(var(--mui-palette-primary-lightChannel) / 0.08)',
                borderRadius: '50%',
                bottom: -90,
                height: 160,
                left: -74,
                position: 'absolute',
                width: 160,
              }}
            />
            <Stack spacing={2.25} sx={{ alignItems: 'center', position: 'relative' }}>
              <Box
                sx={(theme) => ({
                  alignItems: 'center',
                  background: `linear-gradient(145deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  borderRadius: 3,
                  boxShadow: '0 14px 30px rgba(var(--mui-palette-primary-mainChannel) / 0.3)',
                  color: 'primary.contrastText',
                  display: 'flex',
                  height: 72,
                  justifyContent: 'center',
                  transform: 'rotate(-3deg)',
                  width: 72,
                })}
              >
                <UserCirclePlusIcon size={38} weight="duotone" />
              </Box>
              <Stack spacing={1} sx={{ alignItems: 'center' }}>
                <Typography
                  color="primary.main"
                  sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  variant="caption"
                >
                  {t('dashboard.profiles.entry.eyebrow')}
                </Typography>
                <Typography component="h1" sx={{ fontSize: { sm: '2rem', xs: '1.65rem' }, lineHeight: 1.15 }} variant="h4">
                  {t('dashboard.profiles.entry.title')}
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 430 }} variant="body1">
                  {t('dashboard.profiles.entry.description')}
                </Typography>
              </Stack>
              <Button
                fullWidth
                onClick={() => {
                  setFormOpen(true);
                }}
                size="large"
                startIcon={<PlusIcon weight="bold" />}
                sx={(theme) => ({
                  borderRadius: 2.5,
                  boxShadow: '0 12px 28px rgba(var(--mui-palette-primary-mainChannel) / 0.3)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  maxWidth: 320,
                  minHeight: 54,
                  mt: 0.5,
                  px: 4,
                  transition: theme.transitions.create(['box-shadow', 'transform']),
                  '&:hover': {
                    boxShadow: '0 16px 34px rgba(var(--mui-palette-primary-mainChannel) / 0.36)',
                    transform: 'translateY(-2px)',
                  },
                })}
                variant="contained"
              >
                {t('dashboard.profiles.actions.createProfile')}
              </Button>
            </Stack>
          </Paper>
        ) : null}
      </Box>
      <ProfileFormDialog
        onClose={() => {
          setFormOpen(false);
        }}
        onSubmit={handleFormSubmit}
        open={formOpen}
        profile={null}
      />
    </React.Fragment>
  );
}

function getEntryProfile(profiles: Profile[]): Profile | undefined {
  const lastVisitedProfileId = getLastVisitedProfileId();
  const lastVisitedProfile = profiles.find((profile) => String(profile.id) === lastVisitedProfileId);

  if (lastVisitedProfile) {
    return lastVisitedProfile;
  }

  return profiles.reduce<Profile | undefined>((latest, profile) => {
    if (!latest) {
      return profile;
    }

    const profileTimestamp = toTimestamp(profile.created_at);
    const latestTimestamp = toTimestamp(latest.created_at);

    if (profileTimestamp !== latestTimestamp) {
      return profileTimestamp > latestTimestamp ? profile : latest;
    }

    return Number(profile.id) > Number(latest.id) ? profile : latest;
  }, undefined);
}

function toTimestamp(value?: null | string): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

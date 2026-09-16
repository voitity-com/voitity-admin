'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
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
      const profiles = await listProfiles();
      const targetProfile = getEntryProfile(profiles);

      if (targetProfile) {
        navigate(paths.dashboard.profileDetails.template(String(targetProfile.id)), { replace: true });
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
        navigate(paths.dashboard.profileDetails.template(String(profile.id)), { replace: true });
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
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '50vh',
          p: 'var(--Content-padding)',
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
          <Button
            onClick={() => {
              setFormOpen(true);
            }}
            variant="contained"
          >
            {t('dashboard.profiles.actions.createProfile')}
          </Button>
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

    return toTimestamp(profile.created_at) > toTimestamp(latest.created_at) ? profile : latest;
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

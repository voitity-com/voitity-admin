'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import type { Profile } from '@/lib/profiles/api-client';
import { getProfile } from '@/lib/profiles/api-client';
import { ProfileTemplateEditor } from '@/components/dashboard/profiles/profile-template-editor';

const metadata = { title: `Template | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError('');

    getProfile(profileId)
      .then((nextProfile) => {
        if (isMounted) {
          setProfile(nextProfile);
        }
      })
      .catch((loadError) => {
        logger.error(loadError);

        if (isMounted) {
          setProfile(null);
          setError(t('dashboard.profiles.detail.errors.generic'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [profileId, t]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      {error ? <Alert color="error">{error}</Alert> : null}
      {isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : profile?.alias ? (
        <ProfileTemplateEditor
          previewUrl={buildPublicProfileUrl(profile.alias)}
          profileAvatarUrl={getProfileAvatarUrl(profile)}
          profileId={profileId}
          profileName={profile.name ?? ''}
        />
      ) : null}
    </React.Fragment>
  );
}

function getProfileAvatarUrl(profile: Profile): null | string {
  const candidates = [profile.avatar?.file, profile.avatar?.ai_image?.file, profile.avatar?.original_file];
  const file = candidates.find((candidate) => candidate && !isVideoFile(candidate));

  if (!file) {
    return null;
  }

  if (/^(?:data:|https?:\/\/)/i.test(file)) {
    return file;
  }

  const apiBaseUrl = (config.api?.baseUrl ?? '').replace(/\/+$/, '');

  if (file.startsWith('/')) {
    return `${apiBaseUrl}${file}`;
  }

  if (file.startsWith('storage/')) {
    return `${apiBaseUrl}/${file}`;
  }

  return `${apiBaseUrl}/storage/${file}`;
}

function isVideoFile(file: string): boolean {
  return /\.(?:m4v|mov|mp4|ogg|webm)(?:\?.*)?$/i.test(file);
}

function buildPublicProfileUrl(alias: string): string {
  const webBaseUrl = (config.publicProfile?.baseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  return `${webBaseUrl}/${encodeURIComponent(alias)}`;
}

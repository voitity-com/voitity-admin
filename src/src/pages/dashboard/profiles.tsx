'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import { getProfileAvatar } from '@/lib/avatar/api-client';
import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { createProfile, listProfiles } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';
import { ProfileFormDialog } from '@/components/dashboard/profiles/profile-form-dialog';
import { ProfilesFilters } from '@/components/dashboard/profiles/profiles-filters';
import type { Filters, SortDir } from '@/components/dashboard/profiles/profiles-filters';
import { ProfilesPagination } from '@/components/dashboard/profiles/profiles-pagination';
import { ProfilesSelectionProvider } from '@/components/dashboard/profiles/profiles-selection-context';
import { ProfilesTable } from '@/components/dashboard/profiles/profiles-table';

const metadata = { title: `Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { genre, name, sortDir, status } = useExtractSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');
  const [formOpen, setFormOpen] = React.useState<boolean>(false);

  const loadProfiles = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const nextProfiles = await listProfiles();
      const profilesWithAvatars = await Promise.all(
        nextProfiles.map(async (profile) => {
          if (profile.avatar !== undefined) {
            return profile;
          }

          try {
            return { ...profile, avatar: await getProfileAvatar(profile.id) };
          } catch (err) {
            logger.error(err);
            return profile;
          }
        })
      );

      setProfiles(profilesWithAvatars);
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.profiles.errors.generic'));
      logger.error(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadProfiles().catch((err) => {
      logger.error(err);
    });
  }, [loadProfiles]);

  const handleCreateOpen = React.useCallback((): void => {
    setFormOpen(true);
  }, []);

  const handleFormClose = React.useCallback((): void => {
    setFormOpen(false);
  }, []);

  const handleFormSubmit = React.useCallback(
    async (payload: ProfilePayload): Promise<void> => {
      try {
        await createProfile(payload);
        toast.success(t('dashboard.profiles.list.toasts.created'));

        handleFormClose();
        await loadProfiles();
      } catch (err) {
        toast.error(getErrorMessage(err, t('dashboard.profiles.errors.generic')));
        throw err;
      }
    },
    [handleFormClose, loadProfiles, t]
  );

  const filteredProfiles = React.useMemo(
    () => applyFilters(applySort(profiles, sortDir), { genre, name, status }),
    [genre, name, profiles, sortDir, status]
  );
  const totals = React.useMemo(
    () => ({
      active: profiles.filter((profile) => profile.active).length,
      all: profiles.length,
      inactive: profiles.filter((profile) => !profile.active).length,
    }),
    [profiles]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Box
        sx={{
          maxWidth: 'var(--Content-maxWidth)',
          m: 'var(--Content-margin)',
          p: 'var(--Content-padding)',
          width: 'var(--Content-width)',
        }}
      >
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: '1 1 auto' }}>
              <Typography variant="h4">{t('dashboard.profiles.list.title')}</Typography>
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.profiles.list.description')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleCreateOpen} startIcon={<PlusIcon />} variant="contained">
                {t('dashboard.profiles.actions.add')}
              </Button>
            </Box>
          </Stack>
          {error ? <Alert color="error">{error}</Alert> : null}
          <ProfilesSelectionProvider profiles={filteredProfiles}>
            <Card>
              <ProfilesFilters filters={{ genre, name, status }} sortDir={sortDir} totals={totals} />
              <Divider />
              {isLoading ? (
                <Stack sx={{ alignItems: 'center', p: 4 }}>
                  <CircularProgress />
                </Stack>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <ProfilesTable
                    onOpen={(profile) => {
                      navigate(paths.dashboard.profileDetails.profile(String(profile.id)));
                    }}
                    rows={filteredProfiles}
                  />
                </Box>
              )}
              <Divider />
              <ProfilesPagination count={filteredProfiles.length} page={0} />
            </Card>
          </ProfilesSelectionProvider>
        </Stack>
      </Box>
      <ProfileFormDialog onClose={handleFormClose} onSubmit={handleFormSubmit} open={formOpen} profile={null} />
    </React.Fragment>
  );
}

function useExtractSearchParams(): {
  genre: string | undefined;
  name: string | undefined;
  sortDir: SortDir;
  status: string | undefined;
} {
  const [searchParams] = useSearchParams();

  return {
    genre: searchParams.get('genre') || undefined,
    name: searchParams.get('name') || undefined,
    sortDir: (searchParams.get('sortDir') || 'desc') as SortDir,
    status: searchParams.get('status') || undefined,
  };
}

function applySort(rows: Profile[], sortDir: SortDir): Profile[] {
  return [...rows].sort((a, b) => {
    const aDate = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const bDate = new Date(b.updated_at ?? b.created_at ?? 0).getTime();

    if (sortDir === 'asc') {
      return aDate - bDate;
    }

    return bDate - aDate;
  });
}

function applyFilters(rows: Profile[], { genre, name, status }: Filters): Profile[] {
  return rows.filter((profile) => {
    if (status === 'active' && !profile.active) {
      return false;
    }

    if (status === 'inactive' && profile.active) {
      return false;
    }

    if (name && !profile.name.toLowerCase().includes(name.toLowerCase())) {
      return false;
    }

    if (genre && !profile.genre.toLowerCase().includes(genre.toLowerCase())) {
      return false;
    }

    return true;
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

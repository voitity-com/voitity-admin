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
import { useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { createProfile, listProfiles, updateProfile, updateProfileData } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';
import { ProfileDataDialog } from '@/components/dashboard/profiles/profile-data-dialog';
import { ProfileFormDialog } from '@/components/dashboard/profiles/profile-form-dialog';
import { ProfilesFilters } from '@/components/dashboard/profiles/profiles-filters';
import type { Filters, SortDir } from '@/components/dashboard/profiles/profiles-filters';
import { ProfilesPagination } from '@/components/dashboard/profiles/profiles-pagination';
import { ProfilesSelectionProvider } from '@/components/dashboard/profiles/profiles-selection-context';
import { ProfilesTable } from '@/components/dashboard/profiles/profiles-table';

const metadata = { title: `Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { genre, name, sortDir, status } = useExtractSearchParams();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');
  const [formProfile, setFormProfile] = React.useState<null | Profile>(null);
  const [dataProfile, setDataProfile] = React.useState<null | Profile>(null);
  const [formOpen, setFormOpen] = React.useState<boolean>(false);

  const loadProfiles = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setProfiles(await listProfiles());
    } catch (err) {
      const message = getErrorMessage(err);
      logger.error(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfiles().catch((err) => {
      logger.error(err);
    });
  }, [loadProfiles]);

  const handleCreateOpen = React.useCallback((): void => {
    setFormProfile(null);
    setFormOpen(true);
  }, []);

  const handleEditOpen = React.useCallback((profile: Profile): void => {
    setFormProfile(profile);
    setFormOpen(true);
  }, []);

  const handleFormClose = React.useCallback((): void => {
    setFormOpen(false);
    setFormProfile(null);
  }, []);

  const handleFormSubmit = React.useCallback(
    async (payload: ProfilePayload): Promise<void> => {
      try {
        if (formProfile) {
          await updateProfile(formProfile.id, payload);
          toast.success('Profile updated');
        } else {
          await createProfile(payload);
          toast.success('Profile created');
        }

        handleFormClose();
        await loadProfiles();
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    [formProfile, handleFormClose, loadProfiles]
  );

  const handleDataSubmit = React.useCallback(
    async (data: Record<string, unknown>): Promise<void> => {
      if (!dataProfile) {
        return;
      }

      try {
        await updateProfileData(dataProfile.id, data);
        toast.success('Profile data updated');
        setDataProfile(null);
        await loadProfiles();
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    [dataProfile, loadProfiles]
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
              <Typography variant="h4">Profiles</Typography>
              <Typography color="text.secondary" variant="body2">
                Manage the profiles attached to the logged-in user.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleCreateOpen} startIcon={<PlusIcon />} variant="contained">
                Add
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
                  <ProfilesTable onEdit={handleEditOpen} onEditData={setDataProfile} rows={filteredProfiles} />
                </Box>
              )}
              <Divider />
              <ProfilesPagination count={filteredProfiles.length} page={0} />
            </Card>
          </ProfilesSelectionProvider>
        </Stack>
      </Box>
      <ProfileFormDialog onClose={handleFormClose} onSubmit={handleFormSubmit} open={formOpen} profile={formProfile} />
      <ProfileDataDialog
        onClose={() => {
          setDataProfile(null);
        }}
        onSubmit={handleDataSubmit}
        open={Boolean(dataProfile)}
        profile={dataProfile}
      />
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong';
}

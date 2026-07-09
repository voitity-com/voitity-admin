'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import { getProfileAvatar } from '@/lib/avatar/api-client';
import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { createProfile, listProfiles } from '@/lib/profiles/api-client';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import {
  canCreateProfileWithLimit,
  getProfileCreationLimit,
  isSingleProfilePlan,
} from '@/lib/subscription/profile-limits';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';
import { ProfileFormDialog } from '@/components/dashboard/profiles/profile-form-dialog';
import { ProfilesFilters } from '@/components/dashboard/profiles/profiles-filters';
import type { Filters, SortDir } from '@/components/dashboard/profiles/profiles-filters';
import { ProfilesPagination } from '@/components/dashboard/profiles/profiles-pagination';
import { ProfilesSelectionProvider } from '@/components/dashboard/profiles/profiles-selection-context';
import { ProfilesTable } from '@/components/dashboard/profiles/profiles-table';

const metadata = { title: `Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

type SubscriptionStatus = 'active' | 'loading' | 'missing' | 'unknown';
type ProfileCreateBlockReason = 'limit-reached' | 'missing-plan';

export function Page(): React.JSX.Element {
  const { genre, name, sortDir, status } = useExtractSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');
  const [formOpen, setFormOpen] = React.useState<boolean>(false);
  const [isProfileLimitLoaded, setIsProfileLimitLoaded] = React.useState<boolean>(false);
  const [profileLimitDialogOpen, setProfileLimitDialogOpen] = React.useState<boolean>(false);
  const [profileCreateBlockReason, setProfileCreateBlockReason] =
    React.useState<ProfileCreateBlockReason>('limit-reached');
  const [profileLimit, setProfileLimit] = React.useState<number | undefined>();
  const [singleProfilePlan, setSingleProfilePlan] = React.useState<boolean>(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<SubscriptionStatus>('loading');

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

  React.useEffect(() => {
    let isMounted = true;

    getSubscriptionLimits()
      .then((limits) => {
        if (isMounted) {
          setProfileLimit(getProfileCreationLimit(limits));
          setSingleProfilePlan(isSingleProfilePlan(limits));
          setIsProfileLimitLoaded(true);
          setSubscriptionStatus('active');
        }
      })
      .catch((err) => {
        const isMissingPlan = err instanceof SubscriptionApiError && err.status === 404;

        if (!isMissingPlan) {
          logger.error(err);
        }

        if (isMounted) {
          setProfileLimit(undefined);
          setSingleProfilePlan(false);
          setIsProfileLimitLoaded(true);
          setSubscriptionStatus(isMissingPlan ? 'missing' : 'unknown');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateOpen = React.useCallback((): void => {
    if (isLoading || !isProfileLimitLoaded || subscriptionStatus === 'loading') {
      toast(t('dashboard.profiles.list.toasts.checkingPlan'));
      return;
    }

    if (subscriptionStatus === 'missing') {
      setProfileCreateBlockReason('missing-plan');
      setProfileLimitDialogOpen(true);
      return;
    }

    if (subscriptionStatus === 'unknown') {
      toast.error(t('dashboard.profiles.list.toasts.planCheckFailed'));
      return;
    }

    if (!canCreateProfileWithLimit(profiles.length, profileLimit)) {
      setProfileCreateBlockReason('limit-reached');
      setProfileLimitDialogOpen(true);
      return;
    }

    setFormOpen(true);
  }, [isLoading, isProfileLimitLoaded, profileLimit, profiles.length, subscriptionStatus, t]);

  const handleFormClose = React.useCallback((): void => {
    setFormOpen(false);
  }, []);

  const handleProfileLimitDialogClose = React.useCallback((): void => {
    setProfileLimitDialogOpen(false);
  }, []);

  const handleViewPlans = React.useCallback((): void => {
    setProfileLimitDialogOpen(false);
    navigate(paths.dashboard.settings.billing);
  }, [navigate]);

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
    () =>
      applyFilters(applySort(profiles, singleProfilePlan ? 'desc' : sortDir), {
        genre: singleProfilePlan ? undefined : genre,
        name: singleProfilePlan ? undefined : name,
        status,
      }),
    [genre, name, profiles, singleProfilePlan, sortDir, status]
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
              <ProfilesFilters
                filters={{
                  genre: singleProfilePlan ? undefined : genre,
                  name: singleProfilePlan ? undefined : name,
                  status,
                }}
                hideSearchFilters={singleProfilePlan}
                hideSort={singleProfilePlan}
                sortDir={singleProfilePlan ? 'desc' : sortDir}
                totals={totals}
              />
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
      <ProfileLimitDialog
        count={profiles.length}
        limit={profileLimit}
        onClose={handleProfileLimitDialogClose}
        onViewPlans={handleViewPlans}
        open={profileLimitDialogOpen}
        reason={profileCreateBlockReason}
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

interface ProfileLimitDialogProps {
  count: number;
  limit: number | undefined;
  onClose: () => void;
  onViewPlans: () => void;
  open: boolean;
  reason: ProfileCreateBlockReason;
}

function ProfileLimitDialog({
  count,
  limit,
  onClose,
  onViewPlans,
  open,
  reason,
}: ProfileLimitDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const limitValue = typeof limit === 'number' ? limit : count;
  const isMissingPlan = reason === 'missing-plan';

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogContent sx={{ p: 0 }}>
        <Stack
          spacing={2}
          sx={{
            alignItems: 'center',
            bgcolor: 'var(--mui-palette-warning-50)',
            px: { sm: 5, xs: 3 },
            py: { sm: 5, xs: 4 },
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              bgcolor: 'var(--mui-palette-warning-main)',
              borderRadius: '50%',
              color: 'var(--mui-palette-warning-contrastText)',
              display: 'flex',
              height: 72,
              justifyContent: 'center',
              width: 72,
            }}
          >
            <WarningCircleIcon fontSize="var(--icon-fontSize-xl)" weight="fill" />
          </Box>
          <Stack spacing={1}>
            <Typography variant="h5">
              {t(
                isMissingPlan
                  ? 'dashboard.profiles.list.limitDialog.planRequiredTitle'
                  : 'dashboard.profiles.list.limitDialog.title'
              )}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
              {t(
                isMissingPlan
                  ? 'dashboard.profiles.list.limitDialog.planRequiredDescription'
                  : 'dashboard.profiles.list.limitDialog.description',
                { count, limit: limitValue }
              )}
            </Typography>
          </Stack>
        </Stack>
        {!isMissingPlan ? (
          <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2} sx={{ p: 3 }}>
            <Paper sx={{ flex: '1 1 0', p: 2, textAlign: 'center' }} variant="outlined">
              <Typography color="text.secondary" variant="caption">
                {t('dashboard.profiles.list.limitDialog.currentUsage')}
              </Typography>
              <Typography variant="h4">{count}</Typography>
            </Paper>
            <Paper sx={{ flex: '1 1 0', p: 2, textAlign: 'center' }} variant="outlined">
              <Typography color="text.secondary" variant="caption">
                {t('dashboard.profiles.list.limitDialog.planLimit')}
              </Typography>
              <Typography variant="h4">{limitValue}</Typography>
            </Paper>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', px: 3, py: 2 }}>
        <Button color="secondary" onClick={onClose}>
          {t('dashboard.profiles.list.limitDialog.close')}
        </Button>
        <Button onClick={onViewPlans} variant="contained">
          {t('dashboard.profiles.list.limitDialog.viewPlans')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

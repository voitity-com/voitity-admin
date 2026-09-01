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
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import { getProfileAvatar } from '@/lib/avatar/api-client';
import { logger } from '@/lib/default-logger';
import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { createProfile, listProfiles, ProfileApiError } from '@/lib/profiles/api-client';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import {
  canCreateProfileWithLimit,
  getProfileCreationLimit,
  isSingleProfilePlan,
} from '@/lib/subscription/profile-limits';
import { useDelayedOpen } from '@/hooks/use-delayed-open';
import { useMediaQuery } from '@/hooks/use-media-query';
import { toast } from '@/components/core/toaster';
import { ProfileGuideTutorialLink } from '@/components/dashboard/help/profile-guide-tutorial-link';
import { useNoPlanTutorial } from '@/components/dashboard/layout/no-plan-tutorial-context';
import { ProfileFormDialog } from '@/components/dashboard/profiles/profile-form-dialog';
import { ProfilesFilters } from '@/components/dashboard/profiles/profiles-filters';
import type { Filters, SortDir } from '@/components/dashboard/profiles/profiles-filters';
import { ProfilesPagination } from '@/components/dashboard/profiles/profiles-pagination';
import { ProfilesSelectionProvider } from '@/components/dashboard/profiles/profiles-selection-context';
import { ProfilesTable } from '@/components/dashboard/profiles/profiles-table';

const metadata = { title: `Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const onboardingDelayMs = 500;
const onboardingTransitionMs = 260;

type SubscriptionStatus = 'active' | 'loading' | 'missing' | 'unknown';
type ProfileCreateBlockReason = 'limit-reached' | 'missing-plan';

export function Page(): React.JSX.Element {
  const { genre, name, sortDir, status } = useExtractSearchParams();
  const [pageSearchParams, setPageSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { status: noPlanTutorialStatus } = useNoPlanTutorial();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');
  const [formOpen, setFormOpen] = React.useState<boolean>(false);
  const [isProfileLimitLoaded, setIsProfileLimitLoaded] = React.useState<boolean>(false);
  const [profileCompletionAnchorEl, setProfileCompletionAnchorEl] = React.useState<HTMLElement | null>(null);
  const [profileCompletionOnboardingDismissed, setProfileCompletionOnboardingDismissed] =
    React.useState<boolean>(false);
  const [profileOnboardingDismissed, setProfileOnboardingDismissed] = React.useState<boolean>(false);
  const [profileLimitDialogOpen, setProfileLimitDialogOpen] = React.useState<boolean>(false);
  const [profileCreateBlockReason, setProfileCreateBlockReason] =
    React.useState<ProfileCreateBlockReason>('limit-reached');
  const [profileLimit, setProfileLimit] = React.useState<number | undefined>();
  const [singleProfilePlan, setSingleProfilePlan] = React.useState<boolean>(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<SubscriptionStatus>('loading');
  const addButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const createIntentHandledRef = React.useRef(false);

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

  const handleCreateOpenFromOnboarding = React.useCallback((): void => {
    setProfileOnboardingDismissed(true);
    handleCreateOpen();
  }, [handleCreateOpen]);

  React.useEffect(() => {
    if (
      createIntentHandledRef.current ||
      pageSearchParams.get('create') !== '1' ||
      isLoading ||
      !isProfileLimitLoaded ||
      subscriptionStatus === 'loading'
    ) {
      return;
    }

    createIntentHandledRef.current = true;
    handleCreateOpen();
    const nextSearchParams = new URLSearchParams(pageSearchParams);
    nextSearchParams.delete('create');
    setPageSearchParams(nextSearchParams, { replace: true });
  }, [
    handleCreateOpen,
    isLoading,
    isProfileLimitLoaded,
    pageSearchParams,
    setPageSearchParams,
    subscriptionStatus,
  ]);

  const handleFormClose = React.useCallback((): void => {
    setFormOpen(false);
  }, []);

  const handleProfileOnboardingClose = React.useCallback((): void => {
    setProfileOnboardingDismissed(true);
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
        if (err instanceof ProfileApiError && Object.keys(err.errors).length > 0) {
          throw err;
        }

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
  const singleIncompleteProfile = React.useMemo(() => {
    if (profiles.length !== 1) {
      return null;
    }

    const [profile] = profiles;

    return isProfileIncompleteForPublication(profile) ? profile : null;
  }, [profiles]);
  const noPlanTutorialBlocksOnboarding =
    noPlanTutorialStatus === 'checking' || noPlanTutorialStatus === 'open';
  const profileOnboardingReady =
    !profileOnboardingDismissed &&
    !isLoading &&
    isProfileLimitLoaded &&
    !error &&
    profiles.length === 0 &&
    !formOpen &&
    !profileLimitDialogOpen &&
    !noPlanTutorialBlocksOnboarding;
  const profileCompletionOnboardingReady =
    !profileCompletionOnboardingDismissed &&
    !profileOnboardingReady &&
    !isLoading &&
    !error &&
    Boolean(singleIncompleteProfile) &&
    !formOpen &&
    !profileLimitDialogOpen &&
    !noPlanTutorialBlocksOnboarding;
  const profileOnboardingOpen = useDelayedOpen(profileOnboardingReady, onboardingDelayMs);
  const profileCompletionOnboardingOpen = useDelayedOpen(profileCompletionOnboardingReady, onboardingDelayMs);
  const profileCompletionPopoverOpen = profileCompletionOnboardingOpen && Boolean(profileCompletionAnchorEl);

  React.useEffect(() => {
    if (!profileCompletionOnboardingOpen || !singleIncompleteProfile) {
      setProfileCompletionAnchorEl(null);
      return;
    }

    const selector = `[data-profile-onboarding-anchor="${String(singleIncompleteProfile.id)}"]`;
    const anchor = document.querySelector<HTMLElement>(selector);
    setProfileCompletionAnchorEl(anchor);
  }, [filteredProfiles, profileCompletionOnboardingOpen, singleIncompleteProfile]);

  const handleProfileOpen = React.useCallback(
    (profile: Profile): void => {
      if (singleIncompleteProfile && String(profile.id) === String(singleIncompleteProfile.id)) {
        setProfileCompletionOnboardingDismissed(true);
      }

      navigate(paths.dashboard.profileDetails.profile(String(profile.id)));
    },
    [navigate, singleIncompleteProfile]
  );

  const handleProfileCompletionOnboardingClose = React.useCallback((): void => {
    setProfileCompletionOnboardingDismissed(true);
  }, []);

  const handleOpenSingleIncompleteProfile = React.useCallback((): void => {
    if (!singleIncompleteProfile) {
      return;
    }

    setProfileCompletionOnboardingDismissed(true);
    navigate(paths.dashboard.profileDetails.profile(String(singleIncompleteProfile.id)));
  }, [navigate, singleIncompleteProfile]);

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
            <Stack spacing={0.5} sx={{ flex: '1 1 auto' }}>
              <Typography variant="h4">{t('dashboard.profiles.list.title')}</Typography>
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.profiles.list.description')}
              </Typography>
              <ProfileGuideTutorialLink step="createProfile" />
            </Stack>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                aria-describedby={profileOnboardingOpen ? 'profile-creation-onboarding' : undefined}
                onClick={handleCreateOpenFromOnboarding}
                ref={addButtonRef}
                startIcon={<PlusIcon />}
                sx={
                  profileOnboardingOpen
                    ? (theme) => ({
                        boxShadow: '0 0 0 8px rgba(255, 255, 255, 0.22), var(--mui-shadows-16)',
                        position: 'relative',
                        transition: theme.transitions.create(['box-shadow', 'transform'], {
                          duration: theme.transitions.duration.shorter,
                        }),
                        zIndex: theme.zIndex.modal + 2,
                        '&:hover': {
                          transform: 'translateY(-1px)',
                        },
                      })
                    : undefined
                }
                variant="contained"
              >
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
                    onOpen={handleProfileOpen}
                    rows={filteredProfiles}
                    spotlightProfileId={profileCompletionOnboardingOpen ? String(singleIncompleteProfile?.id) : null}
                  />
                </Box>
              )}
              <Divider />
              <ProfilesPagination count={filteredProfiles.length} page={0} />
            </Card>
          </ProfilesSelectionProvider>
        </Stack>
      </Box>
      <ProfileOnboardingBackdrop onClose={handleProfileOnboardingClose} open={profileOnboardingOpen} />
      <ProfileOnboardingBackdrop onClose={handleProfileCompletionOnboardingClose} open={profileCompletionPopoverOpen} />
      <ProfileCreationOnboarding
        anchorEl={addButtonRef.current}
        onClose={handleProfileOnboardingClose}
        onCreateProfile={handleCreateOpenFromOnboarding}
        open={profileOnboardingOpen}
        subscriptionStatus={subscriptionStatus}
      />
      <ProfileCompletionOnboarding
        anchorEl={profileCompletionAnchorEl}
        onClose={handleProfileCompletionOnboardingClose}
        onOpenProfile={handleOpenSingleIncompleteProfile}
        open={profileCompletionPopoverOpen}
        profile={singleIncompleteProfile}
      />
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

interface ProfileOnboardingBackdropProps {
  onClose: () => void;
  open: boolean;
}

function ProfileOnboardingBackdrop({ onClose, open }: ProfileOnboardingBackdropProps): React.JSX.Element {
  return (
    <Fade in={open} mountOnEnter timeout={onboardingTransitionMs} unmountOnExit>
      <Box
        onClick={onClose}
        sx={(theme) => ({
          backdropFilter: 'blur(2px)',
          bgcolor: 'rgba(15, 23, 42, 0.72)',
          inset: 0,
          position: 'fixed',
          transition: theme.transitions.create(['background-color', 'backdrop-filter'], {
            duration: theme.transitions.duration.shorter,
          }),
          zIndex: theme.zIndex.modal,
        })}
      />
    </Fade>
  );
}

interface ProfileCreationOnboardingProps {
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  onCreateProfile: () => void;
  open: boolean;
  subscriptionStatus: SubscriptionStatus;
}

function ProfileCreationOnboarding({
  anchorEl,
  onClose,
  onCreateProfile,
  open,
  subscriptionStatus,
}: ProfileCreationOnboardingProps): React.JSX.Element {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('down', 'sm');
  const isMissingPlan = subscriptionStatus === 'missing';
  const popoverOpen = open ? Boolean(anchorEl) : false;
  const descriptionKey = isMissingPlan
    ? 'dashboard.profiles.list.onboarding.descriptionWithoutPlan'
    : 'dashboard.profiles.list.onboarding.descriptionWithPlan';

  if (isMobile) {
    return (
      <MobileProfileOnboardingPanel
        action={
          <Button fullWidth onClick={onCreateProfile} startIcon={<PlusIcon />} variant="contained">
            {t('dashboard.profiles.list.onboarding.action')}
          </Button>
        }
        color="primary.main"
        description={t(
          isMissingPlan
            ? 'dashboard.profiles.list.onboarding.mobileDescriptionWithoutPlan'
            : 'dashboard.profiles.list.onboarding.mobileDescriptionWithPlan'
        )}
        eyebrow={t('dashboard.profiles.list.onboarding.eyebrow')}
        icon={<PlusIcon fontSize="var(--icon-fontSize-md)" weight="bold" />}
        iconBgcolor="primary.main"
        onClose={onClose}
        open={open}
        title={t('dashboard.profiles.list.onboarding.title')}
      />
    );
  }

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      disableScrollLock
      hideBackdrop
      id="profile-creation-onboarding"
      onClose={onClose}
      open={popoverOpen}
      slotProps={{
        paper: {
          sx: {
            border: '1px solid rgba(255, 255, 255, 0.32)',
            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.38)',
            maxWidth: 'calc(100vw - 32px)',
            mt: 1.5,
            overflow: 'visible',
            width: { sm: 420, xs: 'calc(100vw - 32px)' },
          },
        },
        root: {
          sx: (theme) => ({
            pointerEvents: 'none',
            zIndex: theme.zIndex.modal + 1,
          }),
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      transitionDuration={onboardingTransitionMs}
    >
      <Stack spacing={2.5} sx={{ pointerEvents: 'auto', p: { sm: 3, xs: 2.5 } }}>
        <Stack direction="row" spacing={1.5}>
          <Box
            sx={{
              alignItems: 'center',
              bgcolor: 'primary.main',
              borderRadius: 1.5,
              color: 'primary.contrastText',
              display: 'flex',
              flex: '0 0 auto',
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}
          >
            <PlusIcon fontSize="var(--icon-fontSize-md)" weight="bold" />
          </Box>
          <Stack spacing={0.5}>
            <Typography color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }} variant="caption">
              {t('dashboard.profiles.list.onboarding.eyebrow')}
            </Typography>
            <Typography variant="h6">{t('dashboard.profiles.list.onboarding.title')}</Typography>
          </Stack>
        </Stack>
        <Typography color="text.secondary" variant="body2">
          {t(descriptionKey)}
        </Typography>
      </Stack>
    </Popover>
  );
}

interface ProfileCompletionOnboardingProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onOpenProfile: () => void;
  open: boolean;
  profile: null | Profile;
}

function ProfileCompletionOnboarding({
  anchorEl,
  onClose,
  onOpenProfile,
  open,
  profile,
}: ProfileCompletionOnboardingProps): React.JSX.Element {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('down', 'sm');
  const popoverOpen = open ? Boolean(anchorEl) : false;
  const missing = profile?.publication?.missing ?? [];
  const missingText = missing.length
    ? t('dashboard.profiles.list.completionOnboarding.missingItems', {
        items: missing
          .map((item) => t(`dashboard.profiles.detail.publicationDock.requirements.${item}`, { defaultValue: item }))
          .join(', '),
      })
    : '';

  if (isMobile) {
    return (
      <MobileProfileOnboardingPanel
        action={
          <Button endIcon={<ArrowRightIcon />} fullWidth onClick={onOpenProfile} variant="contained">
            {t('dashboard.profiles.list.completionOnboarding.openProfile')}
          </Button>
        }
        color="warning.main"
        description={t('dashboard.profiles.list.completionOnboarding.mobileDescription')}
        eyebrow={t('dashboard.profiles.list.completionOnboarding.eyebrow')}
        icon={<WarningCircleIcon fontSize="var(--icon-fontSize-md)" weight="fill" />}
        iconBgcolor="warning.main"
        missingText={missingText}
        onClose={onClose}
        open={open}
        title={t('dashboard.profiles.list.completionOnboarding.title')}
      />
    );
  }

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      disableScrollLock
      hideBackdrop
      id="profile-completion-onboarding"
      onClose={onClose}
      open={popoverOpen}
      slotProps={{
        paper: {
          sx: {
            border: '1px solid rgba(255, 255, 255, 0.32)',
            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.38)',
            maxWidth: 'calc(100vw - 32px)',
            mt: 1.5,
            overflow: 'visible',
            width: { sm: 440, xs: 'calc(100vw - 32px)' },
          },
        },
        root: {
          sx: (theme) => ({
            pointerEvents: 'none',
            zIndex: theme.zIndex.modal + 1,
          }),
        },
      }}
      transformOrigin={{ horizontal: 'left', vertical: 'top' }}
      transitionDuration={onboardingTransitionMs}
    >
      <Stack spacing={2.5} sx={{ pointerEvents: 'auto', p: { sm: 3, xs: 2.5 } }}>
        <Stack direction="row" spacing={1.5}>
          <Box
            sx={{
              alignItems: 'center',
              bgcolor: 'warning.main',
              borderRadius: 1.5,
              color: 'warning.contrastText',
              display: 'flex',
              flex: '0 0 auto',
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}
          >
            <WarningCircleIcon fontSize="var(--icon-fontSize-md)" weight="fill" />
          </Box>
          <Stack spacing={0.5}>
            <Typography color="warning.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }} variant="caption">
              {t('dashboard.profiles.list.completionOnboarding.eyebrow')}
            </Typography>
            <Typography variant="h6">{t('dashboard.profiles.list.completionOnboarding.title')}</Typography>
          </Stack>
        </Stack>
        <Stack spacing={1}>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.profiles.list.completionOnboarding.description')}
          </Typography>
          {missingText ? (
            <Typography color="text.primary" sx={{ fontWeight: 600 }} variant="body2">
              {missingText}
            </Typography>
          ) : null}
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button endIcon={<ArrowRightIcon />} onClick={onOpenProfile} variant="contained">
            {t('dashboard.profiles.list.completionOnboarding.openProfile')}
          </Button>
        </Box>
      </Stack>
    </Popover>
  );
}

interface MobileProfileOnboardingPanelProps {
  action: React.ReactNode;
  color: string;
  description: string;
  eyebrow: string;
  icon: React.ReactNode;
  iconBgcolor: string;
  missingText?: string;
  onClose: () => void;
  open: boolean;
  title: string;
}

function MobileProfileOnboardingPanel({
  action,
  color,
  description,
  eyebrow,
  icon,
  iconBgcolor,
  missingText,
  onClose,
  open,
  title,
}: MobileProfileOnboardingPanelProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Fade in={open} mountOnEnter timeout={onboardingTransitionMs} unmountOnExit>
      <Paper
        elevation={24}
        role="dialog"
        sx={(theme) => ({
          border: '1px solid rgba(255, 255, 255, 0.32)',
          borderRadius: 2,
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.42)',
          left: 16,
          maxHeight: 'calc(100dvh - 96px)',
          overflowY: 'auto',
          p: 2.5,
          position: 'fixed',
          right: 16,
          zIndex: theme.zIndex.modal + 2,
        })}
      >
        <Stack spacing={2.25}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: iconBgcolor,
                borderRadius: 1.5,
                color: 'primary.contrastText',
                display: 'flex',
                flex: '0 0 auto',
                height: 44,
                justifyContent: 'center',
                width: 44,
              }}
            >
              {icon}
            </Box>
            <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Typography color={color} sx={{ fontWeight: 700, textTransform: 'uppercase' }} variant="caption">
                {eyebrow}
              </Typography>
              <Typography variant="h6">{title}</Typography>
            </Stack>
            <IconButton
              aria-label={t('dashboard.profiles.list.onboarding.close')}
              edge="end"
              onClick={onClose}
              size="small"
            >
              <XIcon />
            </IconButton>
          </Stack>
          <Stack spacing={1}>
            <Typography color="text.secondary" variant="body2">
              {description}
            </Typography>
            {missingText ? (
              <Typography color="text.primary" sx={{ fontWeight: 600 }} variant="body2">
                {missingText}
              </Typography>
            ) : null}
          </Stack>
          <Box>{action}</Box>
        </Stack>
      </Paper>
    </Fade>
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

function isProfileIncompleteForPublication(profile: Profile): boolean {
  if (profile.publication) {
    return !profile.publication.can_activate;
  }

  return profile.status !== 'published' || !profile.active;
}

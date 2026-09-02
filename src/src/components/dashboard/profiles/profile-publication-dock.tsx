'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Power as PowerIcon } from '@phosphor-icons/react/dist/ssr/Power';
import { RocketLaunch as RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { XCircle as XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { trackAnalyticsEvent } from '@/lib/google-analytics';
import type { Profile, ProfilePublication, ProfilePublicationRequirement } from '@/lib/profiles/api-client';
import { activateProfile, deactivateProfile, getProfile, ProfileApiError } from '@/lib/profiles/api-client';
import { getPublicProfileUrl } from '@/lib/profiles/public-profile-url';
import { usePathname } from '@/hooks/use-pathname';
import { toast } from '@/components/core/toaster';

const emptyPublication = {
  can_activate: false,
  is_published: false,
  missing: [],
  requirements: [],
} satisfies ProfilePublication;

export function ProfilePublicationDock(): React.JSX.Element | null {
  const navigate = useNavigate();
  const pathname = usePathname();
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [missingDialogOpen, setMissingDialogOpen] = React.useState<boolean>(false);
  const [activationBlock, setActivationBlock] = React.useState<'limit' | 'subscription' | null>(null);
  const [publicationAction, setPublicationAction] = React.useState<'activate' | 'deactivate' | null>(null);

  const loadProfile = React.useCallback(async (): Promise<void> => {
    if (!profileId) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const nextProfile = await getProfile(profileId);
      setProfile(nextProfile);
    } catch (err) {
      logger.error(err);
      setError(t('dashboard.profiles.detail.publicationDock.error'));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

  React.useEffect(() => {
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile, pathname]);

  React.useEffect(() => {
    const handleRefresh = (): void => {
      loadProfile().catch((err) => {
        logger.error(err);
      });
    };

    window.addEventListener('profile-publication:refresh', handleRefresh);

    return () => {
      window.removeEventListener('profile-publication:refresh', handleRefresh);
    };
  }, [loadProfile]);

  const publication = profile?.publication ?? emptyPublication;
  const requirements = publication.requirements ?? [];
  const completedRequirements = requirements.filter((requirement) => requirement.passed).length;
  const missingRequirements = requirements.filter((requirement) => !requirement.passed);
  const nextMissingRequirement = missingRequirements[0] ?? null;
  const isPublished = Boolean(publication.is_published);
  const publicProfileUrl = isPublished && profile ? getPublicProfileUrl(profile) : null;

  const handlePrimaryAction = React.useCallback(async (): Promise<void> => {
    if (!profileId || !profile) {
      return;
    }

    const nextAction = isPublished ? 'deactivate' : 'activate';

    if (nextAction === 'deactivate') {
      setPublicationAction(nextAction);
      return;
    }

    if (publication.can_activate) {
      setPublicationAction(nextAction);
      return;
    }

    setIsSubmitting(true);

    try {
      const refreshedProfile = await getProfile(profileId);
      const refreshedPublication = refreshedProfile.publication ?? emptyPublication;

      setProfile(refreshedProfile);

      if (!refreshedPublication.can_activate) {
        setMissingDialogOpen(true);
        return;
      }

      setPublicationAction(nextAction);
    } catch (err) {
      logger.error(err);
      toast.error(err instanceof Error ? err.message : t('dashboard.profiles.detail.publicationDock.toasts.error'));
      await loadProfile();
    } finally {
      setIsSubmitting(false);
    }
  }, [isPublished, loadProfile, profile, profileId, publication.can_activate, t]);

  const handleCloseConfirmationDialog = React.useCallback((): void => {
    if (isSubmitting) {
      return;
    }

    setPublicationAction(null);
  }, [isSubmitting]);

  const handleConfirmPublicationAction = React.useCallback(async (): Promise<void> => {
    if (!profileId || !publicationAction) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (publicationAction === 'activate') {
        const refreshedProfile = await getProfile(profileId);
        const refreshedPublication = refreshedProfile.publication ?? emptyPublication;

        setProfile(refreshedProfile);

        if (!refreshedPublication.can_activate) {
          setPublicationAction(null);
          setMissingDialogOpen(true);
          return;
        }
      }

      const nextProfile =
        publicationAction === 'deactivate' ? await deactivateProfile(profileId) : await activateProfile(profileId);
      setProfile(nextProfile);
      if (publicationAction === 'activate') {
        trackAnalyticsEvent('profile_published', { publication_surface: 'profile_dashboard' });
      }
      setPublicationAction(null);
      window.dispatchEvent(new Event('profile-publication:changed'));
      toast.success(
        publicationAction === 'deactivate'
          ? t('dashboard.profiles.detail.publicationDock.toasts.deactivated')
          : t('dashboard.profiles.detail.publicationDock.toasts.activated')
      );
    } catch (err) {
      logger.error(err);

      if (publicationAction === 'activate' && err instanceof ProfileApiError) {
        if (err.status === 402) {
          setPublicationAction(null);
          setActivationBlock('subscription');
          return;
        }

        if (err.status === 409 && err.errors.profiles) {
          setPublicationAction(null);
          setActivationBlock('limit');
          return;
        }
      }

      toast.error(err instanceof Error ? err.message : t('dashboard.profiles.detail.publicationDock.toasts.error'));
      await loadProfile();
    } finally {
      setIsSubmitting(false);
    }
  }, [loadProfile, profileId, publicationAction, t]);

  if (!profileId) {
    return null;
  }

  const statusColor = error ? 'error' : isPublished ? 'success' : publication.can_activate ? 'warning' : 'error';
  const statusLabel = getStatusLabel({
    error,
    isLoading,
    isPublished,
    missingCount: missingRequirements.length,
    publication,
    t,
  });

  return (
    <React.Fragment>
      <Paper
        elevation={16}
        id="profile-publication-dock"
        sx={{
          border: '1px solid var(--mui-palette-divider)',
          borderRadius: 2,
          mb: 3,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <Box
          sx={{
            alignItems: { xs: 'stretch', md: 'center' },
            display: 'grid',
            gap: { xs: 1.25, md: 2 },
            gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 0.9fr) minmax(320px, 1.2fr) auto' },
            p: { xs: 1.25, sm: 2 },
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: 'background.level1',
                borderRadius: 1,
                display: 'flex',
                flex: '0 0 auto',
                height: 36,
                justifyContent: 'center',
                width: 36,
              }}
            >
              {isLoading ? (
                <CircularProgress size={18} />
              ) : error ? (
                <WarningCircleIcon
                  color="var(--mui-palette-error-main)"
                  fontSize="var(--icon-fontSize-md)"
                  weight="fill"
                />
              ) : isPublished ? (
                <CheckCircleIcon
                  color="var(--mui-palette-success-main)"
                  fontSize="var(--icon-fontSize-md)"
                  weight="fill"
                />
              ) : (
                <RocketLaunchIcon
                  color={`var(--mui-palette-${statusColor}-main)`}
                  fontSize="var(--icon-fontSize-md)"
                  weight="fill"
                />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap variant="subtitle2">
                {t('dashboard.profiles.detail.publicationDock.title')}
              </Typography>
              <Typography color={error ? 'error.main' : 'text.secondary'} component="div" noWrap variant="caption">
                {statusLabel}
              </Typography>
              {publicProfileUrl ? (
                <Link
                  href={publicProfileUrl}
                  rel="noreferrer"
                  sx={{ display: 'inline-flex', fontWeight: 600, mt: 0.25 }}
                  target="_blank"
                  underline="hover"
                  variant="caption"
                >
                  {t('dashboard.profiles.actions.viewProfile')}
                </Link>
              ) : null}
              {!isLoading && !error && requirements.length > 0 ? (
                <Typography
                  color="text.secondary"
                  component="div"
                  noWrap
                  sx={{ display: { sm: 'none' }, mt: 0.25 }}
                  variant="caption"
                >
                  {t('dashboard.profiles.detail.publicationDock.readyCount', {
                    passed: completedRequirements,
                    total: requirements.length,
                  })}
                </Typography>
              ) : null}
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap', gap: 1, minWidth: 0 }}
          >
            {requirements.map((requirement) => (
              <RequirementChip key={requirement.key} requirement={requirement} t={t} />
            ))}
          </Stack>

          <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1} sx={{ justifySelf: { xs: 'stretch', md: 'end' } }}>
            {!isPublished ? (
              <Button
                onClick={() => window.dispatchEvent(new Event('profile-publication:onboarding-restart'))}
                size="small"
                variant="text"
              >
                {t('dashboard.profiles.detail.publicationDock.showGuide')}
              </Button>
            ) : null}
            <Button
              color={isPublished ? 'warning' : publication.can_activate ? 'primary' : 'inherit'}
              disabled={isLoading || isSubmitting || Boolean(error)}
              onClick={handlePrimaryAction}
              startIcon={isPublished ? <PowerIcon /> : <RocketLaunchIcon />}
              sx={{ whiteSpace: 'nowrap' }}
              variant={isPublished ? 'outlined' : 'contained'}
            >
              {isSubmitting ? (
                <CircularProgress color="inherit" size={18} />
              ) : isPublished ? (
                t('dashboard.profiles.detail.publicationDock.deactivate')
              ) : (
                t('dashboard.profiles.detail.publicationDock.activate')
              )}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => {
          setMissingDialogOpen(false);
        }}
        open={missingDialogOpen}
      >
        <DialogTitle>{t('dashboard.profiles.detail.publicationDock.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert color="warning">{t('dashboard.profiles.detail.publicationDock.dialogDescription')}</Alert>
            <List disablePadding>
              {missingRequirements.map((requirement) => (
                <ListItem disableGutters key={requirement.key}>
                  <ListItemIcon sx={{ minWidth: 34 }}>
                    <XCircleIcon
                      color="var(--mui-palette-error-main)"
                      fontSize="var(--icon-fontSize-md)"
                      weight="fill"
                    />
                  </ListItemIcon>
                  <ListItemText primary={getRequirementLabel(requirement.key, t)} />
                </ListItem>
              ))}
            </List>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMissingDialogOpen(false);
            }}
          >
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          {nextMissingRequirement ? (
            <Button
              onClick={() => {
                setMissingDialogOpen(false);
                navigate(getRequirementHref(nextMissingRequirement.key, profileId));
              }}
              variant="contained"
            >
              {t('dashboard.profiles.detail.publicationDock.completeRequirement', {
                requirement: getRequirementLabel(nextMissingRequirement.key, t),
              })}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 32px)', sm: '100%' },
          },
        }}
        fullWidth
        maxWidth="xs"
        onClose={() => {
          setActivationBlock(null);
        }}
        open={activationBlock !== null}
      >
        <DialogTitle>
          {activationBlock === 'subscription'
            ? t('dashboard.profiles.detail.publicationDock.activationBlocks.subscriptionTitle')
            : t('dashboard.profiles.detail.publicationDock.activationBlocks.limitTitle')}
        </DialogTitle>
        <DialogContent>
          <Alert color="warning">
            {activationBlock === 'subscription'
              ? t('dashboard.profiles.detail.publicationDock.activationBlocks.subscriptionDescription')
              : t('dashboard.profiles.detail.publicationDock.activationBlocks.limitDescription')}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 3 }}>
          <Button
            color="secondary"
            onClick={() => {
              setActivationBlock(null);
            }}
          >
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          <Button
            onClick={() => {
              const destination =
                activationBlock === 'subscription' ? paths.dashboard.settings.billing : paths.dashboard.profiles;

              setActivationBlock(null);
              navigate(destination);
            }}
            variant="contained"
          >
            {activationBlock === 'subscription'
              ? t('dashboard.profiles.detail.publicationDock.activationBlocks.viewPlans')
              : t('dashboard.profiles.detail.publicationDock.activationBlocks.viewProfiles')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 32px)', sm: '100%' },
          },
        }}
        fullWidth
        maxWidth="xs"
        onClose={handleCloseConfirmationDialog}
        open={publicationAction !== null}
      >
        <DialogTitle>
          {publicationAction === 'deactivate'
            ? t('dashboard.profiles.detail.publicationDock.confirmDialog.deactivateTitle')
            : t('dashboard.profiles.detail.publicationDock.confirmDialog.activateTitle')}
        </DialogTitle>
        <DialogContent>
          <Alert color={publicationAction === 'deactivate' ? 'warning' : 'info'}>
            {publicationAction === 'deactivate'
              ? t('dashboard.profiles.detail.publicationDock.confirmDialog.deactivateDescription')
              : t('dashboard.profiles.detail.publicationDock.confirmDialog.activateDescription')}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button disabled={isSubmitting} onClick={handleCloseConfirmationDialog}>
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          <Button
            color={publicationAction === 'deactivate' ? 'warning' : 'primary'}
            disabled={isSubmitting}
            onClick={handleConfirmPublicationAction}
            startIcon={
              isSubmitting ? (
                <CircularProgress color="inherit" size={16} />
              ) : publicationAction === 'deactivate' ? (
                <PowerIcon />
              ) : (
                <RocketLaunchIcon />
              )
            }
            variant="contained"
          >
            {publicationAction === 'deactivate'
              ? t('dashboard.profiles.detail.publicationDock.confirmDialog.deactivateConfirm')
              : t('dashboard.profiles.detail.publicationDock.confirmDialog.activateConfirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function getRequirementHref(key: string, profileId: string): string {
  if (key === 'avatar') {
    return paths.dashboard.profileDetails.avatar(profileId);
  }

  if (key === 'source') {
    return paths.dashboard.profileDetails.sources(profileId);
  }

  if (key === 'voice') {
    return paths.dashboard.profileDetails.voice(profileId);
  }

  return paths.dashboard.profileDetails.profile(profileId);
}

function RequirementChip({
  requirement,
  t,
}: {
  requirement: ProfilePublicationRequirement;
  t: (key: string, options?: Record<string, unknown>) => string;
}): React.JSX.Element {
  return (
    <Chip
      color={requirement.passed ? 'success' : 'default'}
      icon={requirement.passed ? <CheckCircleIcon weight="fill" /> : <XCircleIcon weight="fill" />}
      label={getRequirementLabel(requirement.key, t)}
      size="small"
      variant={requirement.passed ? 'soft' : 'outlined'}
    />
  );
}

function getStatusLabel({
  error,
  isLoading,
  isPublished,
  missingCount,
  publication,
  t,
}: {
  error: string;
  isLoading: boolean;
  isPublished: boolean;
  missingCount: number;
  publication: ProfilePublication;
  t: (key: string, options?: Record<string, unknown>) => string;
}): string {
  if (isLoading) {
    return t('dashboard.profiles.detail.publicationDock.loading');
  }

  if (error) {
    return error;
  }

  if (isPublished) {
    return t('dashboard.profiles.detail.publicationDock.published');
  }

  if (publication.can_activate) {
    return t('dashboard.profiles.detail.publicationDock.ready');
  }

  return t('dashboard.profiles.detail.publicationDock.blocked', { count: missingCount });
}

function getRequirementLabel(key: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  return t(`dashboard.profiles.detail.publicationDock.requirements.${key}`, {
    defaultValue: key,
  });
}

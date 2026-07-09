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
import { useParams } from 'react-router-dom';

import type { Profile, ProfilePublication, ProfilePublicationRequirement } from '@/lib/profiles/api-client';
import { activateProfile, deactivateProfile, getProfile } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { usePathname } from '@/hooks/use-pathname';
import { toast } from '@/components/core/toaster';

const emptyPublication = {
  can_activate: false,
  is_published: false,
  missing: [],
  requirements: [],
} satisfies ProfilePublication;

export function ProfilePublicationDock(): React.JSX.Element | null {
  const pathname = usePathname();
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [missingDialogOpen, setMissingDialogOpen] = React.useState<boolean>(false);

  const loadProfile = React.useCallback(async (): Promise<void> => {
    if (!profileId) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      setProfile(await getProfile(profileId));
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
  const isPublished = Boolean(publication.is_published);

  const handlePrimaryAction = React.useCallback(async (): Promise<void> => {
    if (!profileId || !profile) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isPublished && !publication.can_activate) {
        const refreshedProfile = await getProfile(profileId);
        const refreshedPublication = refreshedProfile.publication ?? emptyPublication;

        setProfile(refreshedProfile);

        if (!refreshedPublication.can_activate) {
          setMissingDialogOpen(true);
          return;
        }
      }

      const nextProfile = isPublished ? await deactivateProfile(profileId) : await activateProfile(profileId);
      setProfile(nextProfile);
      window.dispatchEvent(new Event('profile-publication:changed'));
      toast.success(
        isPublished
          ? t('dashboard.profiles.detail.publicationDock.toasts.deactivated')
          : t('dashboard.profiles.detail.publicationDock.toasts.activated')
      );
    } catch (err) {
      logger.error(err);
      toast.error(err instanceof Error ? err.message : t('dashboard.profiles.detail.publicationDock.toasts.error'));
      await loadProfile();
    } finally {
      setIsSubmitting(false);
    }
  }, [isPublished, loadProfile, profile, profileId, publication.can_activate, t]);

  if (!profileId) {
    return null;
  }

  const statusColor = error ? 'error' : isPublished ? 'success' : publication.can_activate ? 'warning' : 'error';
  const statusLabel = getStatusLabel({ error, isLoading, isPublished, missingCount: missingRequirements.length, publication, t });

  return (
    <React.Fragment>
      <Paper
        elevation={16}
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
                <WarningCircleIcon color="var(--mui-palette-error-main)" fontSize="var(--icon-fontSize-md)" weight="fill" />
              ) : isPublished ? (
                <CheckCircleIcon color="var(--mui-palette-success-main)" fontSize="var(--icon-fontSize-md)" weight="fill" />
              ) : (
                <RocketLaunchIcon color={`var(--mui-palette-${statusColor}-main)`} fontSize="var(--icon-fontSize-md)" weight="fill" />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap variant="subtitle2">
                {t('dashboard.profiles.detail.publicationDock.title')}
              </Typography>
              <Typography color={error ? 'error.main' : 'text.secondary'} component="div" noWrap variant="caption">
                {statusLabel}
              </Typography>
              {!isLoading && !error && requirements.length > 0 ? (
                <Typography color="text.secondary" component="div" noWrap sx={{ display: { sm: 'none' }, mt: 0.25 }} variant="caption">
                  {t('dashboard.profiles.detail.publicationDock.readyCount', {
                    passed: completedRequirements,
                    total: requirements.length,
                  })}
                </Typography>
              ) : null}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap', gap: 1, minWidth: 0 }}>
            {requirements.map((requirement) => (
              <RequirementChip key={requirement.key} requirement={requirement} t={t} />
            ))}
          </Stack>

          <Button
            color={isPublished ? 'warning' : publication.can_activate ? 'primary' : 'inherit'}
            disabled={isLoading || isSubmitting || Boolean(error)}
            onClick={handlePrimaryAction}
            startIcon={isPublished ? <PowerIcon /> : <RocketLaunchIcon />}
            sx={{ justifySelf: { xs: 'stretch', md: 'end' }, whiteSpace: 'nowrap' }}
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
                <ListItem key={requirement.key} disableGutters>
                  <ListItemIcon sx={{ minWidth: 34 }}>
                    <XCircleIcon color="var(--mui-palette-error-main)" fontSize="var(--icon-fontSize-md)" weight="fill" />
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
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
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

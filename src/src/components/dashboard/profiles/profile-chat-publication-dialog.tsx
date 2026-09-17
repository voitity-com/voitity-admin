'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Power as PowerIcon } from '@phosphor-icons/react/dist/ssr/Power';
import { RocketLaunch as RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { XCircle as XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import { trackAnalyticsEvent } from '@/lib/google-analytics';
import type { Profile, ProfilePublication } from '@/lib/profiles/api-client';
import { activateProfile, deactivateProfile, getProfile, ProfileApiError } from '@/lib/profiles/api-client';
import { isPublishedProfile } from '@/lib/profiles/public-profile-url';
import { toast } from '@/components/core/toaster';

const emptyPublication = {
  can_activate: false,
  is_published: false,
  missing: [],
  requirements: [],
} satisfies ProfilePublication;

interface ProfileChatPublicationDialogProps {
  onClose: () => void;
  onProfileChange: (profile: Profile, refreshChat?: boolean) => void;
  open: boolean;
  profile: Profile;
}

export function ProfileChatPublicationDialog({
  onClose,
  onProfileChange,
  open,
  profile,
}: ProfileChatPublicationDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activationBlock, setActivationBlock] = React.useState<'limit' | 'subscription' | null>(null);
  const isPublished = isPublishedProfile(profile);
  const publication = profile.publication ?? emptyPublication;
  const requirements = publication.requirements ?? [];
  const canPublish = !isPublished && publication.can_activate && !activationBlock && !error;

  React.useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    setError('');
    setActivationBlock(null);
    setIsLoading(true);

    getProfile(profile.id)
      .then((nextProfile) => {
        if (isMounted) {
          onProfileChange(nextProfile);
        }
      })
      .catch((loadError: unknown) => {
        logger.error(loadError);

        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t('dashboard.profiles.detail.profileChat.publication.loadError')
          );
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
  }, [onProfileChange, open, profile.id, t]);

  const handleClose = React.useCallback((): void => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  const handleConfirm = React.useCallback(async (): Promise<void> => {
    setIsSubmitting(true);
    setError('');

    try {
      let nextProfile: Profile;

      if (isPublished) {
        nextProfile = await deactivateProfile(profile.id);
      } else {
        const refreshedProfile = await getProfile(profile.id);

        onProfileChange(refreshedProfile);

        if (!refreshedProfile.publication?.can_activate) {
          return;
        }

        nextProfile = await activateProfile(profile.id);
        trackAnalyticsEvent('profile_published', { publication_surface: 'profile_chat' });
      }

      onProfileChange(nextProfile, true);
      window.dispatchEvent(new Event('profile-publication:changed'));
      toast.success(
        isPublished
          ? t('dashboard.profiles.detail.publicationDock.toasts.deactivated')
          : t('dashboard.profiles.detail.publicationDock.toasts.activated')
      );
      onClose();
    } catch (submitError) {
      logger.error(submitError);

      if (!isPublished && submitError instanceof ProfileApiError) {
        if (submitError.status === 402) {
          setActivationBlock('subscription');
          return;
        }

        if (submitError.status === 409 && submitError.errors.profiles) {
          setActivationBlock('limit');
          return;
        }
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : t('dashboard.profiles.detail.publicationDock.toasts.error')
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [isPublished, onClose, onProfileChange, profile.id, t]);

  return (
    <Dialog
      PaperProps={{ sx: { m: { sm: 3, xs: 2 }, width: { sm: '100%', xs: 'calc(100% - 32px)' } } }}
      fullWidth
      maxWidth="sm"
      onClose={handleClose}
      open={open}
    >
      <DialogTitle>
        {isPublished
          ? t('dashboard.profiles.detail.profileChat.publication.deactivateTitle')
          : t('dashboard.profiles.detail.profileChat.publication.publishTitle')}
      </DialogTitle>
      <DialogContent>
        {isPublished ? (
          <Stack spacing={2}>
            <Alert color="warning">
              {t('dashboard.profiles.detail.profileChat.publication.deactivateDescription')}
            </Alert>
            {error ? <Alert color="error">{error}</Alert> : null}
          </Stack>
        ) : (
          <Stack spacing={2}>
            {isLoading ? (
              <Stack sx={{ alignItems: 'center', py: 3 }}>
                <CircularProgress />
              </Stack>
            ) : null}
            {!isLoading && error ? <Alert color="error">{error}</Alert> : null}
            {!isLoading && !error ? (
              <Alert color={canPublish ? 'success' : 'warning'}>
                {canPublish
                  ? t('dashboard.profiles.detail.profileChat.publication.readyDescription')
                  : t('dashboard.profiles.detail.profileChat.publication.missingDescription')}
              </Alert>
            ) : null}
            {!isLoading && activationBlock ? (
              <Alert color="warning">
                {activationBlock === 'subscription'
                  ? t('dashboard.profiles.detail.publicationDock.activationBlocks.subscriptionDescription')
                  : t('dashboard.profiles.detail.publicationDock.activationBlocks.limitDescription')}
              </Alert>
            ) : null}
            {!isLoading && requirements.length > 0 ? (
              <List disablePadding>
                {requirements.map((requirement) => (
                  <ListItem disableGutters key={requirement.key}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {requirement.passed ? (
                        <CheckCircleIcon
                          color="var(--mui-palette-success-main)"
                          fontSize="var(--icon-fontSize-lg)"
                          weight="fill"
                        />
                      ) : (
                        <XCircleIcon
                          color="var(--mui-palette-error-main)"
                          fontSize="var(--icon-fontSize-lg)"
                          weight="fill"
                        />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(`dashboard.profiles.detail.publicationDock.requirements.${requirement.key}`, {
                        defaultValue: requirement.key,
                      })}
                      secondary={
                        requirement.passed
                          ? t('dashboard.profiles.detail.profileChat.publication.requirementComplete')
                          : t('dashboard.profiles.detail.profileChat.publication.requirementMissing')
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button disabled={isSubmitting} onClick={handleClose}>
          {t('dashboard.profiles.actions.cancel')}
        </Button>
        <Button
          color={isPublished ? 'error' : 'success'}
          disabled={isSubmitting || isLoading || (!isPublished && !canPublish)}
          onClick={handleConfirm}
          startIcon={
            isSubmitting ? (
              <CircularProgress color="inherit" size={16} />
            ) : isPublished ? (
              <PowerIcon />
            ) : (
              <RocketLaunchIcon />
            )
          }
          variant="contained"
        >
          {isPublished
            ? t('dashboard.profiles.detail.profileChat.publication.deactivateAction')
            : t('dashboard.profiles.detail.profileChat.publication.publishAction')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { trackAnalyticsEvent } from '@/lib/google-analytics';
import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';
import { createProfile, getProfile, listProfiles, ProfileApiError, updateProfile } from '@/lib/profiles/api-client';
import { saveLastVisitedProfileId } from '@/lib/profiles/last-visited-profile';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import {
  canCreateProfileWithLimit,
  getProfileCreationLimit,
  isSingleProfilePlan,
} from '@/lib/subscription/profile-limits';
import { toast } from '@/components/core/toaster';
import { ProfileFormDialog } from '@/components/dashboard/profiles/profile-form-dialog';
import { ProfileSocialNetworksDialog } from '@/components/dashboard/profiles/profile-social-networks-dialog';

const metadata = { title: `Profile chat | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectorAnchor, setSelectorAnchor] = React.useState<HTMLElement | null>(null);
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editFormOpen, setEditFormOpen] = React.useState(false);
  const [socialNetworksOpen, setSocialNetworksOpen] = React.useState(false);
  const [canCreateProfile, setCanCreateProfile] = React.useState(false);
  const [chatRevision, setChatRevision] = React.useState(0);
  const chatIframeRef = React.useRef<HTMLIFrameElement | null>(null);

  React.useEffect(() => {
    if (profileId) {
      saveLastVisitedProfileId(profileId);
    }
  }, [profileId]);

  React.useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError('');

    listProfiles()
      .then(async (nextProfiles) => {
        const listedProfile = nextProfiles.find((item) => String(item.id) === profileId);
        const nextProfile = listedProfile ?? (await getProfile(profileId));

        if (isMounted) {
          setProfiles(nextProfiles);
          setProfile(nextProfile);
        }
      })
      .catch((loadError) => {
        logger.error(loadError);

        if (isMounted) {
          setProfiles([]);
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

  React.useEffect(() => {
    let isMounted = true;

    getSubscriptionLimits()
      .then((limits) => {
        if (!isMounted) {
          return;
        }

        const profileLimit = getProfileCreationLimit(limits);
        setCanCreateProfile(
          !isSingleProfilePlan(limits) && canCreateProfileWithLimit(profiles.length, profileLimit)
        );
      })
      .catch((subscriptionError) => {
        if (!(subscriptionError instanceof SubscriptionApiError && subscriptionError.status === 404)) {
          logger.error(subscriptionError);
        }

        if (isMounted) {
          setCanCreateProfile(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [profiles.length]);

  React.useEffect(() => {
    const publicProfileOrigin = getPublicProfileOrigin();

    const handleProfileChatMessage = (event: MessageEvent): void => {
      if (
        event.origin !== publicProfileOrigin ||
        event.source !== chatIframeRef.current?.contentWindow ||
        !isProfileAdminActionMessage(event.data)
      ) {
        return;
      }

      if (event.data.type === 'bigmelo:admin-edit-profile') {
        setEditFormOpen(true);
      } else {
        setSocialNetworksOpen(true);
      }
    };

    window.addEventListener('message', handleProfileChatMessage);

    return () => {
      window.removeEventListener('message', handleProfileChatMessage);
    };
  }, []);

  const handleProfileSelect = React.useCallback(
    (nextProfile: Profile): void => {
      setSelectorAnchor(null);
      navigate(paths.dashboard.profileDetails.profileChat(String(nextProfile.id)));
    },
    [navigate]
  );

  const handleFormSubmit = React.useCallback(
    async (payload: ProfilePayload): Promise<void> => {
      try {
        const createdProfile = await createProfile(payload);
        trackAnalyticsEvent('profile_created', { creation_surface: 'profile_chat_selector' });
        toast.success(t('dashboard.profiles.list.toasts.created'));
        setCreateFormOpen(false);
        saveLastVisitedProfileId(createdProfile.id);
        navigate(paths.dashboard.profileDetails.profileChat(String(createdProfile.id)));
      } catch (submitError) {
        if (!(submitError instanceof ProfileApiError && Object.keys(submitError.errors).length > 0)) {
          toast.error(getErrorMessage(submitError, t('dashboard.profiles.errors.generic')));
        }

        throw submitError;
      }
    },
    [navigate, t]
  );

  const handleEditSubmit = React.useCallback(
    async (payload: ProfilePayload): Promise<void> => {
      if (!profile) {
        return;
      }

      try {
        const updatedProfile = await updateProfile(profile.id, payload);
        setProfile(updatedProfile);
        setProfiles((currentProfiles) =>
          currentProfiles.map((item) => (String(item.id) === String(updatedProfile.id) ? updatedProfile : item))
        );
        setChatRevision((currentRevision) => currentRevision + 1);
        setEditFormOpen(false);
        window.dispatchEvent(new Event('profile-publication:refresh'));
        toast.success(t('dashboard.profiles.detail.profile.toasts.updated'));
      } catch (submitError) {
        if (!(submitError instanceof ProfileApiError && Object.keys(submitError.errors).length > 0)) {
          toast.error(getErrorMessage(submitError, t('dashboard.profiles.detail.errors.generic')));
        }

        throw submitError;
      }
    },
    [profile, t]
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
          flexDirection: 'column',
          height: 'calc(100dvh - var(--MainNav-height, 64px))',
          minHeight: 560,
          overflow: 'hidden',
          px: { sm: 2, xs: 0 },
          py: { sm: 1.5, xs: 1 },
        }}
      >
        {error ? <Alert color="error">{error}</Alert> : null}
        {isLoading ? <CircularProgress sx={{ my: 'auto' }} /> : null}
        {!isLoading && !error && profile?.alias ? (
          <Stack spacing={1} sx={{ height: '100%', maxWidth: '100%', minHeight: 0, width: 430 }}>
            <Button
              aria-controls={selectorAnchor ? 'profile-chat-selector' : undefined}
              aria-expanded={Boolean(selectorAnchor)}
              aria-haspopup="dialog"
              endIcon={<CaretDownIcon />}
              onClick={(event) => {
                setSelectorAnchor(event.currentTarget);
              }}
              sx={{ alignSelf: 'center', color: 'text.primary', flex: '0 0 auto', textTransform: 'none' }}
              variant="text"
            >
              <Typography component="span" fontWeight={600} variant="subtitle1">
                @{profile.alias}
              </Typography>
            </Button>
            <ProfileSelector
              anchorEl={selectorAnchor}
              canCreateProfile={canCreateProfile}
              currentProfileId={profileId}
              onClose={() => {
                setSelectorAnchor(null);
              }}
              onCreate={() => {
                setSelectorAnchor(null);
                setCreateFormOpen(true);
              }}
              onSelect={handleProfileSelect}
              profiles={profiles}
            />
            <Paper elevation={8} sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', width: '100%' }}>
              <Box
                allow="microphone"
                component="iframe"
                ref={chatIframeRef}
                sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                src={buildPublicProfileUrl(profile.alias, chatRevision)}
                sx={{ border: 0, display: 'block', height: '100%', width: '100%' }}
                title={String(t('dashboard.profiles.detail.widgetLauncher.preview.iframeTitle'))}
              />
            </Paper>
          </Stack>
        ) : null}
        {!isLoading && !error && !profile?.alias ? (
          <Stack sx={{ maxWidth: 520, width: '100%' }}>
            <Alert color="warning">{t('dashboard.profiles.detail.errors.generic')}</Alert>
          </Stack>
        ) : null}
      </Box>
      <ProfileFormDialog
        onClose={() => {
          setCreateFormOpen(false);
        }}
        onSubmit={handleFormSubmit}
        open={createFormOpen}
        profile={null}
      />
      <ProfileFormDialog
        onClose={() => {
          setEditFormOpen(false);
        }}
        onSubmit={handleEditSubmit}
        open={editFormOpen}
        profile={profile}
      />
      {profile ? (
        <ProfileSocialNetworksDialog
          onClose={() => {
            setSocialNetworksOpen(false);
          }}
          onSaved={(updatedProfile) => {
            setProfile(updatedProfile);
            setProfiles((currentProfiles) =>
              currentProfiles.map((item) =>
                String(item.id) === String(updatedProfile.id) ? updatedProfile : item
              )
            );
            setChatRevision((currentRevision) => currentRevision + 1);
          }}
          open={socialNetworksOpen}
          profileId={profile.id}
        />
      ) : null}
    </React.Fragment>
  );
}

interface ProfileSelectorProps {
  anchorEl: HTMLElement | null;
  canCreateProfile: boolean;
  currentProfileId: string;
  onClose: () => void;
  onCreate: () => void;
  onSelect: (profile: Profile) => void;
  profiles: Profile[];
}

function ProfileSelector({
  anchorEl,
  canCreateProfile,
  currentProfileId,
  onClose,
  onCreate,
  onSelect,
  profiles,
}: ProfileSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      id="profile-chat-selector"
      onClose={onClose}
      open={Boolean(anchorEl)}
      slotProps={{ paper: { sx: { maxWidth: 'calc(100vw - 32px)', mt: 0.5, width: 320 } } }}
      transformOrigin={{ horizontal: 'center', vertical: 'top' }}
    >
      <Typography color="text.secondary" sx={{ px: 2, pb: 0.75, pt: 1.5 }} variant="overline">
        {t('dashboard.profiles.detail.profileChat.chooseProfile')}
      </Typography>
      <List disablePadding sx={{ maxHeight: 300, overflowY: 'auto', py: 0.5 }}>
        {profiles.map((item) => {
          const selected = String(item.id) === currentProfileId;

          return (
            <ListItemButton
              key={item.id}
              onClick={() => {
                onSelect(item);
              }}
              selected={selected}
            >
              <ListItemText
                primary={`@${item.alias || item.name}`}
                primaryTypographyProps={{ fontWeight: selected ? 600 : 400 }}
                secondary={item.alias ? item.name : undefined}
              />
              {selected ? <CheckIcon aria-hidden="true" /> : null}
            </ListItemButton>
          );
        })}
      </List>
      {canCreateProfile ? (
        <React.Fragment>
          <Divider />
          <Box sx={{ p: 1 }}>
            <Button fullWidth onClick={onCreate} startIcon={<PlusIcon />} variant="text">
              {t('dashboard.profiles.actions.createProfile')}
            </Button>
          </Box>
        </React.Fragment>
      ) : null}
    </Popover>
  );
}

function buildPublicProfileUrl(alias: string, revision: number): string {
  const webBaseUrl = (config.publicProfile?.baseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  const searchParams = new URLSearchParams({ admin_preview: '1', revision: String(revision) });
  return `${webBaseUrl}/${encodeURIComponent(alias)}?${searchParams.toString()}`;
}

function getPublicProfileOrigin(): string {
  return new URL(config.publicProfile?.baseUrl || 'http://localhost:3001').origin;
}

interface ProfileAdminActionMessage {
  type: 'bigmelo:admin-edit-profile' | 'bigmelo:admin-edit-social-networks';
}

function isProfileAdminActionMessage(value: unknown): value is ProfileAdminActionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'bigmelo:admin-edit-profile' || value.type === 'bigmelo:admin-edit-social-networks')
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

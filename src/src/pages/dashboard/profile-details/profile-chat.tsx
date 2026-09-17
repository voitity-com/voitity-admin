'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowSquareOut as ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { ChatText as ChatTextIcon } from '@phosphor-icons/react/dist/ssr/ChatText';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Database as DatabaseIcon } from '@phosphor-icons/react/dist/ssr/Database';
import { Desktop as DesktopIcon } from '@phosphor-icons/react/dist/ssr/Desktop';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { Gear as GearIcon } from '@phosphor-icons/react/dist/ssr/Gear';
import { ImagesSquare as ImagesSquareIcon } from '@phosphor-icons/react/dist/ssr/ImagesSquare';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Palette as PaletteIcon } from '@phosphor-icons/react/dist/ssr/Palette';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Power as PowerIcon } from '@phosphor-icons/react/dist/ssr/Power';
import { RocketLaunch as RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { trackAnalyticsEvent } from '@/lib/google-analytics';
import type { Profile, ProfileAdminPreview, ProfilePayload } from '@/lib/profiles/api-client';
import {
  createProfile,
  getProfile,
  getProfileAdminPreview,
  listProfiles,
  ProfileApiError,
  updateProfile,
} from '@/lib/profiles/api-client';
import { saveLastVisitedProfileId } from '@/lib/profiles/last-visited-profile';
import { getPublicProfileUrl, isPublishedProfile } from '@/lib/profiles/public-profile-url';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import {
  canCreateProfileWithLimit,
  getProfileCreationLimit,
  isSingleProfilePlan,
} from '@/lib/subscription/profile-limits';
import { toast } from '@/components/core/toaster';
import { ProfileChatPublicationDialog } from '@/components/dashboard/profiles/profile-chat-publication-dialog';
import { ProfileFormDialog } from '@/components/dashboard/profiles/profile-form-dialog';
import { ProfileSocialNetworksDialog } from '@/components/dashboard/profiles/profile-social-networks-dialog';
import { ProfileTemplatePickerDialog } from '@/components/dashboard/profiles/profile-template-picker-dialog';

const metadata = { title: `Profile chat | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const ProfileAvatarPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/avatar');
  return { default: module.Page };
});
const ProfileVoicePage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/voice');
  return { default: module.Page };
});
const ProfileMessagesPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/messages');
  return { default: module.Page };
});
const ProfileSourcesPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/sources');
  return { default: module.Page };
});
const ProfileIntegrationsPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/integrations');
  return { default: module.Page };
});
const ProfileProductsPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/products');
  return { default: module.Page };
});
const ProfileChatsPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/chats');
  return { default: module.Page };
});
const ProfileQualityPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/quality');
  return { default: module.Page };
});
const ProfileInsightsPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/insights');
  return { default: module.Page };
});
const ProfileSettingsPage = React.lazy(async () => {
  const module = await import('@/pages/dashboard/profile-details/settings');
  return { default: module.Page };
});

type ProfileMediaEditor = 'avatar' | 'messages' | 'voice';
type ProfileSectionEditor = 'chats' | 'insights' | 'integrations' | 'products' | 'quality' | 'settings';
type ProfileChatNavTone = 'default' | 'error' | 'success';

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [adminPreview, setAdminPreview] = React.useState<null | ProfileAdminPreview>(null);
  const [adminPreviewError, setAdminPreviewError] = React.useState('');
  const [selectorAnchor, setSelectorAnchor] = React.useState<HTMLElement | null>(null);
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editFormOpen, setEditFormOpen] = React.useState(false);
  const [socialNetworksOpen, setSocialNetworksOpen] = React.useState(false);
  const [mediaMenuOpen, setMediaMenuOpen] = React.useState(false);
  const [mediaEditor, setMediaEditor] = React.useState<null | ProfileMediaEditor>(null);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [sourcesOpen, setSourcesOpen] = React.useState(false);
  const [sectionEditor, setSectionEditor] = React.useState<null | ProfileSectionEditor>(null);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [webVersionOpen, setWebVersionOpen] = React.useState(false);
  const [publicationDialogOpen, setPublicationDialogOpen] = React.useState(false);
  const [canCreateProfile, setCanCreateProfile] = React.useState(false);
  const [chatRevision, setChatRevision] = React.useState(0);
  const chatIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const webChatIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const mobileNavGestureRef = React.useRef<null | { pointerId: number; startX: number }>(null);

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

    if (!profileId) {
      setAdminPreview(null);
      return undefined;
    }

    setAdminPreview(null);
    setAdminPreviewError('');

    getProfileAdminPreview(profileId)
      .then((nextPreview) => {
        if (isMounted) {
          setAdminPreview(nextPreview);
        }
      })
      .catch((previewError) => {
        logger.error(previewError);

        if (isMounted) {
          setAdminPreviewError(t('dashboard.profiles.detail.errors.generic'));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chatRevision, profileId, t]);

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

  const postAdminPreview = React.useCallback(
    (targetWindow: null | Window): void => {
      if (!adminPreview || !targetWindow) {
        return;
      }

      targetWindow.postMessage(
        {
          payload: adminPreview,
          type: 'bigmelo:admin-profile-preview',
        },
        getPublicProfileOrigin()
      );
    },
    [adminPreview]
  );

  React.useEffect(() => {
    postAdminPreview(chatIframeRef.current?.contentWindow ?? null);
    postAdminPreview(webChatIframeRef.current?.contentWindow ?? null);
  }, [postAdminPreview]);

  React.useEffect(() => {
    const publicProfileOrigin = getPublicProfileOrigin();

    const handleProfileChatMessage = (event: MessageEvent): void => {
      const chatWindow = chatIframeRef.current?.contentWindow ?? null;
      const webChatWindow = webChatIframeRef.current?.contentWindow ?? null;
      const sourceWindow = event.source === chatWindow ? chatWindow : event.source === webChatWindow ? webChatWindow : null;

      if (event.origin !== publicProfileOrigin || !sourceWindow) {
        return;
      }

      if (isProfileAdminPreviewReadyMessage(event.data)) {
        postAdminPreview(sourceWindow);
        return;
      }

      if (!isProfileAdminActionMessage(event.data)) {
        return;
      }

      if (event.data.type === 'bigmelo:admin-edit-profile') {
        setEditFormOpen(true);
      } else if (event.data.type === 'bigmelo:admin-edit-social-networks') {
        setSocialNetworksOpen(true);
      } else {
        setMediaMenuOpen(true);
      }
    };

    window.addEventListener('message', handleProfileChatMessage);

    return () => {
      window.removeEventListener('message', handleProfileChatMessage);
    };
  }, [postAdminPreview]);

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

  const closeMobileNavAndRun = React.useCallback((action: () => void): void => {
    setMobileNavOpen(false);
    action();
  }, []);

  const handleMobileNavPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse') {
      return;
    }

    mobileNavGestureRef.current = { pointerId: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleMobileNavPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    const gesture = mobileNavGestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (gesture.startX - event.clientX >= 32) {
      setMobileNavOpen(true);
      mobileNavGestureRef.current = null;
    }
  }, []);

  const clearMobileNavGesture = React.useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    mobileNavGestureRef.current = null;
  }, []);

  const handlePublicationProfileChange = React.useCallback((nextProfile: Profile, refreshChat = false): void => {
    setProfile(nextProfile);
    setProfiles((currentProfiles) =>
      currentProfiles.map((item) => (String(item.id) === String(nextProfile.id) ? nextProfile : item))
    );

    if (refreshChat) {
      setChatRevision((currentRevision) => currentRevision + 1);
    }
  }, []);

  const isPublished = profile ? isPublishedProfile(profile) : false;
  const publicProfileUrl = profile && isPublished ? getPublicProfileUrl(profile) : null;

  const profileChatNavItems: ProfileChatNavItem[] = [
    {
      icon: <PaletteIcon />,
      key: 'templates',
      label: String(t('dashboard.profiles.detail.widgetLauncher.templateEditor.tabs.templates')),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setTemplatesOpen(true);
        });
      },
    },
    {
      icon: <DatabaseIcon />,
      key: 'data',
      label: String(t('dashboard.profiles.detail.nav.data')),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setSourcesOpen(true);
        });
      },
    },
    {
      icon: <PlugsConnectedIcon />,
      key: 'integrations',
      label: String(t('dashboard.profiles.detail.nav.integrations')),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setSectionEditor('integrations');
        });
      },
    },
    {
      icon: <PackageIcon />,
      key: 'products',
      label: String(t('dashboard.profiles.detail.nav.products')),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setSectionEditor('products');
        });
      },
    },
    {
      icon: <ChatsCircleIcon />,
      key: 'chats',
      label: String(t('dashboard.profiles.detail.nav.chats')),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setSectionEditor('chats');
        });
      },
    },
    {
      icon: <GaugeIcon />,
      key: 'quality',
      label: String(t('dashboard.profiles.detail.nav.quality')),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setSectionEditor('quality');
        });
      },
    },
    {
      icon: <ChartLineUpIcon />,
      key: 'insights',
      label: String(t('dashboard.profiles.detail.nav.insights')),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setSectionEditor('insights');
        });
      },
    },
    {
      icon: <GearIcon />,
      key: 'settings',
      label: String(t('dashboard.profiles.detail.nav.settings')),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setSectionEditor('settings');
        });
      },
    },
    {
      desktopOnly: true,
      icon: <DesktopIcon />,
      key: 'web-version',
      label: String(t('dashboard.profiles.detail.profileChat.webVersion.title')),
      onClick: () => {
        setWebVersionOpen(true);
      },
    },
    ...(publicProfileUrl
      ? [
          {
            icon: <ArrowSquareOutIcon />,
            key: 'view-profile',
            label: String(t('dashboard.profiles.actions.viewProfile')),
            onClick: () => {
              closeMobileNavAndRun(() => {
                window.open(publicProfileUrl, '_blank', 'noopener,noreferrer');
              });
            },
          } satisfies ProfileChatNavItem,
        ]
      : []),
    {
      icon: isPublished ? <PowerIcon /> : <RocketLaunchIcon />,
      key: 'publication',
      label: String(
        t(
          isPublished
            ? 'dashboard.profiles.detail.profileChat.publication.deactivateItem'
            : 'dashboard.profiles.detail.profileChat.publication.publishItem'
        )
      ),
      onClick: () => {
        closeMobileNavAndRun(() => {
          setPublicationDialogOpen(true);
        });
      },
      tone: isPublished ? 'error' : 'success',
    },
  ];
  const mobileProfileChatNavItems = profileChatNavItems.filter((item) => !item.desktopOnly);

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
          px: { sm: 2, xs: 1.5 },
          py: { sm: 1.5, xs: 1 },
        }}
      >
        {error ? <Alert color="error">{error}</Alert> : null}
        {isLoading ? <CircularProgress sx={{ my: 'auto' }} /> : null}
        {!isLoading && !error && profile?.alias ? (
          <Box sx={{ height: '100%', maxWidth: '100%', position: 'relative', width: 430 }}>
            <Stack spacing={1} sx={{ height: '100%', minHeight: 0, width: '100%' }}>
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
                <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography
                    color={isPublished ? 'success.main' : 'error.main'}
                    component="span"
                    fontWeight={700}
                    variant="caption"
                  >
                    {t(
                      isPublished
                        ? 'dashboard.profiles.detail.profileChat.publication.published'
                        : 'dashboard.profiles.detail.profileChat.publication.unpublished'
                    )}
                  </Typography>
                  <Typography component="span" fontWeight={600} variant="subtitle1">
                    @{profile.alias}
                  </Typography>
                </Stack>
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
                {adminPreviewError ? (
                  <Stack sx={{ alignItems: 'center', height: '100%', justifyContent: 'center', p: 3 }}>
                    <Alert color="error">{adminPreviewError}</Alert>
                  </Stack>
                ) : (
                  <Box
                    allow="microphone"
                    component="iframe"
                    onLoad={() => {
                      postAdminPreview(chatIframeRef.current?.contentWindow ?? null);
                    }}
                    ref={chatIframeRef}
                    sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                    src={buildPublicProfileUrl(profile.alias, chatRevision)}
                    sx={{ border: 0, display: 'block', height: '100%', width: '100%' }}
                    title={String(t('dashboard.profiles.detail.widgetLauncher.preview.iframeTitle'))}
                  />
                )}
              </Paper>
            </Stack>
            <Stack
              sx={{
                display: { sm: 'flex', xs: 'none' },
                left: { sm: 'calc(100% + 16px)', xs: 'auto' },
                position: 'absolute',
                right: { sm: 'auto', xs: 8 },
                top: 48,
                zIndex: 2,
              }}
            >
              {profileChatNavItems.map((item) => (
                <ProfileChatNavButton {...item} key={item.key} />
              ))}
            </Stack>
            <Paper
              aria-label={String(t('dashboard.profiles.detail.profileChat.mobileMenu.open'))}
              elevation={5}
              onClick={() => {
                setMobileNavOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setMobileNavOpen(true);
                }
              }}
              onMouseEnter={() => {
                setMobileNavOpen(true);
              }}
              onPointerCancel={clearMobileNavGesture}
              onPointerDown={handleMobileNavPointerDown}
              onPointerMove={handleMobileNavPointerMove}
              onPointerUp={clearMobileNavGesture}
              role="button"
              sx={{
                bgcolor: 'common.white',
                border: 0,
                borderRadius: 2,
                display: { sm: 'none', xs: 'flex' },
                flexDirection: 'column',
                maxHeight: 'calc(100dvh - 144px)',
                overflowY: 'auto',
                outline: 'none',
                p: 0.5,
                position: 'fixed',
                right: 6,
                touchAction: 'pan-y',
                top: 'calc(var(--MainNav-height, 64px) + 48px)',
                zIndex: 'var(--mui-zIndex-speedDial)',
              }}
              tabIndex={0}
            >
              {mobileProfileChatNavItems.map((item) => (
                <Box
                  aria-hidden="true"
                  key={item.key}
                  sx={{
                    alignItems: 'center',
                    color: getProfileChatNavColor(item.tone, true),
                    display: 'flex',
                    height: 34,
                    justifyContent: 'center',
                    width: 34,
                  }}
                >
                  {item.icon}
                </Box>
              ))}
            </Paper>
          </Box>
        ) : null}
        {!isLoading && !error && !profile?.alias ? (
          <Stack sx={{ maxWidth: 520, width: '100%' }}>
            <Alert color="warning">{t('dashboard.profiles.detail.errors.generic')}</Alert>
          </Stack>
        ) : null}
      </Box>
      <Modal
        onClose={() => {
          setMobileNavOpen(false);
        }}
        open={mobileNavOpen}
        slotProps={{ backdrop: { sx: { bgcolor: 'transparent' } } }}
      >
        <Paper
          elevation={10}
          sx={{
            bgcolor: 'common.white',
            border: 0,
            borderRadius: 2,
            maxHeight: 'calc(100dvh - 144px)',
            overflowY: 'auto',
            outline: 'none',
            p: 0.75,
            position: 'fixed',
            right: 8,
            top: 'calc(var(--MainNav-height, 64px) + 48px)',
            width: 'min(210px, calc(100vw - 32px))',
          }}
        >
          {mobileProfileChatNavItems.map((item) => (
            <ProfileChatNavButton {...item} key={item.key} lightBackground />
          ))}
        </Paper>
      </Modal>
      <Dialog
        fullWidth
        maxWidth="xl"
        onClose={() => {
          setWebVersionOpen(false);
        }}
        open={webVersionOpen}
      >
        <DialogTitle>{t('dashboard.profiles.detail.profileChat.webVersion.title')}</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default', p: 0 }}>
          {profile?.alias && webVersionOpen ? (
            adminPreviewError ? (
              <Stack sx={{ alignItems: 'center', minHeight: 560, justifyContent: 'center', p: 3 }}>
                <Alert color="error">{adminPreviewError}</Alert>
              </Stack>
            ) : (
              <Box
                allow="microphone"
                component="iframe"
                onLoad={() => {
                  postAdminPreview(webChatIframeRef.current?.contentWindow ?? null);
                }}
                ref={webChatIframeRef}
                sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                src={buildPublicProfileUrl(profile.alias, chatRevision)}
                sx={{
                  border: 0,
                  display: 'block',
                  height: 'min(800px, calc(100dvh - 190px))',
                  minHeight: 560,
                  width: '100%',
                }}
                title={String(t('dashboard.profiles.detail.profileChat.webVersion.iframeTitle'))}
              />
            )
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setWebVersionOpen(false);
            }}
          >
            {t('dashboard.profiles.detail.profileChat.mediaMenu.close')}
          </Button>
        </DialogActions>
      </Dialog>
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
        <ProfileChatPublicationDialog
          onClose={() => {
            setPublicationDialogOpen(false);
          }}
          onProfileChange={handlePublicationProfileChange}
          open={publicationDialogOpen}
          profile={profile}
        />
      ) : null}
      {profile ? (
        <React.Fragment>
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
          <ProfileTemplatePickerDialog
            onClose={() => {
              setTemplatesOpen(false);
            }}
            onSaved={() => {
              setChatRevision((currentRevision) => currentRevision + 1);
            }}
            open={templatesOpen}
            profileId={profile.id}
            profileName={profile.name}
          />
        </React.Fragment>
      ) : null}
      <Dialog
        fullWidth
        maxWidth="xs"
        onClose={() => {
          setMediaMenuOpen(false);
        }}
        open={mediaMenuOpen}
      >
        <DialogTitle>{t('dashboard.profiles.detail.profileChat.mediaMenu.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Button
              fullWidth
              onClick={() => {
                setMediaMenuOpen(false);
                setMediaEditor('avatar');
              }}
              startIcon={<ImagesSquareIcon />}
              variant="outlined"
            >
              {t('dashboard.profiles.detail.profileChat.mediaMenu.editAvatar')}
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setMediaMenuOpen(false);
                setMediaEditor('voice');
              }}
              startIcon={<MicrophoneIcon />}
              variant="outlined"
            >
              {t('dashboard.profiles.detail.profileChat.mediaMenu.editVoice')}
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setMediaMenuOpen(false);
                setMediaEditor('messages');
              }}
              startIcon={<ChatTextIcon />}
              variant="outlined"
            >
              {t('dashboard.profiles.detail.profileChat.mediaMenu.editMessages')}
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="secondary"
            onClick={() => {
              setMediaMenuOpen(false);
            }}
          >
            {t('dashboard.profiles.actions.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        fullWidth
        maxWidth="lg"
        onClose={() => {
          setSourcesOpen(false);
        }}
        open={sourcesOpen}
      >
        <DialogTitle>{t('dashboard.profiles.detail.nav.data')}</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default', maxHeight: 'calc(100dvh - 160px)' }}>
          <React.Suspense
            fallback={
              <Stack sx={{ alignItems: 'center', p: 5 }}>
                <CircularProgress />
              </Stack>
            }
          >
            {sourcesOpen ? <ProfileSourcesPage /> : null}
          </React.Suspense>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSourcesOpen(false);
            }}
          >
            {t('dashboard.profiles.detail.profileChat.mediaMenu.close')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        fullWidth
        maxWidth="xl"
        onClose={() => {
          setSectionEditor(null);
          setChatRevision((currentRevision) => currentRevision + 1);
        }}
        open={sectionEditor !== null}
      >
        <DialogTitle>{sectionEditor ? getProfileSectionTitle(sectionEditor, t) : ''}</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default', maxHeight: 'calc(100dvh - 160px)' }}>
          <React.Suspense
            fallback={
              <Stack sx={{ alignItems: 'center', p: 5 }}>
                <CircularProgress />
              </Stack>
            }
          >
            {sectionEditor === 'integrations' ? <ProfileIntegrationsPage /> : null}
            {sectionEditor === 'products' ? <ProfileProductsPage /> : null}
            {sectionEditor === 'chats' ? <ProfileChatsPage /> : null}
            {sectionEditor === 'quality' ? <ProfileQualityPage /> : null}
            {sectionEditor === 'insights' ? <ProfileInsightsPage /> : null}
            {sectionEditor === 'settings' ? <ProfileSettingsPage /> : null}
          </React.Suspense>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSectionEditor(null);
              setChatRevision((currentRevision) => currentRevision + 1);
            }}
          >
            {t('dashboard.profiles.detail.profileChat.mediaMenu.close')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        fullWidth
        maxWidth="lg"
        onClose={() => {
          setMediaEditor(null);
          setChatRevision((currentRevision) => currentRevision + 1);
        }}
        open={mediaEditor !== null}
      >
        <DialogTitle>
          {mediaEditor === 'avatar'
            ? t('dashboard.profiles.detail.profileChat.mediaMenu.editAvatar')
            : mediaEditor === 'voice'
              ? t('dashboard.profiles.detail.profileChat.mediaMenu.editVoice')
              : t('dashboard.profiles.detail.profileChat.mediaMenu.editMessages')}
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default', maxHeight: 'calc(100dvh - 160px)' }}>
          <React.Suspense
            fallback={
              <Stack sx={{ alignItems: 'center', p: 5 }}>
                <CircularProgress />
              </Stack>
            }
          >
            {mediaEditor === 'avatar' ? <ProfileAvatarPage /> : null}
            {mediaEditor === 'voice' ? <ProfileVoicePage /> : null}
            {mediaEditor === 'messages' ? <ProfileMessagesPage /> : null}
          </React.Suspense>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMediaEditor(null);
              setChatRevision((currentRevision) => currentRevision + 1);
            }}
          >
            {t('dashboard.profiles.detail.profileChat.mediaMenu.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function getProfileSectionTitle(
  section: ProfileSectionEditor,
  t: ReturnType<typeof useTranslation>['t']
): string {
  switch (section) {
    case 'chats':
      return String(t('dashboard.profiles.detail.nav.chats'));
    case 'insights':
      return String(t('dashboard.profiles.detail.nav.insights'));
    case 'integrations':
      return String(t('dashboard.profiles.detail.nav.integrations'));
    case 'products':
      return String(t('dashboard.profiles.detail.nav.products'));
    case 'quality':
      return String(t('dashboard.profiles.detail.nav.quality'));
    case 'settings':
      return String(t('dashboard.profiles.detail.nav.settings'));
  }
}

function ProfileChatNavButton({
  desktopOnly = false,
  icon,
  label,
  lightBackground = false,
  onClick,
  tone = 'default',
}: {
  desktopOnly?: boolean;
  icon: React.ReactNode;
  label: string;
  lightBackground?: boolean;
  onClick: () => void;
  tone?: ProfileChatNavTone;
}): React.JSX.Element {
  return (
    <Button
      onClick={onClick}
      startIcon={icon}
      sx={{
        borderRadius: 1,
        color: getProfileChatNavColor(tone, lightBackground),
        display: desktopOnly ? { md: 'inline-flex', xs: 'none' } : 'inline-flex',
        justifyContent: 'flex-start',
        p: '6px 16px',
        textTransform: 'none',
        whiteSpace: 'nowrap',
        '&:hover': {
          bgcolor: lightBackground ? 'rgba(15, 23, 42, 0.06)' : 'var(--mui-palette-action-hover)',
          color: getProfileChatNavHoverColor(tone, lightBackground),
        },
        '& .MuiButton-startIcon': { mr: 1 },
      }}
      variant="text"
    >
      {label}
    </Button>
  );
}

interface ProfileChatNavItem {
  desktopOnly?: boolean;
  icon: React.ReactNode;
  key: string;
  label: string;
  onClick: () => void;
  tone?: ProfileChatNavTone;
}

function getProfileChatNavColor(tone: ProfileChatNavTone = 'default', lightBackground = false): string {
  if (tone === 'success') {
    return 'var(--mui-palette-success-main)';
  }

  if (tone === 'error') {
    return 'var(--mui-palette-error-main)';
  }

  return lightBackground ? '#52525b' : 'var(--mui-palette-text-secondary)';
}

function getProfileChatNavHoverColor(tone: ProfileChatNavTone, lightBackground: boolean): string {
  if (tone !== 'default') {
    return getProfileChatNavColor(tone, lightBackground);
  }

  return lightBackground ? '#111827' : 'var(--mui-palette-text-primary)';
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
  type:
    | 'bigmelo:admin-edit-avatar-voice'
    | 'bigmelo:admin-edit-profile'
    | 'bigmelo:admin-edit-social-networks';
}

interface ProfileAdminPreviewReadyMessage {
  type: 'bigmelo:admin-profile-preview-ready';
}

function isProfileAdminPreviewReadyMessage(value: unknown): value is ProfileAdminPreviewReadyMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'bigmelo:admin-profile-preview-ready'
  );
}

function isProfileAdminActionMessage(value: unknown): value is ProfileAdminActionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'bigmelo:admin-edit-avatar-voice' ||
      value.type === 'bigmelo:admin-edit-profile' ||
      value.type === 'bigmelo:admin-edit-social-networks')
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

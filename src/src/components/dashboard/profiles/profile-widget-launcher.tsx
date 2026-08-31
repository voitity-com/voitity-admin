'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { config } from '@/config';
import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import type { ProfileWidgetSettings } from '@/lib/profile-widget/api-client';
import { getProfileWidget } from '@/lib/profile-widget/api-client';
import type { Profile, ProfilePublicationRequirement } from '@/lib/profiles/api-client';
import { getProfile } from '@/lib/profiles/api-client';
import { profileQualityRefreshEvent } from '@/lib/profiles/profile-quality-events';
import { usePathname } from '@/hooks/use-pathname';
import { RouterLink } from '@/components/core/link';

import { ProfileTemplateEditor } from './profile-template-editor';

export function ProfileWidgetLauncher(): React.JSX.Element | null {
  const pathname = usePathname();
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [widget, setWidget] = React.useState<null | ProfileWidgetSettings>(null);

  const loadLauncher = React.useCallback(async (): Promise<void> => {
    if (!profileId) {
      return;
    }

    setIsLoading(true);
    setError('');

    const [profileResult, widgetResult] = await Promise.allSettled([
      getProfile(profileId),
      getProfileWidget(profileId),
    ]);

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value);
    } else {
      logger.error(profileResult.reason);
      setProfile(null);
      setError(t('dashboard.profiles.detail.widgetLauncher.error'));
    }

    if (widgetResult.status === 'fulfilled') {
      setWidget(widgetResult.value);
    } else {
      logger.error(widgetResult.reason);
      setWidget(null);

      if (profileResult.status === 'fulfilled') {
        setError(t('dashboard.profiles.detail.widgetLauncher.error'));
      }
    }

    setIsLoading(false);
  }, [profileId, t]);

  React.useEffect(() => {
    setIsOpen(false);
    setIsTemplateEditorOpen(false);
    loadLauncher().catch((loadError) => {
      logger.error(loadError);
    });
  }, [loadLauncher, pathname]);

  React.useEffect(() => {
    const handleRefresh = (): void => {
      loadLauncher().catch((loadError) => {
        logger.error(loadError);
      });
    };

    window.addEventListener(profileQualityRefreshEvent, handleRefresh);
    window.addEventListener('profile-publication:changed', handleRefresh);
    window.addEventListener('profile-publication:refresh', handleRefresh);

    return () => {
      window.removeEventListener(profileQualityRefreshEvent, handleRefresh);
      window.removeEventListener('profile-publication:changed', handleRefresh);
      window.removeEventListener('profile-publication:refresh', handleRefresh);
    };
  }, [loadLauncher]);

  if (!profileId) {
    return null;
  }

  const requirements = profile?.publication?.requirements ?? [];
  const avatarUrl = widget?.avatarUrl ?? getProfileAvatarUrl(profile);
  const hasAvatar = requirementPassed(requirements, 'avatar') || Boolean(avatarUrl);
  const hasSyncedSource = requirementPassed(requirements, 'source');
  const prerequisitesReady = hasAvatar && hasSyncedSource;
  const widgetChatUrl = widget?.available && widget.publicKey ? buildWidgetChatUrl(widget.publicKey) : '';
  const publicProfilePreviewUrl =
    profile?.active && profile.status === 'published' && profile.alias ? buildPublicProfileUrl(profile.alias) : '';
  const chatUrl = widgetChatUrl || publicProfilePreviewUrl;
  const canOpenChat = prerequisitesReady && Boolean(chatUrl);
  const statusColor = error ? 'error' : canOpenChat ? 'success' : 'warning';
  const launcherLabel = isOpen
    ? t('dashboard.profiles.detail.widgetLauncher.close')
    : t('dashboard.profiles.detail.widgetLauncher.open');

  return (
    <ClickAwayListener
      onClickAway={() => {
        setIsOpen(false);
      }}
    >
      <Box
        sx={(theme) => ({
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          position: 'fixed',
          right: { sm: 24, xs: 12 },
          zIndex: theme.zIndex.drawer + 3,
        })}
      >
        {isOpen ? (
          <Paper
            elevation={24}
            id="profile-widget-launcher-panel"
            sx={{
              bottom: { sm: 82, xs: 76 },
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100dvh - 116px)',
              maxWidth: 'calc(100vw - 32px)',
              overflow: 'hidden',
              position: 'absolute',
              right: 0,
              width: { sm: 390, xs: 'calc(100vw - 32px)' },
            }}
          >
            {canOpenChat ? (
              <WidgetChatPanel
                chatUrl={chatUrl}
                onClose={() => {
                  setIsOpen(false);
                }}
                onEditTemplate={() => {
                  setIsTemplateEditorOpen(true);
                }}
                profileName={profile?.name ?? ''}
              />
            ) : (
              <WidgetReadinessPanel
                error={error}
                hasAvatar={hasAvatar}
                hasSyncedSource={hasSyncedSource}
                isLoading={isLoading}
                onRetry={() => {
                  loadLauncher().catch((loadError) => {
                    logger.error(loadError);
                  });
                }}
                prerequisitesReady={prerequisitesReady}
                profileId={profileId}
              />
            )}
          </Paper>
        ) : null}

        <Tooltip placement="left" title={launcherLabel}>
          <Badge
            color={statusColor}
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                border: '3px solid var(--mui-palette-background-paper)',
                height: 15,
                minWidth: 15,
              },
            }}
            variant="dot"
          >
            <ButtonBase
              aria-controls={isOpen ? 'profile-widget-launcher-panel' : undefined}
              aria-expanded={isOpen}
              aria-label={launcherLabel}
              id="profile-widget-launcher"
              onClick={() => {
                setIsOpen((current) => !current);
              }}
              sx={{
                bgcolor: 'background.paper',
                border: '3px solid',
                borderColor: canOpenChat ? 'success.main' : error ? 'error.main' : 'warning.main',
                borderRadius: '50%',
                boxShadow: '0 14px 38px rgba(15, 23, 42, 0.3)',
                height: { sm: 68, xs: 62 },
                overflow: 'hidden',
                p: '3px',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
                width: { sm: 68, xs: 62 },
                '&:hover': {
                  boxShadow: '0 18px 46px rgba(15, 23, 42, 0.38)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Avatar
                alt={profile?.name ?? String(t('dashboard.profiles.detail.widgetLauncher.emptyAvatar'))}
                src={avatarUrl ?? undefined}
                sx={{ bgcolor: 'background.level1', color: 'text.secondary', height: '100%', width: '100%' }}
              >
                <UserIcon fontSize="var(--icon-fontSize-xl)" />
              </Avatar>
              {isLoading ? (
                <Box
                  sx={{
                    alignItems: 'center',
                    bgcolor: 'rgba(255, 255, 255, 0.72)',
                    display: 'flex',
                    inset: 0,
                    justifyContent: 'center',
                    position: 'absolute',
                  }}
                >
                  <CircularProgress size={22} />
                </Box>
              ) : null}
            </ButtonBase>
          </Badge>
        </Tooltip>

        {profile?.alias ? (
          <ProfileTemplateEditor
            onClose={() => {
              setIsTemplateEditorOpen(false);
            }}
            open={isTemplateEditorOpen}
            previewUrl={buildPublicProfileUrl(profile.alias)}
            profileAvatarUrl={avatarUrl}
            profileId={profileId}
            profileName={profile.name ?? ''}
          />
        ) : null}
      </Box>
    </ClickAwayListener>
  );
}

function WidgetChatPanel({
  chatUrl,
  onClose,
  onEditTemplate,
  profileName,
}: {
  chatUrl: string;
  onClose: () => void;
  onEditTemplate: () => void;
  profileName: string;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minHeight: 54, px: 2, py: 1 }}>
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700 }} variant="subtitle2">
            {profileName || t('dashboard.profiles.detail.widgetLauncher.preview.title')}
          </Typography>
          <ButtonBase
            onClick={onEditTemplate}
            sx={{ color: 'primary.main', fontSize: '0.75rem', fontWeight: 700, justifyContent: 'flex-start' }}
          >
            {t('dashboard.profiles.detail.widgetLauncher.preview.subtitle')}
          </ButtonBase>
        </Box>
        <IconButton aria-label={t('dashboard.profiles.detail.widgetLauncher.close')} onClick={onClose} size="small">
          <XIcon />
        </IconButton>
      </Stack>
      <Divider />
      <Box
        allow="microphone"
        component="iframe"
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        src={chatUrl}
        sx={{ border: 0, display: 'block', height: 'min(640px, calc(100dvh - 172px))', width: '100%' }}
        title={String(t('dashboard.profiles.detail.widgetLauncher.preview.iframeTitle'))}
      />
    </React.Fragment>
  );
}

function WidgetReadinessPanel({
  error,
  hasAvatar,
  hasSyncedSource,
  isLoading,
  onRetry,
  prerequisitesReady,
  profileId,
}: {
  error: string;
  hasAvatar: boolean;
  hasSyncedSource: boolean;
  isLoading: boolean;
  onRetry: () => void;
  prerequisitesReady: boolean;
  profileId: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const settingsHref = `${paths.dashboard.profileDetails.settings(profileId)}?tab=widget`;

  return (
    <Stack spacing={2} sx={{ p: 2.5 }}>
      <Stack spacing={0.5}>
        <Typography variant="h6">
          {prerequisitesReady
            ? t('dashboard.profiles.detail.widgetLauncher.unavailable.title')
            : t('dashboard.profiles.detail.widgetLauncher.incomplete.title')}
        </Typography>
        <Typography color={error ? 'error.main' : 'text.secondary'} variant="body2">
          {error ||
            (prerequisitesReady
              ? t('dashboard.profiles.detail.widgetLauncher.unavailable.description')
              : t('dashboard.profiles.detail.widgetLauncher.incomplete.description'))}
        </Typography>
      </Stack>

      {!prerequisitesReady ? (
        <Stack spacing={1}>
          <ReadinessItem
            complete={hasAvatar}
            href={paths.dashboard.profileDetails.avatar(profileId)}
            icon={<ImageIcon />}
            label={t('dashboard.profiles.detail.widgetLauncher.requirements.avatar')}
          />
          <ReadinessItem
            complete={hasSyncedSource}
            href={paths.dashboard.profileDetails.sources(profileId)}
            icon={<FileTextIcon />}
            label={t('dashboard.profiles.detail.widgetLauncher.requirements.source')}
          />
        </Stack>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {error ? (
          <Button disabled={isLoading} onClick={onRetry} size="small" variant="outlined">
            {t('dashboard.profiles.detail.widgetLauncher.actions.retry')}
          </Button>
        ) : prerequisitesReady ? (
          <Button component={RouterLink} href={settingsHref} size="small" variant="contained">
            {t('dashboard.profiles.detail.widgetLauncher.actions.configure')}
          </Button>
        ) : (
          <React.Fragment>
            {!hasAvatar ? (
              <Button
                component={RouterLink}
                href={paths.dashboard.profileDetails.avatar(profileId)}
                size="small"
                variant="contained"
              >
                {t('dashboard.profiles.detail.widgetLauncher.actions.addAvatar')}
              </Button>
            ) : null}
            {!hasSyncedSource ? (
              <Button
                component={RouterLink}
                href={paths.dashboard.profileDetails.sources(profileId)}
                size="small"
                variant={hasAvatar ? 'contained' : 'outlined'}
              >
                {t('dashboard.profiles.detail.widgetLauncher.actions.addSource')}
              </Button>
            ) : null}
          </React.Fragment>
        )}
      </Stack>
    </Stack>
  );
}

function ReadinessItem({
  complete,
  href,
  icon,
  label,
}: {
  complete: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
}): React.JSX.Element {
  return (
    <Stack
      component={RouterLink}
      direction="row"
      href={href}
      spacing={1.25}
      sx={{
        alignItems: 'center',
        bgcolor: 'background.level1',
        borderRadius: 1,
        color: complete ? 'success.main' : 'text.secondary',
        px: 1.5,
        py: 1.25,
        textDecoration: 'none',
        transition: 'background-color 160ms ease, transform 160ms ease',
        '&:hover': {
          bgcolor: 'action.hover',
          transform: 'translateX(2px)',
        },
      }}
    >
      {complete ? <CheckCircleIcon weight="fill" /> : icon}
      <Typography
        color={complete ? 'success.main' : 'text.primary'}
        sx={{ flex: '1 1 auto', fontWeight: 600 }}
        variant="body2"
      >
        {label}
      </Typography>
      <CaretRightIcon aria-hidden="true" />
    </Stack>
  );
}

function requirementPassed(requirements: ProfilePublicationRequirement[], key: string): boolean {
  return requirements.some((requirement) => requirement.key === key && requirement.passed);
}

function getProfileAvatarUrl(profile: null | Profile): null | string {
  const avatar = profile?.avatar;
  const candidates = [avatar?.file, avatar?.ai_image?.file, avatar?.original_file];
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

function buildWidgetChatUrl(publicKey: string): string {
  const webBaseUrl = (config.publicProfile?.baseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  return `${webBaseUrl}/?widget=${encodeURIComponent(publicKey)}`;
}

function buildPublicProfileUrl(alias: string): string {
  const webBaseUrl = (config.publicProfile?.baseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  return `${webBaseUrl}/${encodeURIComponent(alias)}`;
}

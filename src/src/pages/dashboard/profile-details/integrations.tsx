'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowsClockwise as ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { InstagramLogo as InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { Play as PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { TiktokLogo as TiktokLogoIcon } from '@phosphor-icons/react/dist/ssr/TiktokLogo';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import {
  createIntegrationConnectUrl,
  disconnectIntegration,
  getIntegrationMedia,
  syncIntegrationMedia,
  updateIntegrationMediaSelection,
  type IntegrationMedia,
  type IntegrationMediaPage,
  type IntegrationProvider,
} from '@/lib/integrations/api-client';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Integrations | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
type MediaFilter = 'all' | 'selected';
type Language = 'en' | 'es';

const INITIAL_VISIBLE_MEDIA_COUNT = 6;

const providerConfigs = {
  instagram: {
    Icon: InstagramLogoIcon,
    testIdPrefix: 'instagram',
  },
  tiktok: {
    Icon: TiktokLogoIcon,
    testIdPrefix: 'tiktok',
  },
} satisfies Record<IntegrationProvider, { Icon: typeof InstagramLogoIcon; testIdPrefix: string }>;

const copy = {
  en: {
    common: {
      connected: 'Connected',
      closeVideo: 'Close video',
      disconnect: 'Disconnect',
      error: 'Something went wrong',
      filterAll: 'All',
      filterSelected: 'Selected',
      image: 'Image',
      integrations: 'Integrations',
      lastSync: 'Last sync',
      observation: 'Conversation note',
      openOnProvider: 'Open on {{provider}}',
      playVideo: 'Play {{provider}} video',
      save: 'Save selection',
      select: 'Select',
      selected: '{{count}}/{{limit}} selected',
      showMoreItems: 'Show {{count}} more',
      showing: 'Showing {{count}} of {{total}}',
      sync: 'Sync',
      title: 'Profile integrations',
      updated: 'Selection saved',
      useCaption: 'Use caption',
      username: '@{{username}}',
      video: 'Video',
    },
    providers: {
      instagram: {
        connect: 'Connect Instagram',
        connectedNoSync: 'Instagram connected. Sync did not finish; use Sync to retry.',
        empty: 'No Instagram media has been synced yet.',
        emptySelected: 'No selected Instagram media yet.',
        filterLabel: 'Instagram media filter',
        hint: 'Select up to {{limit}} posts and add notes. The profile can use these images and links when visitors ask for photos or Instagram content.',
        label: 'Instagram',
        maxSelected: 'You can select up to {{limit}} Instagram items.',
        noConnection:
          'Connect an Instagram Business or Creator account to sync public media and make selected posts available to profile conversations.',
        observationPlaceholder: 'Example: This was from a recent trip to Medellin.',
        oauthLocalWarning:
          'Instagram OAuth is using {{redirectUri}}. This exact URI must be registered in Meta under Instagram > API setup with Instagram login. If Meta only has the production API URL, this local flow will end on an Instagram unavailable page.',
        reconnect: 'Reconnect',
        synced: 'Instagram media synced',
      },
      tiktok: {
        connect: 'Connect TikTok',
        connectedNoSync: 'TikTok connected. Sync did not finish; use Sync to retry.',
        empty: 'No TikTok posts have been synced yet.',
        emptySelected: 'No selected TikTok posts yet.',
        filterLabel: 'TikTok media filter',
        hint: 'Select up to {{limit}} TikTok posts and add notes. The profile can use these images, videos, and links when visitors ask for TikTok content.',
        label: 'TikTok',
        maxSelected: 'You can select up to {{limit}} TikTok items.',
        noConnection:
          'Connect a TikTok account to sync public posts and make selected content available to profile conversations.',
        observationPlaceholder: 'Example: This post shows a recent event in Medellin.',
        oauthLocalWarning:
          'TikTok OAuth is using {{redirectUri}}. This exact URI must be registered in TikTok Login Kit redirect settings.',
        reconnect: 'Reconnect',
        synced: 'TikTok videos synced',
      },
    },
  },
  es: {
    common: {
      connected: 'Conectado',
      closeVideo: 'Cerrar video',
      disconnect: 'Desconectar',
      error: 'Algo salió mal',
      filterAll: 'Todas',
      filterSelected: 'Seleccionadas',
      image: 'Imagen',
      integrations: 'Integraciones',
      lastSync: 'Última sincronización',
      observation: 'Observación para conversación',
      openOnProvider: 'Abrir en {{provider}}',
      playVideo: 'Reproducir video de {{provider}}',
      save: 'Guardar selección',
      select: 'Seleccionar',
      selected: '{{count}}/{{limit}} seleccionadas',
      showMoreItems: 'Mostrar {{count}} más',
      showing: 'Mostrando {{count}} de {{total}}',
      sync: 'Sincronizar',
      title: 'Integraciones del perfil',
      updated: 'Selección guardada',
      useCaption: 'Usar descripción',
      username: '@{{username}}',
      video: 'Video',
    },
    providers: {
      instagram: {
        connect: 'Conectar Instagram',
        connectedNoSync: 'Instagram conectado. La sincronización no terminó; usa Sincronizar para reintentar.',
        empty: 'Aún no hay contenido sincronizado de Instagram.',
        emptySelected: 'Aún no hay imágenes seleccionadas de Instagram.',
        filterLabel: 'Filtro de publicaciones de Instagram',
        hint: 'Selecciona hasta {{limit}} publicaciones y agrega observaciones. El perfil podrá usar estas imágenes y enlaces cuando los visitantes pidan fotos o contenido de Instagram.',
        label: 'Instagram',
        maxSelected: 'Puedes seleccionar hasta {{limit}} elementos de Instagram.',
        noConnection:
          'Conecta una cuenta de Instagram Business o Creator para sincronizar contenido público y usar publicaciones seleccionadas en las conversaciones del perfil.',
        observationPlaceholder: 'Ejemplo: Esta fue de un viaje reciente a Medellín.',
        oauthLocalWarning:
          'OAuth de Instagram está usando {{redirectUri}}. Esta URI exacta debe estar registrada en Meta en Instagram > API setup with Instagram login. Si Meta solo tiene la URL del API de producción, este flujo local terminará en la página no disponible de Instagram.',
        reconnect: 'Reconectar',
        synced: 'Instagram sincronizado',
      },
      tiktok: {
        connect: 'Conectar TikTok',
        connectedNoSync: 'TikTok conectado. La sincronización no terminó; usa Sincronizar para reintentar.',
        empty: 'Aún no hay publicaciones sincronizadas de TikTok.',
        emptySelected: 'Aún no hay publicaciones seleccionadas de TikTok.',
        filterLabel: 'Filtro de contenido de TikTok',
        hint: 'Selecciona hasta {{limit}} publicaciones de TikTok y agrega observaciones. El perfil podrá usar estas imágenes, videos y enlaces cuando los visitantes pidan contenido de TikTok.',
        label: 'TikTok',
        maxSelected: 'Puedes seleccionar hasta {{limit}} elementos de TikTok.',
        noConnection:
          'Conecta una cuenta de TikTok para sincronizar publicaciones públicas y usar el contenido seleccionado en las conversaciones del perfil.',
        observationPlaceholder: 'Ejemplo: Esta publicación muestra un evento reciente en Medellín.',
        oauthLocalWarning:
          'OAuth de TikTok está usando {{redirectUri}}. Esta URI exacta debe estar registrada en los redirect settings de TikTok Login Kit.',
        reconnect: 'Reconectar',
        synced: 'TikTok sincronizado',
      },
    },
  },
} satisfies Record<
  Language,
  {
    common: Record<string, string>;
    providers: Record<IntegrationProvider, Record<string, string>>;
  }
>;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
  const t = copy[language];
  const providerFromQuery = normalizeProvider(searchParams.get('provider'));
  const [activeTab, setActiveTab] = React.useState<IntegrationProvider>(providerFromQuery ?? 'instagram');
  const [page, setPage] = React.useState<IntegrationMediaPage | null>(null);
  const [media, setMedia] = React.useState<IntegrationMedia[]>([]);
  const [error, setError] = React.useState<string>('');
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const providerText = t.providers[activeTab];

  React.useEffect(() => {
    if (providerFromQuery) {
      setActiveTab(providerFromQuery);
    }
  }, [providerFromQuery]);

  const loadIntegration = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    setPage(null);
    setMedia([]);

    try {
      const nextPage = await getIntegrationMedia(profileId, activeTab);
      setPage(nextPage);
      setMedia(nextPage.media);
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t.common.error));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, profileId, t.common.error]);

  React.useEffect(() => {
    loadIntegration().catch((err) => {
      logger.error(err);
    });
  }, [loadIntegration]);

  React.useEffect(() => {
    const connectedProvider = normalizeProvider(searchParams.get('provider'));

    if (connectedProvider && searchParams.get('connected') === '1') {
      const messages = t.providers[connectedProvider];

      if (searchParams.get('synced') === '0') {
        toast.warning(messages.connectedNoSync);
      } else {
        toast.success(t.common.connected);
      }
    }
  }, [searchParams, t.common.connected, t.providers]);

  const selectionLimit = page?.selection_limit ?? 10;
  const selectedCount = media.filter((item) => item.selected).length;

  const handleConnect = React.useCallback(async (): Promise<void> => {
    setIsConnecting(true);

    try {
      const connection = await createIntegrationConnectUrl(profileId, activeTab);

      if (connection.oauth?.uses_local_redirect && connection.oauth.redirect_uri) {
        toast.warning(interpolate(providerText.oauthLocalWarning, { redirectUri: connection.oauth.redirect_uri }));
      }

      window.location.assign(connection.url);
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.common.error));
      setIsConnecting(false);
    }
  }, [activeTab, profileId, providerText.oauthLocalWarning, t.common.error]);

  const handleSync = React.useCallback(async (): Promise<void> => {
    setIsSyncing(true);

    try {
      await syncIntegrationMedia(profileId, activeTab);
      await loadIntegration();
      toast.success(providerText.synced);
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.common.error));
    } finally {
      setIsSyncing(false);
    }
  }, [activeTab, loadIntegration, profileId, providerText.synced, t.common.error]);

  const handleDisconnect = React.useCallback(async (): Promise<void> => {
    setIsDisconnecting(true);

    try {
      await disconnectIntegration(profileId, activeTab);
      setPage({ integration: null, media: [], selection_limit: selectionLimit });
      setMedia([]);
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.common.error));
    } finally {
      setIsDisconnecting(false);
    }
  }, [activeTab, profileId, selectionLimit, t.common.error]);

  const handleToggleSelected = React.useCallback(
    (mediaId: number | string, checked: boolean): void => {
      if (checked && selectedCount >= selectionLimit) {
        toast.error(interpolate(providerText.maxSelected, { limit: selectionLimit }));
        return;
      }

      setMedia((current) =>
        current.map((item) => (String(item.id) === String(mediaId) ? { ...item, selected: checked } : item))
      );
    },
    [providerText.maxSelected, selectedCount, selectionLimit]
  );

  const handleObservationChange = React.useCallback((mediaId: number | string, observation: string): void => {
    setMedia((current) =>
      current.map((item) => (String(item.id) === String(mediaId) ? { ...item, observation } : item))
    );
  }, []);

  const handleSave = React.useCallback(async (): Promise<void> => {
    setIsSaving(true);

    try {
      const nextPage = await updateIntegrationMediaSelection(
        profileId,
        activeTab,
        media.map((item) => ({
          id: item.id,
          observation: item.observation ?? '',
          selected: item.selected,
        }))
      );

      setPage(nextPage);
      setMedia(nextPage.media);
      toast.success(t.common.updated);
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.common.error));
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, media, profileId, t.common.error, t.common.updated]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            avatar={<PlugsConnectedIcon fontSize="var(--icon-fontSize-lg)" />}
            subheader={interpolate(providerText.hint, { limit: selectionLimit })}
            title={t.common.title}
          />
          <Divider />
          <Tabs
            onChange={(_, value: IntegrationProvider) => {
              setActiveTab(value);
            }}
            sx={{ px: 3 }}
            value={activeTab}
          >
            {Object.entries(providerConfigs).map(([provider, providerConfig]) => {
              const typedProvider = provider as IntegrationProvider;
              const Icon = providerConfig.Icon;

              return (
                <Tab
                  icon={<Icon />}
                  iconPosition="start"
                  key={typedProvider}
                  label={t.providers[typedProvider].label}
                  value={typedProvider}
                />
              );
            })}
          </Tabs>
          <Divider />
          <CardContent>
            <IntegrationPanel
              common={t.common}
              isConnecting={isConnecting}
              isDisconnecting={isDisconnecting}
              isLoading={isLoading}
              isSaving={isSaving}
              isSyncing={isSyncing}
              media={media}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onObservationChange={handleObservationChange}
              onSave={handleSave}
              onSync={handleSync}
              onToggleSelected={handleToggleSelected}
              page={page}
              provider={activeTab}
              providerConfig={providerConfigs[activeTab]}
              providerText={providerText}
              selectedCount={selectedCount}
              selectionLimit={selectionLimit}
            />
          </CardContent>
        </Card>
      </Stack>
    </React.Fragment>
  );
}

interface IntegrationPanelProps {
  common: (typeof copy)['es']['common'];
  isConnecting: boolean;
  isDisconnecting: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  media: IntegrationMedia[];
  page: IntegrationMediaPage | null;
  provider: IntegrationProvider;
  providerConfig: (typeof providerConfigs)[IntegrationProvider];
  providerText: (typeof copy)['es']['providers'][IntegrationProvider];
  selectedCount: number;
  selectionLimit: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onObservationChange: (mediaId: number | string, observation: string) => void;
  onSave: () => void;
  onSync: () => void;
  onToggleSelected: (mediaId: number | string, checked: boolean) => void;
}

function IntegrationPanel({
  common,
  isConnecting,
  isDisconnecting,
  isLoading,
  isSaving,
  isSyncing,
  media,
  page,
  provider,
  providerConfig,
  providerText,
  selectedCount,
  selectionLimit,
  onConnect,
  onDisconnect,
  onObservationChange,
  onSave,
  onSync,
  onToggleSelected,
}: IntegrationPanelProps): React.JSX.Element {
  const localRedirectUri = page?.oauth?.uses_local_redirect ? page.oauth.redirect_uri : null;
  const [mediaFilter, setMediaFilter] = React.useState<MediaFilter>('all');
  const [visibleMediaCount, setVisibleMediaCount] = React.useState(INITIAL_VISIBLE_MEDIA_COUNT);
  const filteredMedia = React.useMemo(
    () => (mediaFilter === 'selected' ? media.filter((item) => item.selected) : media),
    [media, mediaFilter]
  );
  const visibleMedia = React.useMemo(
    () => filteredMedia.slice(0, visibleMediaCount),
    [filteredMedia, visibleMediaCount]
  );
  const hasMoreMedia = filteredMedia.length > visibleMedia.length;
  const remainingMediaCount = Math.min(INITIAL_VISIBLE_MEDIA_COUNT, filteredMedia.length - visibleMedia.length);
  const Icon = providerConfig.Icon;

  React.useEffect(() => {
    setVisibleMediaCount(INITIAL_VISIBLE_MEDIA_COUNT);
  }, [mediaFilter, media.length, provider]);

  React.useEffect(() => {
    setMediaFilter('all');
  }, [provider]);

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!page?.integration) {
    return (
      <Stack
        spacing={2}
        sx={{
          alignItems: 'flex-start',
          border: '1px dashed var(--mui-palette-divider)',
          borderRadius: 1,
          p: 3,
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant="h6">{providerText.label}</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 760 }} variant="body2">
            {providerText.noConnection}
          </Typography>
        </Stack>
        {localRedirectUri ? (
          <Alert severity="warning">
            {interpolate(providerText.oauthLocalWarning, { redirectUri: localRedirectUri })}
          </Alert>
        ) : null}
        <Button
          data-testid={`${providerConfig.testIdPrefix}-connect-button`}
          disabled={isConnecting}
          onClick={onConnect}
          startIcon={<LinkSimpleIcon />}
          variant="contained"
        >
          {isConnecting ? `${providerText.connect}...` : providerText.connect}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {localRedirectUri ? (
        <Alert severity="warning">
          {interpolate(providerText.oauthLocalWarning, { redirectUri: localRedirectUri })}
        </Alert>
      ) : null}
      <Stack
        direction={{ sm: 'row', xs: 'column' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Icon fontSize="var(--icon-fontSize-lg)" />
            <Typography variant="h6">
              {page.integration.username
                ? interpolate(common.username, { username: page.integration.username })
                : providerText.label}
            </Typography>
            <Chip color="success" label={common.connected} size="small" variant="outlined" />
            <Chip label={interpolate(common.selected, { count: selectedCount, limit: selectionLimit })} size="small" />
          </Stack>
          {page.integration.last_synced_at ? (
            <Typography color="text.secondary" variant="body2">
              {common.lastSync}: {formatDate(page.integration.last_synced_at)}
            </Typography>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button disabled={isSyncing} onClick={onSync} startIcon={<ArrowsClockwiseIcon />} variant="outlined">
            {isSyncing ? `${common.sync}...` : common.sync}
          </Button>
          <Button
            data-testid={`${providerConfig.testIdPrefix}-reconnect-button`}
            disabled={isConnecting}
            onClick={onConnect}
            startIcon={<LinkSimpleIcon />}
            variant="outlined"
          >
            {providerText.reconnect}
          </Button>
          <Button
            color="error"
            disabled={isDisconnecting}
            onClick={onDisconnect}
            startIcon={<TrashIcon />}
            variant="outlined"
          >
            {common.disconnect}
          </Button>
        </Stack>
      </Stack>

      {media.length ? (
        <React.Fragment>
          <Stack
            direction={{ sm: 'row', xs: 'column' }}
            spacing={1.5}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box
              aria-label={providerText.filterLabel}
              data-testid={`${providerConfig.testIdPrefix}-media-filter`}
              role="group"
              sx={{
                alignItems: 'center',
                display: 'inline-flex',
                gap: 0.75,
              }}
            >
              <Button
                aria-pressed={mediaFilter === 'all'}
                data-testid={`${providerConfig.testIdPrefix}-media-filter-all`}
                onClick={() => {
                  setMediaFilter('all');
                }}
                size="small"
                sx={{
                  '&:hover': {
                    bgcolor: 'transparent',
                    color: 'primary.main',
                    textDecoration: 'underline',
                  },
                  color: mediaFilter === 'all' ? 'primary.main' : 'text.secondary',
                  fontSize: '0.8125rem',
                  fontWeight: mediaFilter === 'all' ? 600 : 400,
                  minWidth: 0,
                  p: 0,
                  textDecoration: mediaFilter === 'all' ? 'none' : 'underline',
                  textTransform: 'none',
                  textUnderlineOffset: '3px',
                }}
                variant="text"
              >
                {common.filterAll}
              </Button>
              <Typography aria-hidden="true" color="text.disabled" variant="body2">
                |
              </Typography>
              <Button
                aria-pressed={mediaFilter === 'selected'}
                data-testid={`${providerConfig.testIdPrefix}-media-filter-selected`}
                onClick={() => {
                  setMediaFilter('selected');
                }}
                size="small"
                sx={{
                  '&:hover': {
                    bgcolor: 'transparent',
                    color: 'primary.main',
                    textDecoration: 'underline',
                  },
                  color: mediaFilter === 'selected' ? 'primary.main' : 'text.secondary',
                  fontSize: '0.8125rem',
                  fontWeight: mediaFilter === 'selected' ? 600 : 400,
                  minWidth: 0,
                  p: 0,
                  textDecoration: mediaFilter === 'selected' ? 'none' : 'underline',
                  textTransform: 'none',
                  textUnderlineOffset: '3px',
                }}
                variant="text"
              >
                {common.filterSelected}
              </Button>
            </Box>
            <Typography color="text.secondary" variant="body2">
              {interpolate(common.showing, {
                count: visibleMedia.length,
                total: filteredMedia.length,
              })}
            </Typography>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                lg: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(2, minmax(0, 1fr))',
                xs: '1fr',
              },
            }}
          >
            {visibleMedia.map((item) => (
              <IntegrationMediaCard
                common={common}
                item={item}
                key={item.id}
                onObservationChange={onObservationChange}
                onToggleSelected={onToggleSelected}
                provider={provider}
                providerConfig={providerConfig}
                providerText={providerText}
                selectedCount={selectedCount}
                selectionLimit={selectionLimit}
              />
            ))}
          </Box>
          {visibleMedia.length === 0 ? (
            <Typography color="text.secondary">{providerText.emptySelected}</Typography>
          ) : null}
          <Stack
            direction={{ sm: 'row', xs: 'column' }}
            spacing={1.5}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              {hasMoreMedia ? (
                <Button
                  data-testid={`${providerConfig.testIdPrefix}-media-show-more`}
                  onClick={() => {
                    setVisibleMediaCount((current) => current + INITIAL_VISIBLE_MEDIA_COUNT);
                  }}
                  variant="outlined"
                >
                  {interpolate(common.showMoreItems, { count: remainingMediaCount })}
                </Button>
              ) : null}
            </Box>
            <Button disabled={isSaving} onClick={onSave} variant="contained">
              {isSaving ? `${common.save}...` : common.save}
            </Button>
          </Stack>
        </React.Fragment>
      ) : (
        <Stack spacing={2} sx={{ alignItems: 'flex-start', py: 2 }}>
          <Typography color="text.secondary">{providerText.empty}</Typography>
          <Button disabled={isSyncing} onClick={onSync} startIcon={<ArrowsClockwiseIcon />} variant="outlined">
            {isSyncing ? `${common.sync}...` : common.sync}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

interface IntegrationMediaCardProps {
  common: (typeof copy)['es']['common'];
  item: IntegrationMedia;
  provider: IntegrationProvider;
  providerConfig: (typeof providerConfigs)[IntegrationProvider];
  providerText: (typeof copy)['es']['providers'][IntegrationProvider];
  selectedCount: number;
  selectionLimit: number;
  onObservationChange: (mediaId: number | string, observation: string) => void;
  onToggleSelected: (mediaId: number | string, checked: boolean) => void;
}

function IntegrationMediaCard({
  common,
  item,
  provider,
  providerConfig,
  providerText,
  selectedCount,
  selectionLimit,
  onObservationChange,
  onToggleSelected,
}: IntegrationMediaCardProps): React.JSX.Element {
  const imageUrl = item.thumbnail_url || item.media_url;
  const disableUnchecked = !item.selected && selectedCount >= selectionLimit;
  const Icon = providerConfig.Icon;
  const isVideo = item.media_type?.trim().toUpperCase().includes('VIDEO') ?? false;
  const playback = isVideo ? getIntegrationMediaPlayback(item, provider) : null;
  const [isPlaybackOpen, setIsPlaybackOpen] = React.useState(false);
  const playVideoLabel = interpolate(common.playVideo, { provider: providerText.label });

  return (
    <React.Fragment>
      <Box
        data-testid={`${providerConfig.testIdPrefix}-media-card`}
        sx={{
          border: '1px solid var(--mui-palette-divider)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            aspectRatio: '1 / 1',
            bgcolor: 'var(--mui-palette-background-level1)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {imageUrl ? (
            <Box
              alt={item.caption ?? ''}
              component="img"
              src={imageUrl}
              sx={{ height: '100%', objectFit: 'cover', width: '100%' }}
            />
          ) : (
            <Stack sx={{ alignItems: 'center', height: '100%', justifyContent: 'center', p: 2 }}>
              <Icon fontSize="var(--icon-fontSize-xl)" />
            </Stack>
          )}
          <Chip
            color={isVideo ? 'primary' : 'default'}
            label={isVideo ? common.video : common.image}
            size="small"
            sx={{ left: 12, position: 'absolute', top: 12 }}
          />
          {isVideo && playback ? (
            <Tooltip title={playVideoLabel}>
              <IconButton
                aria-label={playVideoLabel}
                data-testid={`${providerConfig.testIdPrefix}-media-play`}
                onClick={() => {
                  setIsPlaybackOpen(true);
                }}
                sx={{
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.82)', transform: 'translate(-50%, -50%) scale(1.06)' },
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'common.white',
                  height: 48,
                  left: '50%',
                  position: 'absolute',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  transition: 'background-color 150ms ease, transform 150ms ease',
                  width: 48,
                }}
              >
                <PlayIcon size={22} weight="fill" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={item.selected}
                disabled={disableUnchecked}
                onChange={(event) => {
                  onToggleSelected(item.id, event.target.checked);
                }}
              />
            }
            label={common.select}
          />
          {item.caption ? (
            <Typography
              color="text.secondary"
              sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              variant="body2"
            >
              {item.caption}
            </Typography>
          ) : null}
          {item.caption ? (
            <Button
              disabled={!item.selected}
              onClick={() => {
                onObservationChange(item.id, item.caption ?? '');
              }}
              size="small"
              variant="text"
            >
              {common.useCaption}
            </Button>
          ) : null}
          <OutlinedInput
            disabled={!item.selected}
            fullWidth
            multiline
            onChange={(event) => {
              onObservationChange(item.id, event.target.value);
            }}
            placeholder={providerText.observationPlaceholder}
            rows={3}
            value={item.observation ?? ''}
          />
          {item.permalink ? (
            <Button component="a" href={item.permalink} rel="noreferrer" size="small" target="_blank" variant="text">
              {providerText.label}
            </Button>
          ) : null}
        </Stack>
      </Box>
      <Dialog
        aria-label={playVideoLabel}
        fullWidth
        maxWidth="sm"
        onClose={() => {
          setIsPlaybackOpen(false);
        }}
        open={isPlaybackOpen}
      >
        <DialogContent
          sx={{
            alignItems: 'center',
            bgcolor: 'common.black',
            display: 'flex',
            justifyContent: 'center',
            minHeight: { sm: 560, xs: 420 },
            p: 0,
            position: 'relative',
          }}
        >
          <Tooltip title={common.closeVideo}>
            <IconButton
              aria-label={common.closeVideo}
              onClick={() => {
                setIsPlaybackOpen(false);
              }}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.72)',
                color: 'common.white',
                position: 'absolute',
                right: 12,
                top: 12,
                zIndex: 1,
              }}
            >
              <XIcon />
            </IconButton>
          </Tooltip>
          {playback?.kind === 'embed' ? (
            <Box sx={{ aspectRatio: '9 / 16', maxHeight: '78vh', width: 'min(100%, 440px)' }}>
              <Box
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                component="iframe"
                src={playback.src}
                sx={{ border: 0, height: '100%', width: '100%' }}
                title={playVideoLabel}
              />
            </Box>
          ) : playback?.kind === 'video' ? (
            <Box
              autoPlay
              component="video"
              controls
              playsInline
              poster={imageUrl ?? undefined}
              src={playback.src}
              sx={{ maxHeight: '78vh', objectFit: 'contain', width: '100%' }}
            />
          ) : null}
        </DialogContent>
        {item.permalink ? (
          <DialogActions>
            <Button component="a" href={item.permalink} rel="noreferrer" target="_blank">
              {interpolate(common.openOnProvider, { provider: providerText.label })}
            </Button>
          </DialogActions>
        ) : null}
      </Dialog>
    </React.Fragment>
  );
}

type IntegrationMediaPlayback =
  | {
      kind: 'embed';
      src: string;
    }
  | {
      kind: 'video';
      src: string;
    };

function getIntegrationMediaPlayback(
  item: IntegrationMedia,
  provider: IntegrationProvider
): IntegrationMediaPlayback | null {
  if (provider === 'tiktok') {
    const videoId = getTikTokVideoId(item);

    return videoId
      ? {
          kind: 'embed',
          src: `https://www.tiktok.com/player/v1/${videoId}?autoplay=1`,
        }
      : null;
  }

  if (item.media_url && !isInstagramPostUrl(item.media_url)) {
    return { kind: 'video', src: item.media_url };
  }

  const embedUrl = getInstagramEmbedUrl(item.permalink || item.media_url);

  return embedUrl ? { kind: 'embed', src: embedUrl } : null;
}

function getTikTokVideoId(item: IntegrationMedia): string | null {
  const providerMediaId = String(item.provider_media_id ?? '').trim();

  if (/^\d+$/.test(providerMediaId)) {
    return providerMediaId;
  }

  for (const value of [item.media_url, item.permalink]) {
    if (!value) {
      continue;
    }

    try {
      const videoIdMatch = /\/(?:video|v1|v2)\/(?<videoId>\d+)/.exec(new URL(value).pathname);
      const videoId = videoIdMatch?.groups?.videoId;

      if (videoId) {
        return videoId;
      }
    } catch {
      // Try the next provider URL.
    }
  }

  return null;
}

function isInstagramPostUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.hostname === 'instagram.com' || url.hostname.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

function getInstagramEmbedUrl(value?: null | string): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.hostname !== 'instagram.com' && !url.hostname.endsWith('.instagram.com')) {
      return null;
    }

    return `${url.origin}${url.pathname.replace(/\/+$/, '')}/embed/`;
  } catch {
    return null;
  }
}

function normalizeProvider(value: null | string): IntegrationProvider | null {
  return value === 'instagram' || value === 'tiktok' ? value : null;
}

function interpolate(value: string, params: Record<string, number | string>): string {
  return Object.entries(params).reduce(
    (result, [key, replacement]) => result.replace(`{{${key}}}`, String(replacement)),
    value
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

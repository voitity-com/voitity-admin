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
import FormControlLabel from '@mui/material/FormControlLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { ArrowsClockwise as ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { InstagramLogo as InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import {
  createInstagramConnectUrl,
  disconnectInstagram,
  getInstagramMedia,
  syncInstagramMedia,
  updateInstagramMediaSelection,
  type InstagramMedia,
  type InstagramMediaPage,
} from '@/lib/integrations/api-client';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Integrations | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
type IntegrationTab = 'instagram';
type MediaFilter = 'all' | 'selected';

const INITIAL_VISIBLE_MEDIA_COUNT = 6;

const copy = {
  en: {
    connect: 'Connect Instagram',
    connected: 'Connected',
    connectedNoSync: 'Instagram connected. Sync did not finish; use Sync to retry.',
    disconnect: 'Disconnect',
    empty: 'No Instagram media has been synced yet.',
    emptySelected: 'No selected Instagram media yet.',
    error: 'Something went wrong',
    filterAll: 'All',
    filterLabel: 'Instagram media filter',
    filterSelected: 'Selected',
    hint: 'Select up to {{limit}} posts and add notes. The profile can use these images and links when visitors ask for photos or Instagram content.',
    integrations: 'Integrations',
    instagram: 'Instagram',
    lastSync: 'Last sync',
    maxSelected: 'You can select up to {{limit}} Instagram items.',
    noConnection:
      'Connect an Instagram Business or Creator account to sync public media and make selected posts available to profile conversations.',
    observation: 'Conversation note',
    observationPlaceholder: 'Example: This was from a recent trip to Medellin.',
    oauthLocalWarning:
      'Instagram OAuth is using {{redirectUri}}. This exact URI must be registered in Meta under Instagram > API setup with Instagram login. If Meta only has the production API URL, this local flow will end on an Instagram unavailable page.',
    reconnect: 'Reconnect',
    save: 'Save selection',
    select: 'Select',
    selected: '{{count}}/{{limit}} selected',
    showMoreItems: 'Show {{count}} more',
    showing: 'Showing {{count}} of {{total}}',
    sync: 'Sync',
    synced: 'Instagram media synced',
    title: 'Profile integrations',
    useCaption: 'Use caption',
    updated: 'Selection saved',
    username: '@{{username}}',
  },
  es: {
    connect: 'Conectar Instagram',
    connected: 'Conectado',
    connectedNoSync: 'Instagram conectado. La sincronización no terminó; usa Sincronizar para reintentar.',
    disconnect: 'Desconectar',
    empty: 'Aún no hay contenido sincronizado de Instagram.',
    emptySelected: 'Aún no hay imágenes seleccionadas.',
    error: 'Algo salió mal',
    filterAll: 'Todas',
    filterLabel: 'Filtro de publicaciones de Instagram',
    filterSelected: 'Seleccionadas',
    hint: 'Selecciona hasta {{limit}} publicaciones y agrega observaciones. El perfil podrá usar estas imágenes y enlaces cuando los visitantes pidan fotos o contenido de Instagram.',
    integrations: 'Integraciones',
    instagram: 'Instagram',
    lastSync: 'Última sincronización',
    maxSelected: 'Puedes seleccionar hasta {{limit}} elementos de Instagram.',
    noConnection:
      'Conecta una cuenta de Instagram Business o Creator para sincronizar contenido público y usar publicaciones seleccionadas en las conversaciones del perfil.',
    observation: 'Observación para conversación',
    observationPlaceholder: 'Ejemplo: Esta fue de un viaje reciente a Medellín.',
    oauthLocalWarning:
      'OAuth de Instagram está usando {{redirectUri}}. Esta URI exacta debe estar registrada en Meta en Instagram > API setup with Instagram login. Si Meta solo tiene la URL del API de producción, este flujo local terminará en la página no disponible de Instagram.',
    reconnect: 'Reconectar',
    save: 'Guardar selección',
    select: 'Seleccionar',
    selected: '{{count}}/{{limit}} seleccionadas',
    showMoreItems: 'Mostrar {{count}} más',
    showing: 'Mostrando {{count}} de {{total}}',
    sync: 'Sincronizar',
    synced: 'Instagram sincronizado',
    title: 'Integraciones del perfil',
    useCaption: 'Usar descripción',
    updated: 'Selección guardada',
    username: '@{{username}}',
  },
};

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
  const t = copy[language];
  const [activeTab, setActiveTab] = React.useState<IntegrationTab>('instagram');
  const [page, setPage] = React.useState<InstagramMediaPage | null>(null);
  const [media, setMedia] = React.useState<InstagramMedia[]>([]);
  const [error, setError] = React.useState<string>('');
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const loadInstagram = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const nextPage = await getInstagramMedia(profileId);
      setPage(nextPage);
      setMedia(nextPage.media);
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t.error));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t.error]);

  React.useEffect(() => {
    loadInstagram().catch((err) => {
      logger.error(err);
    });
  }, [loadInstagram]);

  React.useEffect(() => {
    if (searchParams.get('provider') === 'instagram' && searchParams.get('connected') === '1') {
      if (searchParams.get('synced') === '0') {
        toast.warning(t.connectedNoSync);
      } else {
        toast.success(t.connected);
      }
    }
  }, [searchParams, t.connected, t.connectedNoSync]);

  const selectionLimit = page?.selection_limit ?? 10;
  const selectedCount = media.filter((item) => item.selected).length;

  const handleConnect = React.useCallback(async (): Promise<void> => {
    setIsConnecting(true);

    try {
      const connection = await createInstagramConnectUrl(profileId);

      if (connection.oauth?.uses_local_redirect && connection.oauth.redirect_uri) {
        toast.warning(interpolate(t.oauthLocalWarning, { redirectUri: connection.oauth.redirect_uri }));
      }

      window.location.assign(connection.url);
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.error));
      setIsConnecting(false);
    }
  }, [profileId, t.error, t.oauthLocalWarning]);

  const handleSync = React.useCallback(async (): Promise<void> => {
    setIsSyncing(true);

    try {
      await syncInstagramMedia(profileId);
      await loadInstagram();
      toast.success(t.synced);
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.error));
    } finally {
      setIsSyncing(false);
    }
  }, [loadInstagram, profileId, t.error, t.synced]);

  const handleDisconnect = React.useCallback(async (): Promise<void> => {
    setIsDisconnecting(true);

    try {
      await disconnectInstagram(profileId);
      setPage({ integration: null, media: [], selection_limit: selectionLimit });
      setMedia([]);
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.error));
    } finally {
      setIsDisconnecting(false);
    }
  }, [profileId, selectionLimit, t.error]);

  const handleToggleSelected = React.useCallback(
    (mediaId: number | string, checked: boolean): void => {
      if (checked && selectedCount >= selectionLimit) {
        toast.error(interpolate(t.maxSelected, { limit: selectionLimit }));
        return;
      }

      setMedia((current) =>
        current.map((item) => (String(item.id) === String(mediaId) ? { ...item, selected: checked } : item))
      );
    },
    [selectedCount, selectionLimit, t.maxSelected]
  );

  const handleObservationChange = React.useCallback((mediaId: number | string, observation: string): void => {
    setMedia((current) =>
      current.map((item) => (String(item.id) === String(mediaId) ? { ...item, observation } : item))
    );
  }, []);

  const handleSave = React.useCallback(async (): Promise<void> => {
    setIsSaving(true);

    try {
      const nextPage = await updateInstagramMediaSelection(
        profileId,
        media.map((item) => ({
          id: item.id,
          observation: item.observation ?? '',
          selected: item.selected,
        }))
      );

      setPage(nextPage);
      setMedia(nextPage.media);
      toast.success(t.updated);
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.error));
    } finally {
      setIsSaving(false);
    }
  }, [media, profileId, t.error, t.updated]);

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
            subheader={interpolate(t.hint, { limit: selectionLimit })}
            title={t.title}
          />
          <Divider />
          <Tabs
            onChange={(_, value: IntegrationTab) => {
              setActiveTab(value);
            }}
            sx={{ px: 3 }}
            value={activeTab}
          >
            <Tab icon={<InstagramLogoIcon />} iconPosition="start" label={t.instagram} value="instagram" />
          </Tabs>
          <Divider />
          <CardContent>
            {activeTab === 'instagram' ? (
              <InstagramPanel
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
                selectedCount={selectedCount}
                selectionLimit={selectionLimit}
                t={t}
              />
            ) : null}
          </CardContent>
        </Card>
      </Stack>
    </React.Fragment>
  );
}

interface InstagramPanelProps {
  isConnecting: boolean;
  isDisconnecting: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  media: InstagramMedia[];
  page: InstagramMediaPage | null;
  selectedCount: number;
  selectionLimit: number;
  t: (typeof copy)['es'];
  onConnect: () => void;
  onDisconnect: () => void;
  onObservationChange: (mediaId: number | string, observation: string) => void;
  onSave: () => void;
  onSync: () => void;
  onToggleSelected: (mediaId: number | string, checked: boolean) => void;
}

function InstagramPanel({
  isConnecting,
  isDisconnecting,
  isLoading,
  isSaving,
  isSyncing,
  media,
  page,
  selectedCount,
  selectionLimit,
  t,
  onConnect,
  onDisconnect,
  onObservationChange,
  onSave,
  onSync,
  onToggleSelected,
}: InstagramPanelProps): React.JSX.Element {
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

  React.useEffect(() => {
    setVisibleMediaCount(INITIAL_VISIBLE_MEDIA_COUNT);
  }, [mediaFilter, media.length]);

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
          <Typography variant="h6">{t.instagram}</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 760 }} variant="body2">
            {t.noConnection}
          </Typography>
        </Stack>
        {localRedirectUri ? (
          <Alert severity="warning">{interpolate(t.oauthLocalWarning, { redirectUri: localRedirectUri })}</Alert>
        ) : null}
        <Button
          data-testid="instagram-connect-button"
          disabled={isConnecting}
          onClick={onConnect}
          startIcon={<LinkSimpleIcon />}
          variant="contained"
        >
          {isConnecting ? `${t.connect}...` : t.connect}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {localRedirectUri ? (
        <Alert severity="warning">{interpolate(t.oauthLocalWarning, { redirectUri: localRedirectUri })}</Alert>
      ) : null}
      <Stack
        direction={{ sm: 'row', xs: 'column' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <InstagramLogoIcon fontSize="var(--icon-fontSize-lg)" />
            <Typography variant="h6">
              {page.integration.username
                ? interpolate(t.username, { username: page.integration.username })
                : t.instagram}
            </Typography>
            <Chip color="success" label={t.connected} size="small" variant="outlined" />
            <Chip label={interpolate(t.selected, { count: selectedCount, limit: selectionLimit })} size="small" />
          </Stack>
          {page.integration.last_synced_at ? (
            <Typography color="text.secondary" variant="body2">
              {t.lastSync}: {formatDate(page.integration.last_synced_at)}
            </Typography>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button disabled={isSyncing} onClick={onSync} startIcon={<ArrowsClockwiseIcon />} variant="outlined">
            {isSyncing ? `${t.sync}...` : t.sync}
          </Button>
          <Button
            data-testid="instagram-reconnect-button"
            disabled={isConnecting}
            onClick={onConnect}
            startIcon={<LinkSimpleIcon />}
            variant="outlined"
          >
            {t.reconnect}
          </Button>
          <Button
            color="error"
            disabled={isDisconnecting}
            onClick={onDisconnect}
            startIcon={<TrashIcon />}
            variant="outlined"
          >
            {t.disconnect}
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
              aria-label={t.filterLabel}
              data-testid="instagram-media-filter"
              role="group"
              sx={{
                alignItems: 'center',
                display: 'inline-flex',
                gap: 0.75,
              }}
            >
              <Button
                aria-pressed={mediaFilter === 'all'}
                data-testid="instagram-media-filter-all"
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
                {t.filterAll}
              </Button>
              <Typography aria-hidden="true" color="text.disabled" variant="body2">
                |
              </Typography>
              <Button
                aria-pressed={mediaFilter === 'selected'}
                data-testid="instagram-media-filter-selected"
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
                {t.filterSelected}
              </Button>
            </Box>
            <Typography color="text.secondary" variant="body2">
              {interpolate(t.showing, {
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
              <InstagramMediaCard
                item={item}
                key={item.id}
                onObservationChange={onObservationChange}
                onToggleSelected={onToggleSelected}
                selectedCount={selectedCount}
                selectionLimit={selectionLimit}
                t={t}
              />
            ))}
          </Box>
          {visibleMedia.length === 0 ? <Typography color="text.secondary">{t.emptySelected}</Typography> : null}
          <Stack
            direction={{ sm: 'row', xs: 'column' }}
            spacing={1.5}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              {hasMoreMedia ? (
                <Button
                  data-testid="instagram-media-show-more"
                  onClick={() => {
                    setVisibleMediaCount((current) => current + INITIAL_VISIBLE_MEDIA_COUNT);
                  }}
                  variant="outlined"
                >
                  {interpolate(t.showMoreItems, { count: remainingMediaCount })}
                </Button>
              ) : null}
            </Box>
            <Button disabled={isSaving} onClick={onSave} variant="contained">
              {isSaving ? `${t.save}...` : t.save}
            </Button>
          </Stack>
        </React.Fragment>
      ) : (
        <Stack spacing={2} sx={{ alignItems: 'flex-start', py: 2 }}>
          <Typography color="text.secondary">{t.empty}</Typography>
          <Button disabled={isSyncing} onClick={onSync} startIcon={<ArrowsClockwiseIcon />} variant="outlined">
            {isSyncing ? `${t.sync}...` : t.sync}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

interface InstagramMediaCardProps {
  item: InstagramMedia;
  selectedCount: number;
  selectionLimit: number;
  t: (typeof copy)['es'];
  onObservationChange: (mediaId: number | string, observation: string) => void;
  onToggleSelected: (mediaId: number | string, checked: boolean) => void;
}

function InstagramMediaCard({
  item,
  selectedCount,
  selectionLimit,
  t,
  onObservationChange,
  onToggleSelected,
}: InstagramMediaCardProps): React.JSX.Element {
  const imageUrl = item.thumbnail_url || item.media_url;
  const disableUnchecked = !item.selected && selectedCount >= selectionLimit;

  return (
    <Box
      data-testid="instagram-media-card"
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
            <InstagramLogoIcon fontSize="var(--icon-fontSize-xl)" />
          </Stack>
        )}
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
          label={t.select}
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
            {t.useCaption}
          </Button>
        ) : null}
        <OutlinedInput
          disabled={!item.selected}
          fullWidth
          multiline
          onChange={(event) => {
            onObservationChange(item.id, event.target.value);
          }}
          placeholder={t.observationPlaceholder}
          rows={3}
          value={item.observation ?? ''}
        />
        {item.permalink ? (
          <Button component="a" href={item.permalink} rel="noreferrer" size="small" target="_blank" variant="text">
            Instagram
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
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

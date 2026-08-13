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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowsClockwise as ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { ImagesSquare as ImagesSquareIcon } from '@phosphor-icons/react/dist/ssr/ImagesSquare';
import { InstagramLogo as InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Play as PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { TiktokLogo as TiktokLogoIcon } from '@phosphor-icons/react/dist/ssr/TiktokLogo';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { YoutubeLogo as YoutubeLogoIcon } from '@phosphor-icons/react/dist/ssr/YoutubeLogo';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import {
  enabledIntegrationProviders as enabledIntegrationFeatureProviders,
  getProfileFeatures,
} from '@/lib/features/api-client';
import { trackAnalyticsEvent } from '@/lib/google-analytics';
import {
  addYouTubeMedia,
  createIntegrationConnectUrl,
  deleteOnlyFansMedia,
  deleteOtherMedia,
  deleteYouTubeMedia,
  disconnectIntegration,
  getIntegrationDestinations,
  getIntegrationMedia,
  saveOnlyFansIntegration,
  saveYouTubeIntegration,
  syncIntegrationMedia,
  updateIntegrationMediaSelection,
  updateOtherMedia,
  uploadOnlyFansMedia,
  uploadOtherMedia,
  type IntegrationDestination,
  type IntegrationMedia,
  type IntegrationMediaPage,
  type IntegrationProvider,
  type OnlyFansConnectionInput,
  type OnlyFansMediaUploadInput,
  type OtherMediaInput,
  type OtherMediaUploadInput,
  type ProfileIntegration,
  type YouTubeConnectionInput,
  type YouTubeMediaInput,
} from '@/lib/integrations/api-client';
import { toast } from '@/components/core/toaster';
import { ProfileGuideTutorialLink } from '@/components/dashboard/help/profile-guide-tutorial-link';
import { OtherMediaForm } from '@/components/dashboard/profiles/integrations/other-media-form';

const metadata = { title: `Integrations | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
type MediaFilter = 'all' | 'selected';
type Language = 'en' | 'es';
type LegacyIntegrationProvider = Exclude<IntegrationProvider, 'other'>;
type DisconnectableIntegrationProvider = 'instagram' | 'tiktok' | 'youtube';

interface DisconnectConfirmationCopy {
  body: string;
  cancel: string;
  confirm: string;
  title: string;
}

const INITIAL_VISIBLE_MEDIA_COUNT = 6;
const UNLIMITED_SELECTION_LIMIT = 2_147_483_647;

function OnlyFansIcon({ style, ...props }: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="1em"
      style={{ display: 'block', flex: '0 0 auto', ...style }}
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <circle cx="9.25" cy="12" r="7.25" stroke="currentColor" strokeWidth="2.1" />
      <circle cx="8.75" cy="12" r="2.15" stroke="currentColor" strokeWidth="2.1" />
      <path
        d="M10.75 19.15 14.08 7.9a3.65 3.65 0 0 1 3.5-2.62H22l-1.48 3.62h-3.45l-.98 3.28h4.02c-.9 2.07-2.6 3.2-5.08 3.44l-1.04 3.53"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
    </svg>
  );
}

const providerConfigs = {
  instagram: {
    Icon: InstagramLogoIcon,
    testIdPrefix: 'instagram',
  },
  onlyfans: {
    Icon: OnlyFansIcon,
    testIdPrefix: 'onlyfans',
  },
  tiktok: {
    Icon: TiktokLogoIcon,
    testIdPrefix: 'tiktok',
  },
  youtube: {
    Icon: YoutubeLogoIcon,
    testIdPrefix: 'youtube',
  },
  other: {
    Icon: ImagesSquareIcon,
    testIdPrefix: 'other',
  },
} satisfies Record<IntegrationProvider, { Icon: React.ElementType; testIdPrefix: string }>;

const copy = {
  en: {
    common: {
      addMedia: 'Add image or video',
      connected: 'Connected',
      closeVideo: 'Close video',
      deleteMedia: 'Delete media',
      disconnect: 'Disconnect',
      error: 'Something went wrong',
      filterAll: 'All',
      filterSelected: 'Selected',
      image: 'Image',
      integrations: 'Integrations',
      goToChannel: 'Go to channel',
      ageRestricted: '18+',
      lastSync: 'Last sync',
      observation: 'Conversation note',
      openOnProvider: 'Open on {{provider}}',
      playVideo: 'Play {{provider}} video',
      save: 'Save selection',
      select: 'Select',
      selected: '{{count}}/{{limit}} selected',
      unlimited: 'Unlimited',
      showMoreItems: 'Show {{count}} more',
      showing: 'Showing {{count}} of {{total}}',
      sync: 'Sync',
      title: 'Profile integrations',
      updated: 'Selection saved',
      uploaded: 'Media uploaded',
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
      onlyfans: {
        adultConfirmation: 'I confirm this integration may contain content intended for adults.',
        cancelUpload: 'Cancel',
        connect: 'Save OnlyFans',
        connectedNoSync: '',
        empty: 'No OnlyFans promotional media has been uploaded yet.',
        emptySelected: 'No selected OnlyFans media yet.',
        filterLabel: 'OnlyFans media filter',
        hint: 'Upload up to {{limit}} selected promotional images or videos. Their notes become verified context for profile conversations.',
        invalidProfileUrl: 'Use an onlyfans.com profile URL that matches the username.',
        label: 'OnlyFans',
        maxSelected: 'You can select up to {{limit}} OnlyFans items.',
        noConnection:
          'Add the public profile reference and upload only promotional media you own or are authorized to use.',
        observationPlaceholder: 'Example: Promotional Hulk-inspired set with green wardrobe.',
        oauthLocalWarning: '',
        profileUrl: 'OnlyFans profile URL',
        reconnect: 'Edit account',
        rightsConfirmation: 'I own this content or have explicit authorization to publish and use it.',
        synced: '',
        upload: 'Upload media',
        uploadCaption: 'Public caption',
        uploadFile: 'Choose image or video',
        uploadObservation: 'Conversation note',
        selectForChat: 'Use in profile conversations',
        usernameLabel: 'OnlyFans username',
      },
      youtube: {
        addVideo: 'Add video',
        cancelUpload: 'Cancel',
        channelUrl: 'YouTube channel URL',
        connect: 'Add channel',
        connectedNoSync: '',
        description: 'Description for profile conversations',
        empty: 'No YouTube videos have been added yet.',
        emptySelected: 'No selected YouTube videos yet.',
        filterLabel: 'YouTube video filter',
        hint: 'Add a YouTube channel and up to {{limit}} selected videos. Their descriptions become verified context for profile conversations.',
        label: 'YouTube',
        maxSelected: 'You can select up to {{limit}} YouTube videos.',
        noConnection: 'Add the public YouTube channel whose videos will be available in profile conversations.',
        observationPlaceholder: 'Explain when the profile should recommend this video.',
        oauthLocalWarning: '',
        reconnect: 'Edit channel',
        selectForChat: 'Use in profile conversations',
        synced: '',
        videoUrl: 'YouTube video URL',
      },
    },
  },
  es: {
    common: {
      addMedia: 'Agregar imagen o video',
      connected: 'Conectado',
      closeVideo: 'Cerrar video',
      deleteMedia: 'Eliminar contenido',
      disconnect: 'Desconectar',
      error: 'Algo salió mal',
      filterAll: 'Todas',
      filterSelected: 'Seleccionadas',
      image: 'Imagen',
      integrations: 'Integraciones',
      goToChannel: 'Ir al canal',
      ageRestricted: '18+',
      lastSync: 'Última sincronización',
      observation: 'Observación para conversación',
      openOnProvider: 'Abrir en {{provider}}',
      playVideo: 'Reproducir video de {{provider}}',
      save: 'Guardar selección',
      select: 'Seleccionar',
      selected: '{{count}}/{{limit}} seleccionadas',
      unlimited: 'Sin límite',
      showMoreItems: 'Mostrar {{count}} más',
      showing: 'Mostrando {{count}} de {{total}}',
      sync: 'Sincronizar',
      title: 'Integraciones del perfil',
      updated: 'Selección guardada',
      uploaded: 'Contenido cargado',
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
      onlyfans: {
        adultConfirmation: 'Confirmo que esta integración puede contener contenido dirigido a adultos.',
        cancelUpload: 'Cancelar',
        connect: 'Guardar OnlyFans',
        connectedNoSync: '',
        empty: 'Aún no has cargado contenido promocional de OnlyFans.',
        emptySelected: 'Aún no hay contenido de OnlyFans seleccionado.',
        filterLabel: 'Filtro de contenido de OnlyFans',
        hint: 'Carga imágenes o videos promocionales y selecciona hasta {{limit}}. Sus observaciones serán contexto verificado para las conversaciones del perfil.',
        invalidProfileUrl: 'Usa una URL de perfil de onlyfans.com que coincida con el usuario.',
        label: 'OnlyFans',
        maxSelected: 'Puedes seleccionar hasta {{limit}} elementos de OnlyFans.',
        noConnection: 'Agrega la referencia del perfil público y carga solo contenido promocional propio o autorizado.',
        observationPlaceholder: 'Ejemplo: Set promocional inspirado en Hulk con vestuario verde.',
        oauthLocalWarning: '',
        profileUrl: 'URL del perfil de OnlyFans',
        reconnect: 'Editar cuenta',
        rightsConfirmation: 'Soy propietario de este contenido o tengo autorización expresa para publicarlo y usarlo.',
        synced: '',
        upload: 'Cargar contenido',
        uploadCaption: 'Descripción pública',
        uploadFile: 'Elegir imagen o video',
        uploadObservation: 'Observación para conversación',
        selectForChat: 'Usar en las conversaciones del perfil',
        usernameLabel: 'Usuario de OnlyFans',
      },
      youtube: {
        addVideo: 'Agregar video',
        cancelUpload: 'Cancelar',
        channelUrl: 'URL del canal de YouTube',
        connect: 'Agregar canal',
        connectedNoSync: '',
        description: 'Descripción para las conversaciones del perfil',
        empty: 'Aún no has agregado videos de YouTube.',
        emptySelected: 'Aún no hay videos de YouTube seleccionados.',
        filterLabel: 'Filtro de videos de YouTube',
        hint: 'Agrega un canal de YouTube y selecciona hasta {{limit}} videos. Sus descripciones serán contexto verificado para las conversaciones del perfil.',
        label: 'YouTube',
        maxSelected: 'Puedes seleccionar hasta {{limit}} videos de YouTube.',
        noConnection:
          'Agrega el canal público de YouTube cuyos videos estarán disponibles en las conversaciones del perfil.',
        observationPlaceholder: 'Explica cuándo debe el perfil recomendar este video.',
        oauthLocalWarning: '',
        reconnect: 'Editar canal',
        selectForChat: 'Usar en las conversaciones del perfil',
        synced: '',
        videoUrl: 'URL del video de YouTube',
      },
    },
  },
} satisfies Record<
  Language,
  {
    common: Record<string, string>;
    providers: Record<LegacyIntegrationProvider, Record<string, string>>;
  }
>;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { i18n, t: translate } = useTranslation();
  const [searchParams] = useSearchParams();
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
  const t = copy[language];
  const providerFromQuery = normalizeProvider(searchParams.get('provider'));
  const [activeTab, setActiveTab] = React.useState<IntegrationProvider>(providerFromQuery ?? 'instagram');
  const [page, setPage] = React.useState<IntegrationMediaPage | null>(null);
  const [media, setMedia] = React.useState<IntegrationMedia[]>([]);
  const [error, setError] = React.useState<string>('');
  const [destinations, setDestinations] = React.useState<IntegrationDestination[]>([]);
  const [enabledProviders, setEnabledProviders] = React.useState<IntegrationProvider[]>([]);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const providerText: Record<string, string> =
    activeTab === 'other'
      ? {
          connect: translate('dashboard.profiles.detail.integrations.other.addMedia'),
          connectedNoSync: '',
          empty: translate('dashboard.profiles.detail.integrations.other.empty'),
          emptySelected: translate('dashboard.profiles.detail.integrations.other.emptySelected'),
          editMedia: translate('dashboard.profiles.detail.integrations.other.editMedia'),
          filterLabel: translate('dashboard.profiles.detail.integrations.other.filterLabel'),
          hint: translate('dashboard.profiles.detail.integrations.other.hint'),
          label: translate('dashboard.profiles.detail.integrations.other.label'),
          maxSelected: translate('dashboard.profiles.detail.integrations.other.maxSelected'),
          noConnection: translate('dashboard.profiles.detail.integrations.other.noConnection'),
          observationPlaceholder: translate('dashboard.profiles.detail.integrations.other.descriptionPlaceholder'),
          oauthLocalWarning: '',
          reconnect: '',
          synced: '',
        }
      : t.providers[activeTab as LegacyIntegrationProvider];
  const disconnectConfirmation: DisconnectConfirmationCopy | null = isDisconnectableProvider(activeTab)
    ? {
        body: translate(`dashboard.profiles.detail.integrations.disconnectConfirmation.${activeTab}.body`),
        cancel: translate('dashboard.profiles.detail.integrations.disconnectConfirmation.cancel'),
        confirm: translate('dashboard.profiles.detail.integrations.disconnectConfirmation.confirm'),
        title: translate(`dashboard.profiles.detail.integrations.disconnectConfirmation.${activeTab}.title`),
      }
    : null;

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
      const features = await getProfileFeatures(profileId);
      const providers = enabledIntegrationFeatureProviders(features) as IntegrationProvider[];

      setEnabledProviders(providers);

      if (!providers.length) {
        return;
      }

      if (!providers.includes(activeTab)) {
        setActiveTab(providers[0]);
        return;
      }

      const [nextPage, nextDestinations] = await Promise.all([
        getIntegrationMedia(profileId, activeTab, language),
        activeTab === 'other' ? getIntegrationDestinations(language) : Promise.resolve([]),
      ]);
      setPage(nextPage);
      setMedia(nextPage.media);
      setDestinations(nextDestinations);
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t.common.error));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, language, profileId, t.common.error]);

  React.useEffect(() => {
    loadIntegration().catch((err) => {
      logger.error(err);
    });
  }, [loadIntegration]);

  React.useEffect(() => {
    const connectedProvider = normalizeProvider(searchParams.get('provider'));

    if (connectedProvider && connectedProvider !== 'other' && searchParams.get('connected') === '1') {
      const messages = t.providers[connectedProvider];

      if (searchParams.get('synced') === '0') {
        toast.warning(messages.connectedNoSync);
      } else {
        toast.success(t.common.connected);
      }

      trackAnalyticsEvent('integration_connected', { provider: connectedProvider });
    }
  }, [searchParams, t.common.connected, t.providers]);

  const selectionLimit = page?.selection_limit ?? 10;
  const selectionLimitLabel = selectionLimit >= UNLIMITED_SELECTION_LIMIT ? t.common.unlimited : selectionLimit;
  const selectedCount = media.filter((item) => item.selected).length;
  const activeProviderEnabled = enabledProviders.includes(activeTab);

  const handleConnect = React.useCallback(async (): Promise<void> => {
    setIsConnecting(true);

    try {
      const connection = await createIntegrationConnectUrl(profileId, activeTab);

      trackAnalyticsEvent('integration_connect_started', { provider: activeTab });

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
      trackAnalyticsEvent('integration_synced', { provider: activeTab });
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.common.error));
    } finally {
      setIsSyncing(false);
    }
  }, [activeTab, loadIntegration, profileId, providerText.synced, t.common.error]);

  const handleOnlyFansConnect = React.useCallback(
    async (input: OnlyFansConnectionInput): Promise<void> => {
      setIsConnecting(true);

      try {
        await saveOnlyFansIntegration(profileId, input);
        await loadIntegration();
        toast.success(t.common.connected);
        trackAnalyticsEvent('integration_connected', { provider: 'onlyfans' });
      } catch (err) {
        logger.error(err);
        toast.error(getErrorMessage(err, t.common.error));
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [loadIntegration, profileId, t.common.connected, t.common.error]
  );

  const handleOnlyFansUpload = React.useCallback(
    async (input: OnlyFansMediaUploadInput): Promise<void> => {
      setIsUploading(true);

      try {
        await uploadOnlyFansMedia(profileId, input);
        await loadIntegration();
        toast.success(t.common.uploaded);
        trackAnalyticsEvent('integration_media_added', { media_type: 'upload', provider: 'onlyfans' });
      } catch (err) {
        logger.error(err);
        toast.error(getErrorMessage(err, t.common.error));
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [loadIntegration, profileId, t.common.error, t.common.uploaded]
  );

  const handleYouTubeConnect = React.useCallback(
    async (input: YouTubeConnectionInput): Promise<void> => {
      setIsConnecting(true);

      try {
        await saveYouTubeIntegration(profileId, input);
        await loadIntegration();
        toast.success(t.common.connected);
        trackAnalyticsEvent('integration_connected', { provider: 'youtube' });
      } catch (err) {
        logger.error(err);
        toast.error(getErrorMessage(err, t.common.error));
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [loadIntegration, profileId, t.common.connected, t.common.error]
  );

  const handleYouTubeAddMedia = React.useCallback(
    async (input: YouTubeMediaInput): Promise<void> => {
      setIsUploading(true);

      try {
        await addYouTubeMedia(profileId, input);
        await loadIntegration();
        toast.success(t.common.uploaded);
        trackAnalyticsEvent('integration_media_added', { media_type: 'video', provider: 'youtube' });
      } catch (err) {
        logger.error(err);
        toast.error(getErrorMessage(err, t.common.error));
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [loadIntegration, profileId, t.common.error, t.common.uploaded]
  );

  const handleOtherMediaSave = React.useCallback(
    async (input: OtherMediaInput, mediaId?: number | string): Promise<void> => {
      setIsUploading(true);

      try {
        if (mediaId === undefined) {
          if (!input.file) {
            throw new Error(translate('dashboard.profiles.detail.integrations.other.validation.fileRequired'));
          }

          const uploadInput: OtherMediaUploadInput = {
            ...input,
            file: input.file,
            rightsConfirmed: Boolean(input.rightsConfirmed),
          };
          await uploadOtherMedia(profileId, uploadInput, language);
          trackAnalyticsEvent('integration_media_added', { media_type: 'upload', provider: 'other' });
        } else {
          await updateOtherMedia(profileId, mediaId, input, language);
          trackAnalyticsEvent('integration_media_updated', { provider: 'other' });
        }

        await loadIntegration();
        toast.success(
          translate(`dashboard.profiles.detail.integrations.other.${mediaId === undefined ? 'uploaded' : 'updated'}`)
        );
      } catch (err) {
        logger.error(err);
        toast.error(getErrorMessage(err, t.common.error));
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [language, loadIntegration, profileId, t.common.error, translate]
  );

  const handleDeleteMedia = React.useCallback(
    async (mediaId: number | string): Promise<void> => {
      try {
        if (activeTab === 'youtube') {
          await deleteYouTubeMedia(profileId, mediaId);
        } else if (activeTab === 'other') {
          await deleteOtherMedia(profileId, mediaId);
        } else {
          await deleteOnlyFansMedia(profileId, mediaId);
        }
        await loadIntegration();
      } catch (err) {
        logger.error(err);
        toast.error(getErrorMessage(err, t.common.error));
      }
    },
    [activeTab, loadIntegration, profileId, t.common.error]
  );

  const handleDisconnect = React.useCallback(async (): Promise<boolean> => {
    setIsDisconnecting(true);

    try {
      await disconnectIntegration(profileId, activeTab);
      setPage({ integration: null, media: [], selection_limit: selectionLimit });
      setMedia([]);
      trackAnalyticsEvent('integration_disconnected', { provider: activeTab });

      return true;
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t.common.error));

      return false;
    } finally {
      setIsDisconnecting(false);
    }
  }, [activeTab, profileId, selectionLimit, t.common.error]);

  const handleToggleSelected = React.useCallback(
    (mediaId: number | string, checked: boolean): void => {
      if (checked && selectedCount >= selectionLimit) {
        toast.error(interpolate(providerText.maxSelected, { limit: selectionLimitLabel }));
        return;
      }

      setMedia((current) =>
        current.map((item) => (String(item.id) === String(mediaId) ? { ...item, selected: checked } : item))
      );
    },
    [providerText.maxSelected, selectedCount, selectionLimit, selectionLimitLabel]
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
      trackAnalyticsEvent('integration_selection_saved', {
        provider: activeTab,
        selected_count: nextPage.media.filter((item) => item.selected).length,
      });
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
        <ProfileGuideTutorialLink step="socialNetworks" />

        {isLoading ? (
          <Stack sx={{ alignItems: 'center', p: 5 }}>
            <CircularProgress />
          </Stack>
        ) : null}

        {!isLoading && enabledProviders.length === 0 ? (
          <Alert color="info">
            {language === 'en'
              ? 'No integrations are enabled for this profile. Enable integrations from profile Settings first.'
              : 'No hay integraciones habilitadas para este perfil. Activa integraciones desde Configuración del perfil primero.'}
          </Alert>
        ) : null}

        {enabledProviders.length && activeProviderEnabled ? (
          <Card>
            <CardHeader
              avatar={<PlugsConnectedIcon fontSize="var(--icon-fontSize-lg)" />}
              subheader={interpolate(providerText.hint, { limit: selectionLimitLabel })}
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
              {Object.entries(providerConfigs)
                .filter(([provider]) => enabledProviders.includes(provider as IntegrationProvider))
                .map(([provider, providerConfig]) => {
                  const typedProvider = provider as IntegrationProvider;
                  const Icon = providerConfig.Icon;

                  return (
                    <Tab
                      icon={<Icon />}
                      iconPosition="start"
                      key={typedProvider}
                      label={
                        typedProvider === 'other'
                          ? translate('dashboard.profiles.detail.integrations.other.label')
                          : t.providers[typedProvider].label
                      }
                      value={typedProvider}
                    />
                  );
                })}
            </Tabs>
            <Divider />
            <CardContent>
              <IntegrationPanel
                common={t.common}
                destinations={destinations}
                disconnectConfirmation={disconnectConfirmation}
                isConnecting={isConnecting}
                isDisconnecting={isDisconnecting}
                isLoading={isLoading}
                isSaving={isSaving}
                isSyncing={isSyncing}
                isUploading={isUploading}
                media={media}
                onConnect={handleConnect}
                onDeleteMedia={handleDeleteMedia}
                onDisconnect={handleDisconnect}
                onObservationChange={handleObservationChange}
                onOnlyFansConnect={handleOnlyFansConnect}
                onOnlyFansUpload={handleOnlyFansUpload}
                onOtherMediaSave={handleOtherMediaSave}
                onSave={handleSave}
                onSync={handleSync}
                onToggleSelected={handleToggleSelected}
                onYouTubeAddMedia={handleYouTubeAddMedia}
                onYouTubeConnect={handleYouTubeConnect}
                page={page}
                provider={activeTab}
                providerConfig={providerConfigs[activeTab]}
                providerText={providerText}
                selectedCount={selectedCount}
                selectionLimit={selectionLimit}
              />
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </React.Fragment>
  );
}

interface IntegrationPanelProps {
  common: (typeof copy)['es']['common'];
  destinations: IntegrationDestination[];
  disconnectConfirmation: DisconnectConfirmationCopy | null;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  isUploading: boolean;
  media: IntegrationMedia[];
  page: IntegrationMediaPage | null;
  provider: IntegrationProvider;
  providerConfig: (typeof providerConfigs)[IntegrationProvider];
  providerText: Record<string, string>;
  selectedCount: number;
  selectionLimit: number;
  onConnect: () => void;
  onDisconnect: () => Promise<boolean>;
  onDeleteMedia: (mediaId: number | string) => Promise<void>;
  onOnlyFansConnect: (input: OnlyFansConnectionInput) => Promise<void>;
  onOnlyFansUpload: (input: OnlyFansMediaUploadInput) => Promise<void>;
  onOtherMediaSave: (input: OtherMediaInput, mediaId?: number | string) => Promise<void>;
  onObservationChange: (mediaId: number | string, observation: string) => void;
  onSave: () => void;
  onSync: () => void;
  onToggleSelected: (mediaId: number | string, checked: boolean) => void;
  onYouTubeAddMedia: (input: YouTubeMediaInput) => Promise<void>;
  onYouTubeConnect: (input: YouTubeConnectionInput) => Promise<void>;
}

function IntegrationPanel({
  common,
  destinations,
  disconnectConfirmation,
  isConnecting,
  isDisconnecting,
  isLoading,
  isSaving,
  isSyncing,
  isUploading,
  media,
  page,
  provider,
  providerConfig,
  providerText,
  selectedCount,
  selectionLimit,
  onConnect,
  onDisconnect,
  onDeleteMedia,
  onOnlyFansConnect,
  onOnlyFansUpload,
  onOtherMediaSave,
  onObservationChange,
  onSave,
  onSync,
  onToggleSelected,
  onYouTubeAddMedia,
  onYouTubeConnect,
}: IntegrationPanelProps): React.JSX.Element {
  const localRedirectUri = page?.oauth?.uses_local_redirect ? page.oauth.redirect_uri : null;
  const [mediaFilter, setMediaFilter] = React.useState<MediaFilter>('all');
  const [isAddingOnlyFansMedia, setIsAddingOnlyFansMedia] = React.useState(false);
  const [isAddingOtherMedia, setIsAddingOtherMedia] = React.useState(false);
  const [isEditingOnlyFans, setIsEditingOnlyFans] = React.useState(false);
  const [editingOtherMedia, setEditingOtherMedia] = React.useState<IntegrationMedia | null>(null);
  const [isAddingYouTubeMedia, setIsAddingYouTubeMedia] = React.useState(false);
  const [isDisconnectConfirmationOpen, setIsDisconnectConfirmationOpen] = React.useState(false);
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
  const addYouTubeVideoLabel = 'addVideo' in providerText ? providerText.addVideo : common.addMedia;

  React.useEffect(() => {
    setVisibleMediaCount(INITIAL_VISIBLE_MEDIA_COUNT);
  }, [mediaFilter, media.length, provider]);

  React.useEffect(() => {
    setMediaFilter('all');
    setIsAddingOnlyFansMedia(false);
    setIsAddingOtherMedia(false);
    setIsEditingOnlyFans(false);
    setEditingOtherMedia(null);
    setIsAddingYouTubeMedia(false);
    setIsDisconnectConfirmationOpen(false);
  }, [provider]);

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!page?.integration) {
    if (provider === 'other') {
      return (
        <React.Fragment>
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
            <Button
              data-testid="other-add-media-button"
              disabled={isAddingOtherMedia}
              onClick={() => {
                setEditingOtherMedia(null);
                setIsAddingOtherMedia(true);
              }}
              startIcon={<UploadSimpleIcon />}
              variant="contained"
            >
              {common.addMedia}
            </Button>
          </Stack>
          <OtherMediaDialog
            destinations={destinations}
            isSaving={isUploading}
            label={common.addMedia}
            onClose={() => {
              setIsAddingOtherMedia(false);
            }}
            onSave={async (input) => {
              await onOtherMediaSave(input);
              setIsAddingOtherMedia(false);
            }}
            open={isAddingOtherMedia}
            selectionAvailable={selectedCount < selectionLimit}
          />
        </React.Fragment>
      );
    }

    if (provider === 'onlyfans') {
      return <OnlyFansAccountForm isSaving={isConnecting} onSave={onOnlyFansConnect} providerText={providerText} />;
    }

    if (provider === 'youtube') {
      return <YouTubeChannelForm isSaving={isConnecting} onSave={onYouTubeConnect} providerText={providerText} />;
    }

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
                ? interpolate(common.username, { username: normalizeUsername(page.integration.username) })
                : providerText.label}
            </Typography>
            <Chip color="success" label={common.connected} size="small" variant="outlined" />
            <Chip
              label={interpolate(common.selected, {
                count: selectedCount,
                limit: selectionLimit >= UNLIMITED_SELECTION_LIMIT ? common.unlimited : selectionLimit,
              })}
              size="small"
            />
          </Stack>
          {page.integration.last_synced_at ? (
            <Typography color="text.secondary" variant="body2">
              {common.lastSync}: {formatDate(page.integration.last_synced_at)}
            </Typography>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {provider !== 'onlyfans' && provider !== 'other' && provider !== 'youtube' ? (
            <React.Fragment>
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
            </React.Fragment>
          ) : provider === 'onlyfans' ? (
            <React.Fragment>
              <Button
                data-testid="onlyfans-add-media-button"
                disabled={isAddingOnlyFansMedia}
                onClick={() => {
                  setIsAddingOnlyFansMedia(true);
                }}
                startIcon={<UploadSimpleIcon />}
                variant="contained"
              >
                {common.addMedia}
              </Button>
              <Button
                data-testid="onlyfans-edit-account-button"
                onClick={() => {
                  setIsEditingOnlyFans((current) => !current);
                }}
                startIcon={<PencilSimpleIcon />}
                variant="outlined"
              >
                {providerText.reconnect}
              </Button>
            </React.Fragment>
          ) : provider === 'other' ? (
            <Button
              data-testid="other-add-media-button"
              disabled={isAddingOtherMedia}
              onClick={() => {
                setEditingOtherMedia(null);
                setIsAddingOtherMedia(true);
              }}
              startIcon={<UploadSimpleIcon />}
              variant="contained"
            >
              {common.addMedia}
            </Button>
          ) : (
            <Button
              data-testid="youtube-add-media-button"
              disabled={isAddingYouTubeMedia}
              onClick={() => {
                setIsAddingYouTubeMedia(true);
              }}
              startIcon={<YoutubeLogoIcon />}
              variant="contained"
            >
              {addYouTubeVideoLabel}
            </Button>
          )}
          {disconnectConfirmation ? (
            <Button
              color="error"
              disabled={isDisconnecting}
              onClick={() => {
                setIsDisconnectConfirmationOpen(true);
              }}
              startIcon={<TrashIcon />}
              variant="outlined"
            >
              {common.disconnect}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {provider === 'onlyfans' ? (
        <React.Fragment>
          {isEditingOnlyFans ? (
            <OnlyFansAccountForm
              integration={page.integration}
              isSaving={isConnecting}
              onSave={async (input) => {
                await onOnlyFansConnect(input);
                setIsEditingOnlyFans(false);
              }}
              providerText={providerText}
            />
          ) : null}
          {isAddingOnlyFansMedia ? (
            <OnlyFansUploadForm
              isUploading={isUploading}
              onCancel={() => {
                setIsAddingOnlyFansMedia(false);
              }}
              onUpload={async (input) => {
                await onOnlyFansUpload(input);
                setIsAddingOnlyFansMedia(false);
              }}
              providerText={providerText}
              selectionAvailable={selectedCount < selectionLimit}
            />
          ) : null}
        </React.Fragment>
      ) : null}

      {provider === 'youtube' && isAddingYouTubeMedia ? (
        <YouTubeMediaDialog
          isSaving={isUploading}
          onClose={() => {
            setIsAddingYouTubeMedia(false);
          }}
          onSave={async (input) => {
            await onYouTubeAddMedia(input);
            setIsAddingYouTubeMedia(false);
          }}
          providerText={providerText}
          selectionAvailable={selectedCount < selectionLimit}
        />
      ) : null}

      {provider === 'other' ? (
        <OtherMediaDialog
          destinations={destinations}
          editingMedia={editingOtherMedia}
          isSaving={isUploading}
          label={editingOtherMedia ? providerText.editMedia : common.addMedia}
          onClose={() => {
            setIsAddingOtherMedia(false);
            setEditingOtherMedia(null);
          }}
          onSave={async (input) => {
            await onOtherMediaSave(input, editingOtherMedia?.id);
            setIsAddingOtherMedia(false);
            setEditingOtherMedia(null);
          }}
          open={isAddingOtherMedia || Boolean(editingOtherMedia)}
          selectionAvailable={selectedCount < selectionLimit || Boolean(editingOtherMedia?.selected)}
        />
      ) : null}

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
                onDeleteMedia={
                  provider === 'onlyfans' || provider === 'other' || provider === 'youtube' ? onDeleteMedia : undefined
                }
                onEditMedia={
                  provider === 'other'
                    ? (itemToEdit) => {
                        setIsAddingOtherMedia(false);
                        setEditingOtherMedia(itemToEdit);
                      }
                    : undefined
                }
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
          {provider !== 'onlyfans' && provider !== 'other' && provider !== 'youtube' ? (
            <Button disabled={isSyncing} onClick={onSync} startIcon={<ArrowsClockwiseIcon />} variant="outlined">
              {isSyncing ? `${common.sync}...` : common.sync}
            </Button>
          ) : null}
        </Stack>
      )}
      {disconnectConfirmation ? (
        <Dialog
          aria-labelledby="integration-disconnect-confirmation-title"
          fullWidth
          maxWidth="sm"
          onClose={() => {
            if (!isDisconnecting) {
              setIsDisconnectConfirmationOpen(false);
            }
          }}
          open={isDisconnectConfirmationOpen}
        >
          <DialogTitle id="integration-disconnect-confirmation-title">{disconnectConfirmation.title}</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" variant="body2">
              {disconnectConfirmation.body}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              disabled={isDisconnecting}
              onClick={() => {
                setIsDisconnectConfirmationOpen(false);
              }}
            >
              {disconnectConfirmation.cancel}
            </Button>
            <Button
              color="error"
              disabled={isDisconnecting}
              onClick={() => {
                void onDisconnect().then((disconnected) => {
                  if (disconnected) {
                    setIsDisconnectConfirmationOpen(false);
                  }
                });
              }}
              variant="contained"
            >
              {isDisconnecting ? `${common.disconnect}...` : disconnectConfirmation.confirm}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
}

function OtherMediaDialog({
  destinations,
  editingMedia,
  isSaving,
  label,
  onClose,
  onSave,
  open,
  selectionAvailable,
}: {
  destinations: IntegrationDestination[];
  editingMedia?: IntegrationMedia | null;
  isSaving: boolean;
  label: string;
  onClose: () => void;
  onSave: (input: OtherMediaInput) => Promise<void>;
  open: boolean;
  selectionAvailable: boolean;
}): React.JSX.Element {
  return (
    <Dialog
      aria-label={label}
      fullWidth
      maxWidth="sm"
      onClose={() => {
        if (!isSaving) {
          onClose();
        }
      }}
      open={open}
    >
      <DialogContent sx={{ p: { sm: 3, xs: 2 } }}>
        <OtherMediaForm
          destinations={destinations}
          editingMedia={editingMedia}
          isSaving={isSaving}
          onCancel={onClose}
          onSave={onSave}
          selectionAvailable={selectionAvailable}
        />
      </DialogContent>
    </Dialog>
  );
}

function YouTubeChannelForm({
  isSaving,
  onSave,
  providerText,
}: {
  isSaving: boolean;
  onSave: (input: YouTubeConnectionInput) => Promise<void>;
  providerText: Record<string, string>;
}): React.JSX.Element {
  const [channelUrl, setChannelUrl] = React.useState('');
  const validUrl = isValidYouTubeUrl(channelUrl, 'channel');

  return (
    <Box
      component="form"
      data-testid="youtube-channel-form"
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave({ channelUrl: channelUrl.trim() }).catch(() => undefined);
      }}
      sx={{ border: '1px dashed var(--mui-palette-divider)', borderRadius: 1, p: 3 }}
    >
      <Stack spacing={2}>
        <Typography color="text.secondary" sx={{ maxWidth: 760 }} variant="body2">
          {providerText.noConnection}
        </Typography>
        <TextField
          error={Boolean(channelUrl.trim()) && !validUrl}
          fullWidth
          inputProps={{ 'data-testid': 'youtube-channel-url-input' }}
          label={providerText.channelUrl}
          onChange={(event) => {
            setChannelUrl(event.target.value);
          }}
          placeholder="https://www.youtube.com/@canal"
          required
          type="url"
          value={channelUrl}
        />
        <Box>
          <Button
            data-testid="youtube-connect-button"
            disabled={isSaving || !validUrl}
            startIcon={<YoutubeLogoIcon />}
            type="submit"
            variant="contained"
          >
            {isSaving ? `${providerText.connect}...` : providerText.connect}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function YouTubeMediaDialog({
  isSaving,
  onClose,
  onSave,
  providerText,
  selectionAvailable,
}: {
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: YouTubeMediaInput) => Promise<void>;
  providerText: Record<string, string>;
  selectionAvailable: boolean;
}): React.JSX.Element {
  const [videoUrl, setVideoUrl] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selected, setSelected] = React.useState(selectionAvailable);
  const validUrl = isValidYouTubeUrl(videoUrl, 'video');

  React.useEffect(() => {
    if (!selectionAvailable) {
      setSelected(false);
    }
  }, [selectionAvailable]);

  return (
    <Dialog
      aria-labelledby="youtube-media-dialog-title"
      fullWidth
      maxWidth="sm"
      onClose={() => {
        if (!isSaving) {
          onClose();
        }
      }}
      open
    >
      <Box
        component="form"
        data-testid="youtube-media-form"
        onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSave({ description: description.trim(), selected, videoUrl: videoUrl.trim() }).catch(() => undefined);
        }}
        sx={{ position: 'relative' }}
      >
        <DialogTitle id="youtube-media-dialog-title" sx={{ pr: 7 }}>
          {providerText.addVideo}
        </DialogTitle>
        <IconButton
          aria-label={providerText.cancelUpload}
          disabled={isSaving}
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 16, top: 16 }}
        >
          <XIcon />
        </IconButton>
        <DialogContent dividers sx={{ p: { sm: 3, xs: 2 } }}>
          <Stack spacing={2}>
            <TextField
              autoFocus
              error={Boolean(videoUrl.trim()) && !validUrl}
              fullWidth
              inputProps={{ 'data-testid': 'youtube-video-url-input' }}
              label={providerText.videoUrl}
              onChange={(event) => {
                setVideoUrl(event.target.value);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              type="url"
              value={videoUrl}
            />
            <TextField
              fullWidth
              inputProps={{ 'data-testid': 'youtube-video-description-input' }}
              label={providerText.description}
              multiline
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder={providerText.observationPlaceholder}
              required
              rows={3}
              value={description}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={selected}
                  disabled={!selectionAvailable && !selected}
                  onChange={(event) => {
                    setSelected(event.target.checked);
                  }}
                />
              }
              label={providerText.selectForChat}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { sm: 3, xs: 2 }, py: 2 }}>
          <Button disabled={isSaving} onClick={onClose} type="button">
            {providerText.cancelUpload}
          </Button>
          <Button
            data-testid="youtube-media-save-button"
            disabled={isSaving || !validUrl || !description.trim()}
            startIcon={<YoutubeLogoIcon />}
            type="submit"
            variant="contained"
          >
            {isSaving ? `${providerText.addVideo}...` : providerText.addVideo}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function OnlyFansAccountForm({
  integration,
  isSaving,
  onSave,
  providerText,
}: {
  integration?: ProfileIntegration;
  isSaving: boolean;
  onSave: (input: OnlyFansConnectionInput) => Promise<void>;
  providerText: Record<string, string>;
}): React.JSX.Element {
  const profileUrl =
    integration?.metadata && typeof integration.metadata.profile_url === 'string'
      ? integration.metadata.profile_url
      : '';
  const [username, setUsername] = React.useState(integration?.username ?? '');
  const [url, setUrl] = React.useState(profileUrl);
  const [rightsConfirmed, setRightsConfirmed] = React.useState(Boolean(integration));
  const [adultContentConfirmed, setAdultContentConfirmed] = React.useState(Boolean(integration));
  const hasValidProfileUrl = isValidOnlyFansProfileUrl(username, url);

  React.useEffect(() => {
    setUsername(integration?.username ?? '');
    setUrl(profileUrl);
    setRightsConfirmed(Boolean(integration));
    setAdultContentConfirmed(Boolean(integration));
  }, [integration, profileUrl]);

  return (
    <Box
      component="form"
      data-testid="onlyfans-account-form"
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave({
          adultContentConfirmed,
          profileUrl: url.trim(),
          rightsConfirmed,
          username: username.trim(),
        }).catch(() => undefined);
      }}
      sx={{
        border: '1px dashed var(--mui-palette-divider)',
        borderRadius: 1,
        p: 3,
      }}
    >
      <Stack spacing={2}>
        {!integration ? (
          <Typography color="text.secondary" sx={{ maxWidth: 760 }} variant="body2">
            {providerText.noConnection}
          </Typography>
        ) : null}
        <Stack direction={{ md: 'row', xs: 'column' }} spacing={2}>
          <TextField
            error={Boolean(url.trim()) && !hasValidProfileUrl}
            fullWidth
            helperText={Boolean(url.trim()) && !hasValidProfileUrl ? providerText.invalidProfileUrl : undefined}
            inputProps={{ 'data-testid': 'onlyfans-username-input' }}
            label={providerText.usernameLabel}
            onChange={(event) => {
              setUsername(event.target.value);
            }}
            required
            value={username}
          />
          <TextField
            fullWidth
            inputProps={{ 'data-testid': 'onlyfans-profile-url-input' }}
            label={providerText.profileUrl}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
            required
            type="url"
            value={url}
          />
        </Stack>
        <FormControlLabel
          control={
            <Checkbox
              checked={rightsConfirmed}
              data-testid="onlyfans-account-rights-checkbox"
              onChange={(event) => {
                setRightsConfirmed(event.target.checked);
              }}
            />
          }
          label={providerText.rightsConfirmation}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={adultContentConfirmed}
              data-testid="onlyfans-adult-checkbox"
              onChange={(event) => {
                setAdultContentConfirmed(event.target.checked);
              }}
            />
          }
          label={providerText.adultConfirmation}
        />
        <Box>
          <Button
            data-testid="onlyfans-connect-button"
            disabled={
              isSaving ||
              !username.trim() ||
              !url.trim() ||
              !hasValidProfileUrl ||
              !rightsConfirmed ||
              !adultContentConfirmed
            }
            startIcon={<LinkSimpleIcon />}
            type="submit"
            variant={integration ? 'outlined' : 'contained'}
          >
            {isSaving ? `${providerText.connect}...` : providerText.connect}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function OnlyFansUploadForm({
  isUploading,
  onCancel,
  onUpload,
  providerText,
  selectionAvailable,
}: {
  isUploading: boolean;
  onCancel: () => void;
  onUpload: (input: OnlyFansMediaUploadInput) => Promise<void>;
  providerText: Record<string, string>;
  selectionAvailable: boolean;
}): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [caption, setCaption] = React.useState('');
  const [observation, setObservation] = React.useState('');
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false);
  const [selected, setSelected] = React.useState(selectionAvailable);

  React.useEffect(() => {
    if (!selectionAvailable) {
      setSelected(false);
    }
  }, [selectionAvailable]);

  return (
    <Box
      component="form"
      data-testid="onlyfans-upload-form"
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!file) {
          return;
        }

        onUpload({
          caption,
          file,
          observation,
          rightsConfirmed,
          selected,
        })
          .then(() => {
            setFile(null);
            setCaption('');
            setObservation('');
            setRightsConfirmed(false);
            setSelected(selectionAvailable);

            if (inputRef.current) {
              inputRef.current.value = '';
            }
          })
          .catch(() => undefined);
      }}
      sx={{ border: '1px solid var(--mui-palette-divider)', borderRadius: 1, p: 3 }}
    >
      <Stack spacing={2}>
        <Typography variant="h6">{providerText.upload}</Typography>
        <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Button component="label" startIcon={<UploadSimpleIcon />} variant="outlined">
            {providerText.uploadFile}
            <input
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              data-testid="onlyfans-file-input"
              hidden
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
              }}
              ref={inputRef}
              type="file"
            />
          </Button>
          {file ? (
            <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }} variant="body2">
              {file.name}
            </Typography>
          ) : null}
        </Stack>
        <TextField
          fullWidth
          label={providerText.uploadCaption}
          onChange={(event) => {
            setCaption(event.target.value);
          }}
          value={caption}
        />
        <TextField
          fullWidth
          label={providerText.uploadObservation}
          multiline
          onChange={(event) => {
            setObservation(event.target.value);
          }}
          placeholder={providerText.observationPlaceholder}
          rows={3}
          value={observation}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={rightsConfirmed}
              data-testid="onlyfans-upload-rights-checkbox"
              onChange={(event) => {
                setRightsConfirmed(event.target.checked);
              }}
            />
          }
          label={providerText.rightsConfirmation}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={selected}
              disabled={!selectionAvailable && !selected}
              onChange={(event) => {
                setSelected(event.target.checked);
              }}
            />
          }
          label={providerText.selectForChat}
        />
        <Stack direction="row" spacing={1}>
          <Button
            data-testid="onlyfans-upload-button"
            disabled={isUploading || !file || !rightsConfirmed}
            startIcon={<UploadSimpleIcon />}
            type="submit"
            variant="contained"
          >
            {isUploading ? `${providerText.upload}...` : providerText.upload}
          </Button>
          <Button disabled={isUploading} onClick={onCancel} type="button" variant="outlined">
            {providerText.cancelUpload}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

interface IntegrationMediaCardProps {
  common: (typeof copy)['es']['common'];
  item: IntegrationMedia;
  provider: IntegrationProvider;
  providerConfig: (typeof providerConfigs)[IntegrationProvider];
  providerText: Record<string, string>;
  selectedCount: number;
  selectionLimit: number;
  onDeleteMedia?: (mediaId: number | string) => Promise<void>;
  onEditMedia?: (media: IntegrationMedia) => void;
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
  onDeleteMedia,
  onEditMedia,
  onToggleSelected,
}: IntegrationMediaCardProps): React.JSX.Element {
  const isVideo = item.media_type?.trim().toUpperCase().includes('VIDEO') ?? false;
  const imageUrl = item.thumbnail_url || (!isVideo ? item.media_url : null);
  const disableUnchecked = !item.selected && selectedCount >= selectionLimit;
  const Icon = providerConfig.Icon;
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
          ) : isVideo && item.media_url ? (
            <Box
              component="video"
              muted
              playsInline
              preload="metadata"
              src={item.media_url}
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
          {item.age_restricted ? (
            <Chip
              color="warning"
              label={common.ageRestricted}
              size="small"
              sx={{ position: 'absolute', right: 12, top: 12 }}
            />
          ) : null}
          {onDeleteMedia ? (
            <Tooltip title={common.deleteMedia}>
              <IconButton
                aria-label={common.deleteMedia}
                data-testid={`${providerConfig.testIdPrefix}-media-delete`}
                onClick={() => {
                  onDeleteMedia(item.id).catch(() => undefined);
                }}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  bottom: 12,
                  color: 'common.white',
                  position: 'absolute',
                  right: 12,
                }}
              >
                <TrashIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {onEditMedia ? (
            <Tooltip title={providerText.editMedia}>
              <IconButton
                aria-label={providerText.editMedia}
                data-testid={`${providerConfig.testIdPrefix}-media-edit`}
                onClick={() => {
                  onEditMedia(item);
                }}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  bottom: 12,
                  color: 'common.white',
                  left: 12,
                  position: 'absolute',
                }}
              >
                <PencilSimpleIcon />
              </IconButton>
            </Tooltip>
          ) : null}
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
          {item.caption && provider !== 'other' ? (
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
          {provider !== 'other' ? (
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
          ) : item.destination_label ? (
            <Chip label={item.destination_label} size="small" sx={{ alignSelf: 'flex-start' }} variant="outlined" />
          ) : null}
          {item.permalink ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button component="a" href={item.permalink} rel="noreferrer" size="small" target="_blank" variant="text">
                {provider === 'other' && item.action_label ? item.action_label : providerText.label}
              </Button>
              {provider === 'youtube' && item.channel_url ? (
                <Button
                  component="a"
                  href={item.channel_url}
                  rel="noreferrer"
                  size="small"
                  target="_blank"
                  variant="text"
                >
                  {common.goToChannel}
                </Button>
              ) : null}
            </Stack>
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
            <Box
              sx={{
                aspectRatio: provider === 'youtube' ? '16 / 9' : '9 / 16',
                maxHeight: '78vh',
                width: provider === 'youtube' ? '100%' : 'min(100%, 440px)',
              }}
            >
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
        {item.permalink || item.channel_url ? (
          <DialogActions>
            {item.permalink ? (
              <Button component="a" href={item.permalink} rel="noreferrer" target="_blank">
                {provider === 'other' && item.action_label
                  ? item.action_label
                  : interpolate(common.openOnProvider, { provider: providerText.label })}
              </Button>
            ) : null}
            {provider === 'youtube' && item.channel_url ? (
              <Button component="a" href={item.channel_url} rel="noreferrer" target="_blank">
                {common.goToChannel}
              </Button>
            ) : null}
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
  if (provider === 'onlyfans') {
    return item.media_url ? { kind: 'video', src: item.media_url } : null;
  }

  if (provider === 'tiktok') {
    const videoId = getTikTokVideoId(item);

    return videoId
      ? {
          kind: 'embed',
          src: `https://www.tiktok.com/player/v1/${videoId}?autoplay=1`,
        }
      : null;
  }

  if (provider === 'youtube') {
    const videoId = getYouTubeVideoId(item);

    return videoId
      ? {
          kind: 'embed',
          src: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`,
        }
      : null;
  }

  if (item.media_url && !isInstagramPostUrl(item.media_url)) {
    return { kind: 'video', src: item.media_url };
  }

  const embedUrl = getInstagramEmbedUrl(item.permalink || item.media_url);

  return embedUrl ? { kind: 'embed', src: embedUrl } : null;
}

function getYouTubeVideoId(item: IntegrationMedia): string | null {
  const providerMediaId = String(item.provider_media_id ?? '').trim();

  if (/^[\w-]{11}$/.test(providerMediaId)) {
    return providerMediaId;
  }

  for (const value of [item.media_url, item.permalink]) {
    if (!value) {
      continue;
    }

    try {
      const url = new URL(value);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const candidate = url.hostname.endsWith('youtu.be')
        ? pathParts[0]
        : url.searchParams.get('v') || (['embed', 'live', 'shorts'].includes(pathParts[0] ?? '') ? pathParts[1] : null);

      if (candidate && /^[\w-]{11}$/.test(candidate)) {
        return candidate;
      }
    } catch {
      // Try the next provider URL.
    }
  }

  return null;
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

function isDisconnectableProvider(value: IntegrationProvider): value is DisconnectableIntegrationProvider {
  return value === 'instagram' || value === 'tiktok' || value === 'youtube';
}

function normalizeProvider(value: null | string): IntegrationProvider | null {
  return value === 'instagram' || value === 'onlyfans' || value === 'other' || value === 'tiktok' || value === 'youtube'
    ? value
    : null;
}

function isValidYouTubeUrl(value: string, kind: 'channel' | 'video'): boolean {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();

    if (
      url.protocol !== 'https:' ||
      !['youtube.com', 'youtu.be'].some((domain) => host === domain || host.endsWith(`.${domain}`))
    ) {
      return false;
    }

    if (kind === 'channel') {
      return (
        (host === 'youtube.com' || host.endsWith('.youtube.com')) &&
        /^\/(?:@[^/]+|channel\/[^/]+|user\/[^/]+)\/?$/.test(url.pathname)
      );
    }

    return host === 'youtu.be' || url.searchParams.has('v') || /^\/(?:shorts|live|embed)\/[^/]+/.test(url.pathname);
  } catch {
    return false;
  }
}

function isValidOnlyFansProfileUrl(username: string, value: string): boolean {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const profileUsername = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0] ?? '').replace(/^@/, '');

    return (
      (host === 'onlyfans.com' || host === 'www.onlyfans.com') &&
      profileUsername.toLowerCase() === username.trim().replace(/^@/, '').toLowerCase()
    );
  } catch {
    return false;
  }
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, '');
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

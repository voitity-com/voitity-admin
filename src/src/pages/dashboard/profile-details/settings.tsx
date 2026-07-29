'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Gear as GearIcon } from '@phosphor-icons/react/dist/ssr/Gear';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import type { FeatureFlag, FeatureKey } from '@/lib/features/api-client';
import { getProfileFeatures, updateProfileFeatures } from '@/lib/features/api-client';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Settings | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const PROFILE_FEATURE_TOAST_ID = 'profile-feature-setting';
type Language = 'en' | 'es';

const copy = {
  en: {
    disabled: 'Disabled',
    enabled: 'Enabled',
    empty: 'No profile feature settings are available. Enable modules from New features first.',
    error: 'Profile settings could not be loaded.',
    integrationsSubheader: 'Choose which published integrations this profile can configure and use in chat.',
    integrationsTitle: 'Integrations',
    productsDescription: 'Shows the Products submenu and allows product management for this profile.',
    productsTitle: 'Products',
    saved: 'Profile setting updated',
    subheader: 'Select which published modules are available in this profile.',
    title: 'Settings',
  },
  es: {
    disabled: 'Desactivada',
    enabled: 'Activada',
    empty: 'No hay settings de funcionalidades disponibles. Activa módulos desde Nuevas funcionalidades primero.',
    error: 'No fue posible cargar la configuración del perfil.',
    integrationsSubheader: 'Elige qué integraciones publicadas puede configurar y usar este perfil en el chat.',
    integrationsTitle: 'Integraciones',
    productsDescription: 'Muestra el submenu Productos y permite administrar productos para este perfil.',
    productsTitle: 'Productos',
    saved: 'Configuración del perfil actualizada',
    subheader: 'Selecciona qué módulos publicados están disponibles en este perfil.',
    title: 'Configuración',
  },
} satisfies Record<Language, Record<string, string>>;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { i18n } = useTranslation();
  const language: Language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
  const t = copy[language];
  const [error, setError] = React.useState('');
  const [features, setFeatures] = React.useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [savingKey, setSavingKey] = React.useState<FeatureKey | null>(null);

  const loadFeatures = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setFeatures(await getProfileFeatures(profileId));
    } catch (err) {
      logger.error(err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t.error]);

  React.useEffect(() => {
    loadFeatures().catch((err) => {
      logger.error(err);
    });
  }, [loadFeatures]);

  const handleToggle = React.useCallback(
    async (key: FeatureKey, enabled: boolean): Promise<void> => {
      setSavingKey(key);

      try {
        setFeatures(await updateProfileFeatures(profileId, { [key]: enabled }));
        window.dispatchEvent(new CustomEvent('profile-features-updated', { detail: { profileId } }));
        toast.success(t.saved, { id: PROFILE_FEATURE_TOAST_ID, position: 'top-right' });
      } catch (err) {
        logger.error(err);
        toast.error(t.error, { id: PROFILE_FEATURE_TOAST_ID, position: 'top-right' });
      } finally {
        setSavingKey(null);
      }
    },
    [profileId, t.error, t.saved]
  );

  const availableFeatures = features.filter((feature) => feature.available);
  const productsFeature = availableFeatures.find((feature) => feature.key === 'products') ?? null;
  const integrationFeatures = availableFeatures.filter((feature) => feature.group === 'integrations');

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <GearIcon fontSize="var(--icon-fontSize-lg)" />
            <Typography variant="h4">{t.title}</Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">
            {t.subheader}
          </Typography>
        </Stack>

        {error ? <Alert color="error">{error}</Alert> : null}

        {isLoading ? (
          <Stack sx={{ alignItems: 'center', p: 5 }}>
            <CircularProgress />
          </Stack>
        ) : availableFeatures.length === 0 ? (
          <Alert color="info">{t.empty}</Alert>
        ) : (
          <Stack spacing={3}>
            {productsFeature ? (
              <Card>
                <CardHeader
                  avatar={<PackageIcon fontSize="var(--icon-fontSize-lg)" />}
                  subheader={t.productsDescription}
                  title={t.productsTitle}
                />
                <Divider />
                <CardContent>
                  <ProfileFeatureSwitch
                    disabled={savingKey !== null}
                    disabledLabel={t.disabled}
                    enabledLabel={t.enabled}
                    feature={productsFeature}
                    onChange={handleToggle}
                  />
                </CardContent>
              </Card>
            ) : null}

            {integrationFeatures.length ? (
              <Card>
                <CardHeader
                  avatar={<PlugsConnectedIcon fontSize="var(--icon-fontSize-lg)" />}
                  subheader={t.integrationsSubheader}
                  title={t.integrationsTitle}
                />
                <Divider />
                <CardContent>
                  <Stack divider={<Divider flexItem />} spacing={2}>
                    {integrationFeatures.map((feature) => (
                      <ProfileFeatureSwitch
                        disabled={savingKey !== null}
                        disabledLabel={t.disabled}
                        enabledLabel={t.enabled}
                        feature={feature}
                        key={feature.key}
                        onChange={handleToggle}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ) : null}
          </Stack>
        )}
      </Stack>
    </React.Fragment>
  );
}

function ProfileFeatureSwitch({
  disabled,
  disabledLabel,
  enabledLabel,
  feature,
  onChange,
}: {
  disabled: boolean;
  disabledLabel: string;
  enabledLabel: string;
  feature: FeatureFlag;
  onChange: (key: FeatureKey, enabled: boolean) => void;
}): React.JSX.Element {
  return (
    <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
      <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
        <Typography variant="subtitle1">{feature.name}</Typography>
        <Chip
          color={feature.effective ? 'success' : 'default'}
          label={feature.effective ? enabledLabel : disabledLabel}
          size="small"
          sx={{ alignSelf: 'flex-start' }}
          variant="soft"
        />
      </Stack>
      <FormControlLabel
        control={
          <Switch
            checked={feature.enabled}
            disabled={disabled}
            onChange={(_, checked) => {
              onChange(feature.key, checked);
            }}
          />
        }
        label={feature.enabled ? enabledLabel : disabledLabel}
      />
    </Stack>
  );
}

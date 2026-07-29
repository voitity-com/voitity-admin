'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import type { FeatureFlag, FeatureKey } from '@/lib/features/api-client';
import { getAdminFeatures, updateAdminFeatures } from '@/lib/features/api-client';
import { toast } from '@/components/core/toaster';

const metadata = { title: `New features | Dashboard | ${config.site.name}` } satisfies Metadata;
const FEATURE_TOGGLE_TOAST_ID = 'admin-feature-toggle';
type Language = 'en' | 'es';

const copy = {
  en: {
    disabled: 'Disabled',
    enabled: 'Enabled',
    error: 'Feature toggles could not be loaded.',
    integrationsSubheader: 'Publish integration modules before profiles can opt into them.',
    integrationsTitle: 'Integrations',
    productsDescription: 'Allows profiles to enable the Products section and product recommendations.',
    productsTitle: 'Products',
    saved: 'Feature toggle updated',
    subheader: 'Control which modules are available before they appear in profile settings.',
    title: 'New features',
  },
  es: {
    disabled: 'Desactivada',
    enabled: 'Activada',
    error: 'No fue posible cargar los feature toggles.',
    integrationsSubheader: 'Publica módulos de integración antes de que los perfiles puedan activarlos.',
    integrationsTitle: 'Integraciones',
    productsDescription: 'Permite activar la sección Productos y las recomendaciones de productos por perfil.',
    productsTitle: 'Productos',
    saved: 'Feature toggle actualizado',
    subheader: 'Controla qué módulos están disponibles antes de mostrarlos en settings del perfil.',
    title: 'Nuevas funcionalidades',
  },
} satisfies Record<Language, Record<string, string>>;

export function Page(): React.JSX.Element {
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
      setFeatures(await getAdminFeatures());
    } catch (err) {
      logger.error(err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }, [t.error]);

  React.useEffect(() => {
    loadFeatures().catch((err) => {
      logger.error(err);
    });
  }, [loadFeatures]);

  const handleToggle = React.useCallback(
    async (key: FeatureKey, enabled: boolean): Promise<void> => {
      setSavingKey(key);

      try {
        setFeatures(await updateAdminFeatures({ [key]: enabled }));
        toast.success(t.saved, { id: FEATURE_TOGGLE_TOAST_ID, position: 'top-right' });
      } catch (err) {
        logger.error(err);
        toast.error(t.error, { id: FEATURE_TOGGLE_TOAST_ID, position: 'top-right' });
      } finally {
        setSavingKey(null);
      }
    },
    [t.error, t.saved]
  );

  const productsFeature = features.find((feature) => feature.key === 'products') ?? null;
  const integrationFeatures = features.filter((feature) => feature.group === 'integrations');

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Box
        sx={{
          maxWidth: 'var(--Content-maxWidth)',
          m: 'var(--Content-margin)',
          p: 'var(--Content-padding)',
          width: 'var(--Content-width)',
        }}
      >
        <Stack spacing={4}>
          <Box sx={{ flex: '1 1 auto' }}>
            <Typography variant="h4">{t.title}</Typography>
            <Typography color="text.secondary" variant="body2">
              {t.subheader}
            </Typography>
          </Box>

          {error ? <Alert color="error">{error}</Alert> : null}

          {isLoading ? (
            <Card>
              <Stack sx={{ alignItems: 'center', p: 4 }}>
                <CircularProgress />
              </Stack>
            </Card>
          ) : (
            <Stack spacing={4}>
              {productsFeature ? (
                <Card>
                  <CardHeader
                    avatar={<PackageIcon fontSize="var(--icon-fontSize-lg)" />}
                    subheader={t.productsDescription}
                    title={t.productsTitle}
                  />
                  <Divider />
                  <CardContent>
                    <FeatureSwitch
                      disabled={savingKey !== null}
                      disabledLabel={t.disabled}
                      enabledLabel={t.enabled}
                      feature={productsFeature}
                      onChange={handleToggle}
                    />
                  </CardContent>
                </Card>
              ) : null}

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
                      <FeatureSwitch
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
            </Stack>
          )}
        </Stack>
      </Box>
    </React.Fragment>
  );
}

function FeatureSwitch({
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
          color={feature.enabled ? 'success' : 'default'}
          label={feature.enabled ? enabledLabel : disabledLabel}
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

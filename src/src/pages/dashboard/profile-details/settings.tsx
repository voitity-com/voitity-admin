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
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { Gear as GearIcon } from '@phosphor-icons/react/dist/ssr/Gear';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import type { FeatureFlag, FeatureKey } from '@/lib/features/api-client';
import { getProfileFeatures, isFeatureEffective, updateProfileFeatures } from '@/lib/features/api-client';
import { toast } from '@/components/core/toaster';
import { ProfileDomainSettingsPanel } from '@/components/dashboard/profiles/profile-domain-settings';
import { ProfileWidgetSettingsPanel } from '@/components/dashboard/profiles/profile-widget-settings';

const metadata = { title: `Settings | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const PROFILE_FEATURE_TOAST_ID = 'profile-feature-setting';
type SettingsTab = 'domain' | 'features' | 'widget';

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
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
      setError(t('dashboard.profiles.detail.settings.features.error'));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

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
        toast.success(t('dashboard.profiles.detail.settings.features.saved'), {
          id: PROFILE_FEATURE_TOAST_ID,
          position: 'top-right',
        });
      } catch (err) {
        logger.error(err);
        toast.error(t('dashboard.profiles.detail.settings.features.error'), {
          id: PROFILE_FEATURE_TOAST_ID,
          position: 'top-right',
        });
      } finally {
        setSavingKey(null);
      }
    },
    [profileId, t]
  );

  const customDomainsAvailable = isLoading || isFeatureEffective(features, 'domains.custom');
  const requestedTab: SettingsTab = tabParam === 'widget' || tabParam === 'domain' ? tabParam : 'features';
  const selectedTab: SettingsTab =
    requestedTab === 'domain' && !customDomainsAvailable ? 'features' : requestedTab;
  const availableFeatures = features.filter(
    (feature) => feature.available && feature.profile_configurable !== false
  );
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
            <Typography variant="h4">{t('dashboard.profiles.detail.settings.title')}</Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.profiles.detail.settings.description')}
          </Typography>
        </Stack>

        <Tabs
          aria-label={t('dashboard.profiles.detail.settings.tabs.label')}
          onChange={(_, value: SettingsTab) => {
            const nextParams = new URLSearchParams(searchParams);
            if (value === 'features') {
              nextParams.delete('tab');
            } else {
              nextParams.set('tab', value);
            }
            setSearchParams(nextParams, { replace: true });
          }}
          sx={{ minHeight: 44 }}
          value={selectedTab}
          variant="scrollable"
        >
          <Tab label={t('dashboard.profiles.detail.settings.tabs.features')} value="features" />
          <Tab label={t('dashboard.profiles.detail.settings.tabs.widget')} value="widget" />
          {customDomainsAvailable ? (
            <Tab label={t('dashboard.profiles.detail.settings.tabs.domain')} value="domain" />
          ) : null}
        </Tabs>

        {selectedTab === 'domain' ? (
          <ProfileDomainSettingsPanel profileId={profileId} />
        ) : selectedTab === 'widget' ? (
          <ProfileWidgetSettingsPanel profileId={profileId} />
        ) : (
          <React.Fragment>
            {error ? <Alert color="error">{error}</Alert> : null}
            {isLoading ? (
              <Stack sx={{ alignItems: 'center', p: 5 }}>
                <CircularProgress />
              </Stack>
            ) : availableFeatures.length === 0 ? (
              <Alert color="info">{t('dashboard.profiles.detail.settings.features.empty')}</Alert>
            ) : (
              <Stack spacing={3}>
                {productsFeature ? (
                  <Card>
                    <CardHeader
                      avatar={<PackageIcon fontSize="var(--icon-fontSize-lg)" />}
                      subheader={t('dashboard.profiles.detail.settings.features.productsDescription')}
                      title={t('dashboard.profiles.detail.settings.features.productsTitle')}
                    />
                    <Divider />
                    <CardContent>
                      <ProfileFeatureSwitch
                        disabled={savingKey !== null}
                        disabledLabel={t('dashboard.profiles.detail.settings.features.disabled')}
                        enabledLabel={t('dashboard.profiles.detail.settings.features.enabled')}
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
                      subheader={t('dashboard.profiles.detail.settings.features.integrationsSubheader')}
                      title={t('dashboard.profiles.detail.settings.features.integrationsTitle')}
                    />
                    <Divider />
                    <CardContent>
                      <Stack divider={<Divider flexItem />} spacing={2}>
                        {integrationFeatures.map((feature) => (
                          <ProfileFeatureSwitch
                            disabled={savingKey !== null}
                            disabledLabel={t('dashboard.profiles.detail.settings.features.disabled')}
                            enabledLabel={t('dashboard.profiles.detail.settings.features.enabled')}
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
          </React.Fragment>
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
  const { t } = useTranslation();
  const featureName =
    feature.provider === 'other' ? t('dashboard.profiles.detail.integrations.other.label') : feature.name;

  return (
    <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
      <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
        <Typography variant="subtitle1">{featureName}</Typography>
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

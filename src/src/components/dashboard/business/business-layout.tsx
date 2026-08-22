import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Power as PowerIcon } from '@phosphor-icons/react/dist/ssr/Power';
import { RocketLaunch as RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { logger } from '@/lib/default-logger';
import type { Business } from '@/lib/business/api-client';
import { getBusiness, setBusinessActive } from '@/lib/business/api-client';
import { toast } from '@/components/core/toaster';

import { BusinessSideNav } from './business-side-nav';

export function BusinessLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { t } = useTranslation();
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const loadBusiness = React.useCallback((): void => {
    getBusiness(businessId).then(setBusiness).catch((reason) => {
      logger.error(reason);
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    });
  }, [businessId, t]);

  React.useEffect(() => {
    loadBusiness();
    window.addEventListener('business-updated', loadBusiness);

    return () => { window.removeEventListener('business-updated', loadBusiness); };
  }, [loadBusiness]);

  const toggleActive = async (): Promise<void> => {
    if (!business) return;
    setSaving(true);
    try {
      const updated = await setBusinessActive(business.id, business.status !== 'active');
      setBusiness(updated);
      toast.success(t(updated.status === 'active' ? 'dashboard.business.toasts.activated' : 'dashboard.business.toasts.paused'));
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ m: 'var(--Content-margin)', maxWidth: 'var(--Content-maxWidth)', p: 'var(--Content-padding)', pt: { xs: 1.5, md: 2 }, width: 'var(--Content-width)' }}>
      {error ? <Alert color="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {!business && !error ? <Box sx={{ display: 'grid', minHeight: 280, placeItems: 'center' }}><CircularProgress /></Box> : null}
      {business ? (
        <Stack spacing={3}>
          <Paper elevation={16} sx={{ border: '1px solid var(--mui-palette-divider)', borderRadius: 2, overflow: 'hidden', width: '100%' }}>
            <Box sx={{ alignItems: { xs: 'stretch', md: 'center' }, display: 'grid', gap: { xs: 1.25, md: 2 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) auto' }, p: { xs: 1.25, sm: 2 } }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
                <Box sx={{ alignItems: 'center', bgcolor: 'background.level1', borderRadius: 1, display: 'flex', flex: '0 0 auto', height: 36, justifyContent: 'center', width: 36 }}>
                  {business.status === 'active' ? <CheckCircleIcon color="var(--mui-palette-success-main)" fontSize="var(--icon-fontSize-md)" weight="fill" /> : <RocketLaunchIcon color="var(--mui-palette-primary-main)" fontSize="var(--icon-fontSize-md)" weight="fill" />}
                </Box>
                <Stack spacing={0.25} sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, minWidth: 0 }}>
                    <Typography noWrap sx={{ maxWidth: '100%' }} variant="subtitle2">{business.name}</Typography>
                    <Chip color={business.status === 'active' ? 'success' : 'default'} label={t(`dashboard.business.status.${business.status}`)} size="small" variant="outlined" />
                  </Stack>
                  {business.description ? (
                    <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }} variant="caption">{business.description}</Typography>
                  ) : null}
                  <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }} variant="caption">{t('dashboard.business.layout.guidedFlow')}</Typography>
                </Stack>
              </Stack>
              <Button color={business.status === 'active' ? 'warning' : 'primary'} disabled={saving} onClick={toggleActive} startIcon={business.status === 'active' ? <PowerIcon /> : <RocketLaunchIcon />} sx={{ justifySelf: { xs: 'stretch', md: 'end' }, whiteSpace: 'nowrap' }} variant={business.status === 'active' ? 'outlined' : 'contained'}>
                {t(business.status === 'active' ? 'dashboard.business.actions.pause' : 'dashboard.business.actions.activate')}
              </Button>
            </Box>
          </Paper>
          <Stack direction={{ md: 'row', xs: 'column' }} spacing={{ xs: 2, md: 4 }} sx={{ position: 'relative' }}>
            <BusinessSideNav unreadLeadsCount={business.unread_leads_count ?? 0} />
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>{children}</Box>
          </Stack>
        </Stack>
      ) : null}
    </Box>
  );
}

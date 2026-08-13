import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import type { ProfileDomainSettings } from '@/lib/profile-domain/api-client';
import {
  configureProfileDomain,
  disconnectProfileDomain,
  getProfileDomain,
  verifyProfileDomain,
} from '@/lib/profile-domain/api-client';
import { toast } from '@/components/core/toaster';

const TRANSITIONAL_STATUSES = new Set([
  'activating',
  'disconnecting',
  'pending_certificate',
  'pending_dns',
  'pending_provisioning',
]);

export function ProfileDomainSettingsPanel({ profileId }: { profileId: string }): React.JSX.Element {
  const { t } = useTranslation();
  const [domain, setDomain] = React.useState<null | ProfileDomainSettings>(null);
  const [hostname, setHostname] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const loadDomain = React.useCallback(
    async (showLoader = true): Promise<void> => {
      if (showLoader) {
        setIsLoading(true);
      }

      try {
        const nextDomain = await getProfileDomain(profileId);
        setDomain(nextDomain);
        if (nextDomain) {
          setHostname(nextDomain.hostname);
        }
        setError('');
      } catch (loadError) {
        logger.error(loadError);
        setError(t('dashboard.profiles.detail.settings.domain.errors.load'));
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    },
    [profileId, t]
  );

  React.useEffect(() => {
    loadDomain().catch((loadError) => {
      logger.error(loadError);
    });
  }, [loadDomain]);

  React.useEffect(() => {
    if (!domain || !TRANSITIONAL_STATUSES.has(domain.status)) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      loadDomain(false).catch((loadError) => {
        logger.error(loadError);
      });
    }, 10_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [domain, loadDomain]);

  const handleConfigure = React.useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError('');

    try {
      const nextDomain = await configureProfileDomain(profileId, hostname.trim());
      setDomain(nextDomain);
      setHostname(nextDomain.hostname);
      toast.success(t('dashboard.profiles.detail.settings.domain.toasts.queued'));
    } catch (saveError) {
      logger.error(saveError);
      setError(t('dashboard.profiles.detail.settings.domain.errors.configure'));
    } finally {
      setIsSaving(false);
    }
  }, [hostname, profileId, t]);

  const handleVerify = React.useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError('');

    try {
      setDomain(await verifyProfileDomain(profileId));
      toast.success(t('dashboard.profiles.detail.settings.domain.toasts.verificationQueued'));
    } catch (verifyError) {
      logger.error(verifyError);
      setError(t('dashboard.profiles.detail.settings.domain.errors.verify'));
    } finally {
      setIsSaving(false);
    }
  }, [profileId, t]);

  const handleDisconnect = React.useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError('');

    try {
      setDomain(await disconnectProfileDomain(profileId));
      setConfirmOpen(false);
      toast.success(t('dashboard.profiles.detail.settings.domain.toasts.disconnectQueued'));
    } catch (disconnectError) {
      logger.error(disconnectError);
      setError(t('dashboard.profiles.detail.settings.domain.errors.disconnect'));
    } finally {
      setIsSaving(false);
    }
  }, [profileId, t]);

  const handleCopy = React.useCallback(
    async (value: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(t('dashboard.profiles.detail.settings.domain.toasts.copied'));
      } catch (copyError) {
        logger.error(copyError);
        toast.error(t('dashboard.profiles.detail.settings.domain.errors.copy'));
      }
    },
    [t]
  );

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', p: 5 }}>
        <CircularProgress />
      </Stack>
    );
  }

  const statusColor = domain?.status === 'active' ? 'success' : domain?.status === 'failed' ? 'error' : 'warning';
  const disconnectFailed = domain?.status === 'failed' && domain.error?.code === 'disconnect';

  return (
    <Stack spacing={3}>
      {error ? <Alert color="error">{error}</Alert> : null}
      {domain?.error?.message ? <Alert color="error">{domain.error.message}</Alert> : null}

      <Card>
        <CardHeader
          action={
            domain ? (
              <Chip
                color={statusColor}
                label={t(`dashboard.profiles.detail.settings.domain.status.${domain.status}`)}
                size="small"
                variant="soft"
              />
            ) : null
          }
          subheader={t('dashboard.profiles.detail.settings.domain.description')}
          title={t('dashboard.profiles.detail.settings.domain.title')}
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            <TextField
              disabled={Boolean(domain) || isSaving}
              fullWidth
              helperText={t('dashboard.profiles.detail.settings.domain.hostnameHelp')}
              label={t('dashboard.profiles.detail.settings.domain.hostnameLabel')}
              onChange={(event) => {
                setHostname(event.target.value);
              }}
              placeholder="perfil.tudominio.com"
              value={hostname}
            />
            <Alert color="info">{t('dashboard.profiles.detail.settings.domain.nameservers')}</Alert>
          </Stack>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3 }}>
          {!domain ? (
            <Button disabled={isSaving || hostname.trim() === ''} onClick={handleConfigure} variant="contained">
              {t('dashboard.profiles.detail.settings.domain.actions.configure')}
            </Button>
          ) : null}
          {domain && !disconnectFailed ? (
            <Button disabled={isSaving || domain.status === 'disconnecting'} onClick={handleVerify} variant="contained">
              {t('dashboard.profiles.detail.settings.domain.actions.verify')}
            </Button>
          ) : null}
        </CardActions>
      </Card>

      {domain ? (
        <Card>
          <CardHeader
            subheader={t('dashboard.profiles.detail.settings.domain.dns.description')}
            title={t('dashboard.profiles.detail.settings.domain.dns.title')}
          />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <Alert color="warning">{t('dashboard.profiles.detail.settings.domain.dns.rootWarning')}</Alert>
              {domain.dnsRecords.map((record) => (
                <Box
                  key={`${record.name}:${record.value}`}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}
                >
                  <Stack direction={{ md: 'row', xs: 'column' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
                    <Stack spacing={0.5} sx={{ flex: '1 1 28%', minWidth: 0 }}>
                      <Typography color="text.secondary" variant="caption">
                        {t('dashboard.profiles.detail.settings.domain.dns.name')}
                      </Typography>
                      <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
                        {record.name}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5} sx={{ flex: '0 0 auto' }}>
                      <Typography color="text.secondary" variant="caption">
                        {t('dashboard.profiles.detail.settings.domain.dns.type')}
                      </Typography>
                      <Typography variant="body2">{record.type}</Typography>
                    </Stack>
                    <Stack spacing={0.5} sx={{ flex: '1 1 48%', minWidth: 0 }}>
                      <Typography color="text.secondary" variant="caption">
                        {t('dashboard.profiles.detail.settings.domain.dns.value')}
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }} variant="body2">
                        {record.value}
                      </Typography>
                    </Stack>
                    <Button onClick={() => handleCopy(record.value)} size="small" variant="outlined">
                      {t('dashboard.profiles.detail.settings.domain.actions.copy')}
                    </Button>
                  </Stack>
                </Box>
              ))}
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.profiles.detail.settings.domain.dns.propagation')}
              </Typography>
            </Stack>
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
            <Button
              color="error"
              disabled={isSaving || domain.status === 'disconnecting'}
              onClick={() => {
                setConfirmOpen(true);
              }}
              variant="text"
            >
              {t('dashboard.profiles.detail.settings.domain.actions.disconnect')}
            </Button>
            {domain.active ? (
              <Button component="a" href={domain.publicUrl} rel="noreferrer" target="_blank" variant="outlined">
                {t('dashboard.profiles.detail.settings.domain.actions.open')}
              </Button>
            ) : null}
          </CardActions>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={t('dashboard.profiles.detail.settings.domain.requirements.title')} />
        <Divider />
        <CardContent>
          <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5 }}>
            {(['ownership', 'dns', 'https', 'exclusive', 'email'] as const).map((requirement) => (
              <Typography component="li" key={requirement} variant="body2">
                {t(`dashboard.profiles.detail.settings.domain.requirements.items.${requirement}`)}
              </Typography>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        onClose={() => {
          setConfirmOpen(false);
        }}
        open={confirmOpen}
      >
        <DialogTitle>{t('dashboard.profiles.detail.settings.domain.confirm.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('dashboard.profiles.detail.settings.domain.confirm.description', { hostname: domain?.hostname })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={isSaving}
            onClick={() => {
              setConfirmOpen(false);
            }}
          >
            {t('dashboard.profiles.detail.settings.domain.actions.cancel')}
          </Button>
          <Button color="error" disabled={isSaving} onClick={handleDisconnect} variant="contained">
            {t('dashboard.profiles.detail.settings.domain.actions.disconnect')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

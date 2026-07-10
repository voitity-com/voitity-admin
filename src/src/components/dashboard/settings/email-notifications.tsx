'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { EnvelopeSimple as EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components/core/toaster';
import {
  getNotificationPreferences,
  type NotificationPreference,
  updateNotificationPreferences,
} from '@/lib/notifications/api-client';

export function EmailNotifications(): React.JSX.Element {
  const { t } = useTranslation();
  const [preferences, setPreferences] = React.useState<NotificationPreference[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<null | string>(null);
  const [savingKey, setSavingKey] = React.useState<null | string>(null);

  const loadPreferences = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setPreferences(await getNotificationPreferences());
    } catch (err) {
      setError(getErrorMessage(err, t('dashboard.settings.notifications.email.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const handlePreferenceChange = React.useCallback(
    async (key: string, enabled: boolean) => {
      const previousPreferences = preferences;
      const nextPreferences = preferences.map((preference) =>
        preference.key === key ? { ...preference, enabled } : preference
      );

      setPreferences(nextPreferences);
      setSavingKey(key);
      setError(null);

      try {
        const payload = Object.fromEntries(
          nextPreferences.map((preference) => [preference.key, preference.enabled])
        ) as Record<string, boolean>;

        setPreferences(await updateNotificationPreferences(payload));
        toast.success(t('dashboard.settings.notifications.email.toasts.saved'));
      } catch (err) {
        const message = getErrorMessage(err, t('dashboard.settings.notifications.email.errors.save'));

        setPreferences(previousPreferences);
        setError(message);
        toast.error(message);
      } finally {
        setSavingKey(null);
      }
    },
    [preferences, t]
  );

  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar>
            <EnvelopeSimpleIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.notifications.email.subheader')}
        title={t('dashboard.settings.notifications.email.title')}
      />
      <CardContent>
        {loading ? (
          <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={3}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {preferences.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.settings.notifications.email.empty')}
              </Typography>
            ) : (
              <Stack divider={<Divider />} spacing={3}>
                {preferences.map((preference) => {
                  const title = getPreferenceTitle(preference.key, t);

                  return (
                    <Stack
                      direction={{ sm: 'row', xs: 'column' }}
                      key={`${preference.channel}-${preference.key}`}
                      spacing={2}
                      sx={{ alignItems: { sm: 'center', xs: 'flex-start' }, justifyContent: 'space-between' }}
                    >
                      <Stack spacing={1}>
                        <Typography variant="subtitle1">{title}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {getPreferenceDescription(preference.key, t)}
                        </Typography>
                      </Stack>
                      <Switch
                        checked={preference.enabled}
                        disabled={savingKey === preference.key}
                        inputProps={{ 'aria-label': title }}
                        onChange={(event) => {
                          void handlePreferenceChange(preference.key, event.target.checked);
                        }}
                      />
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function getPreferenceTitle(key: string, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`dashboard.settings.notifications.email.preferences.${key}.title`, {
    defaultValue: toTitle(key),
  });
}

function getPreferenceDescription(key: string, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`dashboard.settings.notifications.email.preferences.${key}.description`, {
    defaultValue: '',
  });
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function toTitle(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

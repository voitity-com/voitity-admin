'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import type { ProfileAppearanceConfiguration } from '@/lib/profile-appearance/api-client';
import { getProfileAppearance, updateProfileAppearance } from '@/lib/profile-appearance/api-client';
import { toast } from '@/components/core/toaster';
import { TemplateMobileThumbnail } from '@/components/dashboard/profiles/profile-template-editor';

interface ProfileTemplatePickerDialogProps {
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
  profileId: number | string;
  profileName: string;
}

export function ProfileTemplatePickerDialog({
  onClose,
  onSaved,
  open,
  profileId,
  profileName,
}: ProfileTemplatePickerDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [configuration, setConfiguration] = React.useState<null | ProfileAppearanceConfiguration>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [savingTemplateKey, setSavingTemplateKey] = React.useState<null | string>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    getProfileAppearance(profileId)
      .then((nextConfiguration) => {
        if (isMounted) {
          setConfiguration(nextConfiguration);
        }
      })
      .catch((loadError) => {
        logger.error(loadError);

        if (isMounted) {
          setConfiguration(null);
          setError(t('dashboard.profiles.detail.widgetLauncher.templateEditor.errors.load'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, profileId, t]);

  const handleSelect = React.useCallback(
    async (templateKey: string): Promise<void> => {
      if (!configuration || savingTemplateKey) {
        return;
      }

      setSavingTemplateKey(templateKey);
      setError('');

      try {
        await updateProfileAppearance(profileId, {
          backgroundType: configuration.appearance.backgroundType,
          templateKey,
        });
        toast.success(t('dashboard.profiles.detail.widgetLauncher.templateEditor.toasts.saved'));
        onSaved();
        onClose();
      } catch (saveError) {
        logger.error(saveError);
        const message = t('dashboard.profiles.detail.widgetLauncher.templateEditor.errors.save');
        setError(message);
        toast.error(message);
      } finally {
        setSavingTemplateKey(null);
      }
    },
    [configuration, onClose, onSaved, profileId, savingTemplateKey, t]
  );

  return (
    <Dialog
      fullWidth
      maxWidth="md"
      onClose={() => {
        if (!savingTemplateKey) {
          onClose();
        }
      }}
      open={open}
    >
      <DialogTitle>
        {t('dashboard.profiles.detail.widgetLauncher.templateEditor.tabs.templates')}
      </DialogTitle>
      <DialogContent dividers>
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          {t('dashboard.profiles.detail.widgetLauncher.templateEditor.templates.description')}
        </Typography>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {isLoading ? (
          <Stack sx={{ alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { md: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', xs: '1fr' },
            }}
          >
            {configuration?.templates.map((template) => {
              const selected = template.key === configuration.appearance.templateKey;
              const saving = savingTemplateKey === template.key;

              return (
                <Paper
                  aria-busy={saving}
                  key={template.key}
                  onClick={() => {
                    void handleSelect(template.key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void handleSelect(template.key);
                    }
                  }}
                  role="button"
                  sx={{
                    border: '2px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    cursor: savingTemplateKey ? 'default' : 'pointer',
                    opacity: savingTemplateKey && !saving ? 0.55 : 1,
                    overflow: 'hidden',
                    p: 1.5,
                    position: 'relative',
                    transition: 'border-color 120ms ease, opacity 120ms ease',
                    '&:hover': { borderColor: savingTemplateKey ? undefined : 'primary.main' },
                    '&:focus-visible': { outline: '3px solid var(--mui-palette-primary-main)', outlineOffset: 2 },
                  }}
                  tabIndex={savingTemplateKey ? -1 : 0}
                  variant="outlined"
                >
                  <TemplateMobileThumbnail
                    avatarUrl={null}
                    backgroundColor={template.backgroundColor}
                    profileName={profileName}
                    templateKey={template.key}
                  />
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1.5 }}>
                    <Typography sx={{ fontWeight: 700 }}>{template.label}</Typography>
                    {saving ? <CircularProgress size={20} /> : null}
                    {!saving && selected ? (
                      <CheckCircleIcon color="var(--mui-palette-primary-main)" weight="fill" />
                    ) : null}
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

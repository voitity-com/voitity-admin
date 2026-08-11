import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { ClipboardText as ClipboardTextIcon } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { Code as CodeIcon } from '@phosphor-icons/react/dist/ssr/Code';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Info as InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import type { ProfileWidgetSettings } from '@/lib/profile-widget/api-client';
import { getProfileWidget, updateProfileWidget } from '@/lib/profile-widget/api-client';
import { toast } from '@/components/core/toaster';

export function ProfileWidgetSettingsPanel({ profileId }: { profileId: string }): React.JSX.Element {
  const { t } = useTranslation();
  const [widget, setWidget] = React.useState<null | ProfileWidgetSettings>(null);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const loadWidget = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setWidget(await getProfileWidget(profileId));
    } catch (loadError) {
      logger.error(loadError);
      setError(t('dashboard.profiles.detail.settings.widget.errors.load'));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

  React.useEffect(() => {
    loadWidget().catch((loadError) => {
      logger.error(loadError);
    });
  }, [loadWidget]);

  const handleEnabledChange = React.useCallback(
    async (enabled: boolean): Promise<void> => {
      setIsSaving(true);
      setError('');

      try {
        const nextWidget = await updateProfileWidget(profileId, enabled);
        setWidget(nextWidget);
        toast.success(
          t(
            enabled
              ? 'dashboard.profiles.detail.settings.widget.toasts.enabled'
              : 'dashboard.profiles.detail.settings.widget.toasts.disabled'
          )
        );
      } catch (saveError) {
        logger.error(saveError);
        setError(t('dashboard.profiles.detail.settings.widget.errors.save'));
      } finally {
        setIsSaving(false);
      }
    },
    [profileId, t]
  );

  const embedCode = widget ? buildEmbedCode(widget.publicKey) : '';
  const previewDocument = widget ? buildPreviewDocument(widget.publicKey) : '';

  const handleCopy = React.useCallback(async (): Promise<void> => {
    if (!embedCode) {
      return;
    }

    try {
      await copyText(embedCode);
      toast.success(t('dashboard.profiles.detail.settings.widget.toasts.copied'));
    } catch (copyError) {
      logger.error(copyError);
      toast.error(t('dashboard.profiles.detail.settings.widget.errors.copy'));
    }
  }, [embedCode, t]);

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', p: 5 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!widget) {
    return <Alert color="error">{error || t('dashboard.profiles.detail.settings.widget.errors.load')}</Alert>;
  }

  const status = widget.available ? 'available' : widget.enabled ? 'profileUnavailable' : 'disabled';

  return (
    <Stack spacing={3}>
      {error ? <Alert color="error">{error}</Alert> : null}

      <Card>
        <CardHeader
          action={
            <Chip
              color={widget.available ? 'success' : widget.enabled ? 'warning' : 'default'}
              label={t(`dashboard.profiles.detail.settings.widget.status.${status}`)}
              size="small"
              variant="soft"
            />
          }
          subheader={t('dashboard.profiles.detail.settings.widget.description')}
          title={t('dashboard.profiles.detail.settings.widget.title')}
        />
        <Divider />
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={widget.enabled}
                disabled={isSaving}
                onChange={(_, checked) => {
                  handleEnabledChange(checked).catch((saveError) => {
                    logger.error(saveError);
                  });
                }}
              />
            }
            label={t('dashboard.profiles.detail.settings.widget.enableLabel')}
          />
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
            {t('dashboard.profiles.detail.settings.widget.enableHelp')}
          </Typography>
        </CardContent>
      </Card>

      {!widget.profileActive || widget.profileStatus !== 'published' ? (
        <Alert color="warning">{t('dashboard.profiles.detail.settings.widget.profileUnavailable')}</Alert>
      ) : null}

      <Card>
        <CardHeader
          avatar={<CodeIcon fontSize="var(--icon-fontSize-lg)" />}
          subheader={t('dashboard.profiles.detail.settings.widget.install.description')}
          title={t('dashboard.profiles.detail.settings.widget.install.title')}
        />
        <Divider />
        <CardContent>
          <Stack spacing={2.5}>
            <List disablePadding>
              {(['copy', 'paste', 'verify'] as const).map((step, index) => (
                <ListItem disableGutters key={step}>
                  <ListItemIcon sx={{ minWidth: 38 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', height: 28, width: 28 }}>{index + 1}</Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={t(`dashboard.profiles.detail.settings.widget.install.steps.${step}.title`)}
                    secondary={t(`dashboard.profiles.detail.settings.widget.install.steps.${step}.description`)}
                  />
                </ListItem>
              ))}
            </List>

            <Box
              component="pre"
              sx={{
                bgcolor: 'neutral.950',
                borderRadius: 1,
                color: 'neutral.50',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                m: 0,
                overflowX: 'auto',
                p: 2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {embedCode}
            </Box>
          </Stack>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3 }}>
          <Button onClick={handleCopy} startIcon={<ClipboardTextIcon />} variant="contained">
            {t('dashboard.profiles.detail.settings.widget.actions.copy')}
          </Button>
        </CardActions>
      </Card>

      <Card>
        <CardHeader
          avatar={<InfoIcon fontSize="var(--icon-fontSize-lg)" />}
          subheader={t('dashboard.profiles.detail.settings.widget.restrictions.description')}
          title={t('dashboard.profiles.detail.settings.widget.restrictions.title')}
        />
        <Divider />
        <CardContent>
          <List disablePadding>
            {(['publication', 'csp', 'microphone', 'builders', 'javascript'] as const).map((restriction) => (
              <ListItem alignItems="flex-start" disableGutters key={restriction}>
                <ListItemIcon sx={{ minWidth: 34, pt: 0.5 }}>
                  <CheckCircleIcon color="var(--mui-palette-primary-main)" />
                </ListItemIcon>
                <ListItemText
                  primary={t(`dashboard.profiles.detail.settings.widget.restrictions.items.${restriction}.title`)}
                  secondary={t(`dashboard.profiles.detail.settings.widget.restrictions.items.${restriction}.description`)}
                />
              </ListItem>
            ))}
          </List>
          <Alert color="info" sx={{ mt: 2 }}>
            {t('dashboard.profiles.detail.settings.widget.restrictions.cspExample')}
          </Alert>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3 }}>
          <Button
            disabled={!widget.available}
            onClick={() => {
              setPreviewOpen(true);
            }}
            startIcon={<EyeIcon />}
            variant="outlined"
          >
            {t('dashboard.profiles.detail.settings.widget.actions.preview')}
          </Button>
        </CardActions>
      </Card>

      <Dialog
        PaperProps={{
          sx: {
            bgcolor: 'neutral.900',
            height: 'min(820px, calc(100dvh - 32px))',
            maxHeight: 'calc(100dvh - 32px)',
            overflow: 'hidden',
          },
        }}
        fullWidth
        maxWidth="lg"
        onClose={() => {
          setPreviewOpen(false);
        }}
        open={previewOpen}
      >
        <DialogTitle sx={{ color: 'common.white', py: 1.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{t('dashboard.profiles.detail.settings.widget.preview.title')}</Typography>
            <IconButton
              aria-label={t('dashboard.profiles.detail.settings.widget.preview.close')}
              onClick={() => {
                setPreviewOpen(false);
              }}
              sx={{ color: 'common.white' }}
            >
              <XIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'neutral.900', minHeight: 0, overflow: 'hidden', p: { sm: 2, xs: 0 } }}>
          <Box
            allow="microphone"
            component="iframe"
            sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            srcDoc={previewDocument}
            sx={{
              bgcolor: 'neutral.800',
              border: '1px solid',
              borderColor: 'neutral.700',
              borderRadius: { sm: 2, xs: 0 },
              display: 'block',
              height: '100%',
              width: '100%',
            }}
            title={String(t('dashboard.profiles.detail.settings.widget.preview.iframeTitle'))}
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function buildEmbedCode(publicKey: string): string {
  const webBaseUrl = (config.publicProfile?.baseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  const apiBaseUrl = (config.api?.baseUrl || 'http://localhost:8000').replace(/\/+$/, '');

  return `<script\n  async\n  src="${webBaseUrl}/widget/v1.js"\n  data-bigmelo-widget="${publicKey}"\n  data-bigmelo-api="${apiBaseUrl}"\n></script>`;
}

function buildPreviewDocument(publicKey: string): string {
  const webBaseUrl = (config.publicProfile?.baseUrl || 'http://localhost:3001').replace(/\/+$/, '');
  const apiBaseUrl = (config.api?.baseUrl || 'http://localhost:8000').replace(/\/+$/, '');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { box-sizing: border-box; }
      html, body { height: 100%; margin: 0; }
      body {
        overflow: hidden;
        background:
          radial-gradient(circle at 18% 10%, rgba(83, 109, 254, 0.2), transparent 34%),
          linear-gradient(145deg, #202632, #303947);
        color: rgba(255, 255, 255, 0.82);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .site-preview { min-height: 100%; padding: clamp(24px, 5vw, 64px); }
      .site-header { display: flex; align-items: center; justify-content: space-between; }
      .site-logo { width: 132px; height: 18px; border-radius: 999px; background: rgba(255, 255, 255, 0.2); }
      .site-nav { display: flex; gap: 12px; }
      .site-nav span { width: 58px; height: 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); }
      .site-content { width: min(600px, 70%); margin-top: clamp(70px, 12vh, 130px); }
      .site-title { width: 88%; height: 34px; border-radius: 8px; background: rgba(255, 255, 255, 0.16); }
      .site-copy { width: 100%; height: 12px; margin-top: 22px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); }
      .site-copy.short { width: 68%; margin-top: 12px; }
      .site-card { width: min(760px, 74%); height: 150px; margin-top: 50px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; background: rgba(255, 255, 255, 0.04); }
      @media (max-width: 620px) {
        .site-preview { padding: 24px; }
        .site-nav { display: none; }
        .site-content, .site-card { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main class="site-preview" aria-hidden="true">
      <header class="site-header"><span class="site-logo"></span><span class="site-nav"><span></span><span></span><span></span></span></header>
      <section class="site-content"><div class="site-title"></div><div class="site-copy"></div><div class="site-copy short"></div></section>
      <div class="site-card"></div>
    </main>
    <script async src="${escapeHtmlAttribute(webBaseUrl)}/widget/v1.js" data-bigmelo-widget="${escapeHtmlAttribute(publicKey)}" data-bigmelo-api="${escapeHtmlAttribute(apiBaseUrl)}"></script>
  </body>
</html>`;
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Clipboard is unavailable');
  }
}

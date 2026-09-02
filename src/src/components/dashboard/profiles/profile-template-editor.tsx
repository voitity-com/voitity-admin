'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { CloudArrowUp as CloudArrowUpIcon } from '@phosphor-icons/react/dist/ssr/CloudArrowUp';
import { Desktop as DesktopIcon } from '@phosphor-icons/react/dist/ssr/Desktop';
import { DeviceMobile as DeviceMobileIcon } from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { Palette as PaletteIcon } from '@phosphor-icons/react/dist/ssr/Palette';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import type { FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import type { ProfileAppearanceConfiguration } from '@/lib/profile-appearance/api-client';
import {
  getProfileAppearance,
  ProfileAppearanceApiError,
  updateProfileAppearance,
  uploadProfileBackgroundImage,
} from '@/lib/profile-appearance/api-client';
import { toast } from '@/components/core/toaster';

interface ProfileTemplateEditorProps {
  profileAvatarUrl: null | string;
  previewUrl: string;
  profileId: string;
  profileName: string;
}

interface AppearanceDraft {
  backgroundType: 'css' | 'image';
  templateKey: string;
}

const MAX_BACKGROUND_IMAGE_SIZE = 10 * 1024 * 1024;

export function ProfileTemplateEditor({
  profileAvatarUrl,
  previewUrl,
  profileId,
  profileName,
}: ProfileTemplateEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const desktopIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const mobileIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [activeTab, setActiveTab] = React.useState<'background' | 'templates'>('templates');
  const [configuration, setConfiguration] = React.useState<null | ProfileAppearanceConfiguration>(null);
  const [draft, setDraft] = React.useState<AppearanceDraft>({ backgroundType: 'css', templateKey: 'profile01' });
  const [error, setError] = React.useState('');
  const [iframeVersion, setIframeVersion] = React.useState(0);
  const [isDesktopPreviewOpen, setIsDesktopPreviewOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingReplacement, setPendingReplacement] = React.useState<null | File>(null);
  const [selectedFile, setSelectedFile] = React.useState<null | File>(null);
  const [selectedFilePreview, setSelectedFilePreview] = React.useState<null | string>(null);
  const editorPreviewUrl = React.useMemo(() => buildEditorPreviewUrl(previewUrl), [previewUrl]);
  const currentAppearance = configuration?.appearance;
  const previewBackgroundImageUrl = selectedFilePreview ?? currentAppearance?.backgroundImageUrl ?? null;
  const selectedTemplate = configuration?.templates.find((template) => template.key === draft.templateKey);
  const canSave =
    Boolean(configuration) &&
    !isLoading &&
    !isSaving &&
    (draft.backgroundType === 'css' || Boolean(previewBackgroundImageUrl));

  const loadConfiguration = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const nextConfiguration = await getProfileAppearance(profileId);
      setConfiguration(nextConfiguration);
      setDraft({
        backgroundType: nextConfiguration.appearance.backgroundType,
        templateKey: nextConfiguration.appearance.templateKey,
      });
      setSelectedFile(null);
      setSelectedFilePreview(null);
    } catch (loadError) {
      logger.error(loadError);
      setError(t('dashboard.profiles.detail.widgetLauncher.templateEditor.errors.load'));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

  React.useEffect(() => {
    setActiveTab('templates');
    setIsDesktopPreviewOpen(false);
    loadConfiguration().catch((loadError) => {
      logger.error(loadError);
    });
  }, [loadConfiguration]);

  React.useEffect(() => {
    for (const iframe of [mobileIframeRef.current, desktopIframeRef.current]) {
      iframe?.contentWindow?.postMessage(
        {
          appearance: {
            backgroundImageUrl: previewBackgroundImageUrl,
            backgroundType: draft.backgroundType,
            hasBackgroundImage: Boolean(previewBackgroundImageUrl),
            templateKey: draft.templateKey,
          },
          type: 'bigmelo:profile-appearance-preview',
        },
        new URL(editorPreviewUrl).origin
      );
    }
  }, [draft.backgroundType, draft.templateKey, editorPreviewUrl, iframeVersion, previewBackgroundImageUrl]);

  const acceptFile = React.useCallback(
    async (file: File): Promise<void> => {
      try {
        setError('');
        setSelectedFile(file);
        setSelectedFilePreview(await readFileAsDataUrl(file));
        setDraft((current) => ({ ...current, backgroundType: 'image' }));
      } catch (readError) {
        logger.error(readError);
        setError(t('dashboard.profiles.detail.widgetLauncher.templateEditor.errors.read'));
      }
    },
    [t]
  );

  const handleAcceptedFiles = React.useCallback(
    (files: File[]): void => {
      const file = files[0];

      if (!file) {
        return;
      }

      if (currentAppearance?.hasBackgroundImage) {
        setPendingReplacement(file);
        return;
      }

      acceptFile(file).catch((readError) => {
        logger.error(readError);
      });
    },
    [acceptFile, currentAppearance?.hasBackgroundImage]
  );

  const handleRejectedFiles = React.useCallback(
    (_rejections: FileRejection[]): void => {
      setError(t('dashboard.profiles.detail.widgetLauncher.templateEditor.errors.file'));
    },
    [t]
  );

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    disabled: isSaving,
    maxFiles: 1,
    maxSize: MAX_BACKGROUND_IMAGE_SIZE,
    multiple: false,
    onDropAccepted: handleAcceptedFiles,
    onDropRejected: handleRejectedFiles,
  });

  const handleSave = React.useCallback(async (): Promise<void> => {
    if (!configuration || !canSave) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const nextConfiguration = selectedFile
        ? await uploadProfileBackgroundImage(profileId, selectedFile, draft.templateKey)
        : await updateProfileAppearance(profileId, draft);

      setConfiguration(nextConfiguration);
      setDraft({
        backgroundType: nextConfiguration.appearance.backgroundType,
        templateKey: nextConfiguration.appearance.templateKey,
      });
      setSelectedFile(null);
      setSelectedFilePreview(null);
      toast.success(t('dashboard.profiles.detail.widgetLauncher.templateEditor.toasts.saved'));
    } catch (saveError) {
      logger.error(saveError);
      const message = t(profileAppearanceSaveErrorKey(saveError));
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [canSave, configuration, draft, profileId, selectedFile, t]);

  return (
    <React.Fragment>
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: { md: 'calc(100dvh - 128px)', xs: 'auto' },
          minHeight: { md: 680, xs: 0 },
          overflow: 'hidden',
        }}
        variant="outlined"
      >
        <AppBar color="inherit" elevation={0} position="static">
          <Toolbar sx={{ gap: { sm: 2, xs: 1 }, px: { sm: 3, xs: 1.5 } }}>
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: { sm: '1.125rem', xs: '1rem' } }} variant="h6">
                {t('dashboard.profiles.detail.widgetLauncher.templateEditor.title')}
              </Typography>
              <Typography color="text.secondary" noWrap variant="body2">
                {profileName}
              </Typography>
            </Box>
            <Button
              disabled={!canSave}
              onClick={handleSave}
              size="small"
              sx={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
              variant="contained"
            >
              {isSaving
                ? t('dashboard.profiles.detail.widgetLauncher.templateEditor.actions.saving')
                : t('dashboard.profiles.detail.widgetLauncher.templateEditor.actions.save')}
            </Button>
          </Toolbar>
        </AppBar>
        <Divider />

        <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: { md: 'row', xs: 'column' }, minHeight: 0 }}>
          <Stack
            spacing={1.5}
            sx={{ bgcolor: 'grey.100', flex: '1 1 auto', minHeight: { md: 0, xs: '50dvh' }, overflow: 'hidden', p: 2 }}
          >
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
              <Button
                onClick={() => {
                  setIsDesktopPreviewOpen(true);
                }}
                size="small"
                startIcon={<DesktopIcon />}
                variant="outlined"
              >
                {t('dashboard.profiles.detail.widgetLauncher.templateEditor.preview.desktop')}
              </Button>
              <Button
                size="small"
                startIcon={<DeviceMobileIcon />}
                variant="contained"
              >
                {t('dashboard.profiles.detail.widgetLauncher.templateEditor.preview.mobile')}
              </Button>
            </Stack>
            <Box sx={{ display: 'flex', flex: '1 1 auto', justifyContent: 'center', minHeight: 0, overflow: 'auto' }}>
              <Paper
                elevation={8}
                sx={{
                  height: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  width: 390,
                }}
              >
                <Box
                  allow="microphone"
                  component="iframe"
                  onLoad={() => {
                    setIframeVersion((current) => current + 1);
                  }}
                  ref={mobileIframeRef}
                  sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  src={editorPreviewUrl}
                  sx={{ border: 0, display: 'block', height: '100%', width: '100%' }}
                  title={String(t('dashboard.profiles.detail.widgetLauncher.templateEditor.preview.iframeTitle'))}
                />
              </Paper>
            </Box>
          </Stack>

          <Paper
            elevation={0}
            square
            sx={{
              borderLeft: { md: '1px solid', xs: 0 },
              borderTop: { md: 0, xs: '1px solid' },
              borderColor: 'divider',
              display: 'flex',
              flex: { md: '0 0 390px', xs: '0 0 auto' },
              flexDirection: 'column',
              maxHeight: { md: 'none', xs: '46dvh' },
              minHeight: 0,
              width: { md: 390, xs: '100%' },
            }}
          >
            <Tabs
              aria-label={t('dashboard.profiles.detail.widgetLauncher.templateEditor.tabs.label')}
              onChange={(_event, value: 'background' | 'templates') => {
                setActiveTab(value);
              }}
              value={activeTab}
              variant="fullWidth"
            >
              <Tab
                icon={<PaletteIcon />}
                iconPosition="start"
                label={t('dashboard.profiles.detail.widgetLauncher.templateEditor.tabs.templates')}
                value="templates"
              />
              <Tab
                icon={<ImageIcon />}
                iconPosition="start"
                label={t('dashboard.profiles.detail.widgetLauncher.templateEditor.tabs.background')}
                value="background"
              />
            </Tabs>
            <Divider />

            <Box sx={{ flex: '1 1 auto', overflowY: 'auto', p: 2.5 }}>
              {isLoading ? (
                <Stack sx={{ alignItems: 'center', py: 8 }}>
                  <CircularProgress />
                </Stack>
              ) : (
                <Stack spacing={2.5}>
                  {error ? <Alert severity="error">{error}</Alert> : null}

                  {activeTab === 'templates' ? (
                    <Stack spacing={1.5}>
                      <Typography variant="h6">
                        {t('dashboard.profiles.detail.widgetLauncher.templateEditor.templates.title')}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {t('dashboard.profiles.detail.widgetLauncher.templateEditor.templates.description')}
                      </Typography>
                      {configuration?.templates.map((template) => {
                        const selected = template.key === draft.templateKey;

                        return (
                          <Paper
                            key={template.key}
                            onClick={() => {
                              setDraft((current) => ({ ...current, templateKey: template.key }));
                            }}
                            role="button"
                            sx={{
                              border: '2px solid',
                              borderColor: selected ? 'primary.main' : 'divider',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              p: 1.5,
                            }}
                            tabIndex={0}
                            variant="outlined"
                          >
                            <TemplateMobileThumbnail
                              avatarUrl={profileAvatarUrl}
                              backgroundColor={template.backgroundColor}
                              profileName={profileName}
                              templateKey={template.key}
                            />
                            <Stack
                              direction="row"
                              sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1.5 }}
                            >
                              <Typography sx={{ fontWeight: 700 }}>{template.label}</Typography>
                              {selected ? (
                                <CheckCircleIcon color="var(--mui-palette-primary-main)" weight="fill" />
                              ) : null}
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Stack spacing={2}>
                      <Stack spacing={0.5}>
                        <Typography variant="h6">
                          {t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.title')}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.description')}
                        </Typography>
                      </Stack>

                      <Paper
                        sx={{ borderColor: draft.backgroundType === 'css' ? 'primary.main' : 'divider', px: 1.5 }}
                        variant="outlined"
                      >
                        <FormControlLabel
                          control={<Radio checked={draft.backgroundType === 'css'} />}
                          label={
                            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                              <Box
                                sx={{
                                  bgcolor: selectedTemplate?.backgroundColor ?? '#ffffff',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: '50%',
                                  height: 28,
                                  width: 28,
                                }}
                              />
                              <Box>
                                <Typography sx={{ fontWeight: 700 }} variant="body2">
                                  {t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.css')}
                                </Typography>
                                <Typography color="text.secondary" variant="caption">
                                  {selectedTemplate?.backgroundColor ?? '#ffffff'}
                                </Typography>
                              </Box>
                            </Stack>
                          }
                          onChange={() => {
                            setDraft((current) => ({ ...current, backgroundType: 'css' }));
                          }}
                          sx={{ minHeight: 66, width: '100%' }}
                        />
                      </Paper>

                      <Paper
                        sx={{ borderColor: draft.backgroundType === 'image' ? 'primary.main' : 'divider', px: 1.5 }}
                        variant="outlined"
                      >
                        <FormControlLabel
                          control={<Radio checked={draft.backgroundType === 'image'} />}
                          label={
                            <Box>
                              <Typography sx={{ fontWeight: 700 }} variant="body2">
                                {t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.image')}
                              </Typography>
                              <Typography color="text.secondary" variant="caption">
                                {t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.imageHelp')}
                              </Typography>
                            </Box>
                          }
                          onChange={() => {
                            setDraft((current) => ({ ...current, backgroundType: 'image' }));
                          }}
                          sx={{ minHeight: 66, width: '100%' }}
                        />
                      </Paper>

                      {draft.backgroundType === 'image' ? (
                        <Stack spacing={1.5}>
                          {previewBackgroundImageUrl ? (
                            <Box
                              alt={String(
                                t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.previewAlt')
                              )}
                              component="img"
                              src={previewBackgroundImageUrl}
                              sx={{ aspectRatio: '16 / 10', borderRadius: 1.5, objectFit: 'cover', width: '100%' }}
                            />
                          ) : null}
                          <Paper
                            {...getRootProps()}
                            sx={{
                              alignItems: 'center',
                              bgcolor: isDragActive ? 'action.selected' : 'background.level1',
                              border: '1px dashed',
                              borderColor: isDragActive ? 'primary.main' : 'divider',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'center',
                              minHeight: 150,
                              p: 2.5,
                              textAlign: 'center',
                            }}
                            variant="outlined"
                          >
                            <input {...getInputProps()} />
                            <Stack spacing={1} sx={{ alignItems: 'center' }}>
                              <CloudArrowUpIcon fontSize="var(--icon-fontSize-xl)" />
                              <Typography sx={{ fontWeight: 700 }} variant="body2">
                                {previewBackgroundImageUrl
                                  ? t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.replace')
                                  : t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.upload')}
                              </Typography>
                              <Typography color="text.secondary" variant="caption">
                                {t('dashboard.profiles.detail.widgetLauncher.templateEditor.background.formats')}
                              </Typography>
                            </Stack>
                          </Paper>
                        </Stack>
                      ) : null}
                    </Stack>
                  )}
                </Stack>
              )}
            </Box>
          </Paper>
        </Box>
      </Paper>

      <Dialog
        fullScreen
        onClose={() => {
          setIsDesktopPreviewOpen(false);
        }}
        open={isDesktopPreviewOpen}
      >
        <Stack sx={{ height: '100dvh', minHeight: 0 }}>
          <AppBar color="inherit" elevation={0} position="static">
            <Toolbar sx={{ gap: 2 }}>
              <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                <Typography noWrap variant="h6">
                  {t('dashboard.profiles.detail.widgetLauncher.templateEditor.preview.desktop')}
                </Typography>
                <Typography color="text.secondary" noWrap variant="body2">
                  {profileName}
                </Typography>
              </Box>
              <IconButton
                aria-label={t('dashboard.profiles.detail.widgetLauncher.templateEditor.actions.close')}
                edge="end"
                onClick={() => {
                  setIsDesktopPreviewOpen(false);
                }}
              >
                <XIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
          <Divider />
          <Box sx={{ bgcolor: 'grey.100', flex: '1 1 auto', minHeight: 0, p: { sm: 2, xs: 0 } }}>
            <Paper elevation={8} sx={{ height: '100%', overflow: 'hidden' }}>
              <Box
                allow="microphone"
                component="iframe"
                onLoad={() => {
                  setIframeVersion((current) => current + 1);
                }}
                ref={desktopIframeRef}
                sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                src={editorPreviewUrl}
                sx={{ border: 0, display: 'block', height: '100%', width: '100%' }}
                title={String(t('dashboard.profiles.detail.widgetLauncher.templateEditor.preview.iframeTitle'))}
              />
            </Paper>
          </Box>
        </Stack>
      </Dialog>

      <Dialog
        onClose={() => {
          setPendingReplacement(null);
        }}
        open={Boolean(pendingReplacement)}
      >
        <DialogTitle>{t('dashboard.profiles.detail.widgetLauncher.templateEditor.replaceConfirm.title')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t('dashboard.profiles.detail.widgetLauncher.templateEditor.replaceConfirm.description')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPendingReplacement(null);
            }}
          >
            {t('dashboard.profiles.detail.widgetLauncher.templateEditor.replaceConfirm.cancel')}
          </Button>
          <Button
            color="error"
            onClick={() => {
              const replacement = pendingReplacement;
              setPendingReplacement(null);

              if (replacement) {
                acceptFile(replacement).catch((readError) => {
                  logger.error(readError);
                });
              }
            }}
            variant="contained"
          >
            {t('dashboard.profiles.detail.widgetLauncher.templateEditor.replaceConfirm.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function profileAppearanceSaveErrorKey(error: unknown): string {
  const prefix = 'dashboard.profiles.detail.widgetLauncher.templateEditor.errors';

  if (!(error instanceof ProfileAppearanceApiError)) {
    return `${prefix}.network`;
  }

  if (error.status === 403) {
    return `${prefix}.blocked`;
  }

  if (error.status === 413) {
    return `${prefix}.tooLarge`;
  }

  if (error.status === 422) {
    return `${prefix}.invalid`;
  }

  if (error.status >= 500) {
    return `${prefix}.server`;
  }

  return `${prefix}.save`;
}

function TemplateMobileThumbnail({
  avatarUrl,
  backgroundColor,
  profileName,
  templateKey,
}: {
  avatarUrl: null | string;
  backgroundColor: string;
  profileName: string;
  templateKey: string;
}): React.JSX.Element {
  const isDark = templateKey === 'profile02';
  const isBlue = templateKey === 'profile03';
  const isNeon = templateKey === 'profile04';
  const isPop = templateKey === 'profile05';
  const pageColor = isPop ? '#ffd864' : isDark ? '#050505' : isNeon ? '#050712' : isBlue ? '#f8fdff' : '#ffffff';
  const textColor = isPop ? '#16120f' : isDark ? '#fafafa' : isNeon ? '#f4f7ff' : isBlue ? '#152f3f' : '#111111';
  const mutedColor = isPop ? '#51463c' : isDark ? '#a8a8a8' : isNeon ? '#aab5cc' : isBlue ? '#607786' : '#737373';
  const surfaceColor = isPop ? '#fffdf3' : isDark ? '#121212' : isNeon ? '#0f152a' : '#ffffff';
  const borderColor = isDark
    ? '#2c2c2c'
    : isPop
      ? '#16120f'
      : isNeon
        ? 'rgba(101, 244, 210, 0.34)'
        : isBlue
          ? 'rgba(0, 175, 240, 0.28)'
          : '#e4e4e7';
  const lineColor = isPop ? '#6b625a' : isDark ? '#52525b' : isNeon ? '#71809d' : isBlue ? '#8fc6d8' : '#d4d4d8';
  const accentBackground = isDark
    ? 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 48%, #6228d7 100%)'
    : isPop
      ? '#ff3f68'
      : isNeon
        ? 'linear-gradient(135deg, #65f4d2 0%, #65f4d2 44%, #6f4bff 100%)'
        : isBlue
          ? 'linear-gradient(145deg, #8ee4ff 0%, #00aff0 52%, #0076a8 100%)'
          : '#111111';

  return (
    <Box
      sx={{
        alignItems: 'center',
        background: isDark
          ? `radial-gradient(circle at 82% 10%, rgba(98, 40, 215, 0.28), transparent 32%), radial-gradient(circle at 15% 92%, rgba(238, 42, 123, 0.2), transparent 36%), ${backgroundColor}`
          : isPop
            ? `radial-gradient(circle at 12% 22%, #ff8b73 0 12%, transparent 12.5%), radial-gradient(circle at 88% 18%, #7ad8ca 0 14%, transparent 14.5%), linear-gradient(140deg, ${backgroundColor} 0%, #ffc95f 44%, #ff9d8a 100%)`
            : isNeon
              ? `radial-gradient(circle at 18% 18%, rgba(119, 67, 255, 0.34), transparent 34%), radial-gradient(circle at 84% 26%, rgba(50, 238, 210, 0.24), transparent 36%), ${backgroundColor}`
              : isBlue
                ? `radial-gradient(circle at 12% 16%, rgba(0, 175, 240, 0.2), transparent 32%), radial-gradient(circle at 90% 76%, rgba(84, 208, 255, 0.24), transparent 36%), ${backgroundColor}`
                : `radial-gradient(circle at 20% 15%, rgba(17, 24, 39, 0.06), transparent 32%), ${backgroundColor}`,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        display: 'flex',
        height: 210,
        justifyContent: 'center',
        overflow: 'hidden',
        py: 1.25,
      }}
    >
      <Box
        sx={{
          bgcolor: pageColor,
          border: '4px solid',
          borderColor: isPop ? '#16120f' : isDark ? '#3f3f46' : isNeon ? '#263453' : isBlue ? '#d9f5ff' : '#18181b',
          borderRadius: '18px',
          boxShadow: isDark
            ? '0 12px 32px rgba(0, 0, 0, 0.52)'
            : isPop
              ? '6px 6px 0 #16120f'
              : isNeon
                ? '0 12px 34px rgba(101, 244, 210, 0.18)'
                : isBlue
                  ? '0 12px 30px rgba(22, 130, 174, 0.22)'
                  : '0 12px 28px rgba(15, 23, 42, 0.18)',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          width: 104,
        }}
      >
        <Stack spacing={0.5} sx={{ alignItems: 'center', px: 1, pt: 1.25 }}>
          <Typography noWrap sx={{ color: textColor, fontSize: 8, fontWeight: 800, lineHeight: 1, maxWidth: '100%' }}>
            {profileName}
          </Typography>
          <Typography sx={{ color: mutedColor, fontSize: 5.5, lineHeight: 1 }}>@perfil</Typography>
          <Box
            sx={{
              alignItems: 'center',
              background: isDark || isBlue || isNeon || isPop ? accentBackground : '#111111',
              borderRadius: '50%',
              boxShadow: isDark
                ? '0 4px 14px rgba(225, 48, 108, 0.28)'
                : isPop
                  ? '3px 3px 0 #16120f'
                  : isNeon
                    ? '0 4px 16px rgba(101, 244, 210, 0.28)'
                    : isBlue
                      ? '0 4px 14px rgba(0, 175, 240, 0.28)'
                      : '0 4px 12px rgba(15, 23, 42, 0.16)',
              display: 'flex',
              height: 42,
              p: '2px',
              width: 42,
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: isDark ? '#18181b' : isNeon ? '#0c1223' : isPop ? '#fffdf3' : isBlue ? '#ffffff' : '#f4f4f5',
                borderRadius: '50%',
                color: textColor,
                display: 'flex',
                fontSize: 10,
                fontWeight: 800,
                height: '100%',
                justifyContent: 'center',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              {avatarUrl ? (
                <Box
                  alt=""
                  component="img"
                  src={avatarUrl}
                  sx={{ height: '100%', objectFit: 'cover', width: '100%' }}
                />
              ) : (
                profileName.charAt(0).toUpperCase()
              )}
            </Box>
          </Box>
        </Stack>

        <Box
          sx={{
            bgcolor: surfaceColor,
            border: '1px solid',
            borderColor,
            borderRadius: '8px 8px 8px 3px',
            boxShadow: isDark
              ? '0 4px 12px rgba(0, 0, 0, 0.34)'
              : isPop
                ? '3px 3px 0 #16120f'
                : isNeon
                  ? '0 4px 14px rgba(101, 244, 210, 0.12)'
                  : isBlue
                    ? '0 4px 12px rgba(22, 130, 174, 0.14)'
                    : '0 4px 10px rgba(15, 23, 42, 0.08)',
            left: 8,
            p: 0.75,
            position: 'absolute',
            right: 12,
            top: 82,
          }}
        >
          <Stack spacing={0.35}>
            <Box sx={{ bgcolor: lineColor, borderRadius: 4, height: 3, width: '92%' }} />
            <Box sx={{ bgcolor: lineColor, borderRadius: 4, height: 3, width: '75%' }} />
            <Box sx={{ bgcolor: borderColor, borderRadius: 4, height: 2.5, mt: 0.25, width: '28%' }} />
          </Stack>
        </Box>

        <Box
          sx={{
            alignItems: 'center',
            bgcolor: surfaceColor,
            border: '1px solid',
            borderColor,
            borderRadius: 10,
            bottom: 9,
            boxShadow: isDark
              ? '0 4px 12px rgba(0, 0, 0, 0.36)'
              : isPop
                ? '3px 3px 0 #16120f'
                : isNeon
                  ? '0 4px 14px rgba(101, 244, 210, 0.13)'
                  : isBlue
                    ? '0 4px 12px rgba(22, 130, 174, 0.15)'
                    : '0 4px 12px rgba(15, 23, 42, 0.1)',
            display: 'flex',
            height: 18,
            left: 7,
            px: 0.75,
            position: 'absolute',
            right: 7,
          }}
        >
          <Box sx={{ bgcolor: lineColor, borderRadius: 4, height: 3, width: '62%' }} />
          <Box sx={{ background: accentBackground, borderRadius: '50%', height: 10, ml: 'auto', width: 10 }} />
        </Box>
      </Box>
    </Box>
  );
}

function buildEditorPreviewUrl(previewUrl: string): string {
  const url = new URL(previewUrl);
  url.searchParams.set('appearanceEditor', '1');
  return url.toString();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error('Unable to read image file'));
    };
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read image file'));
      }
    };
    reader.readAsDataURL(file);
  });
}

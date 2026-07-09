'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { ImagesSquare as ImagesSquareIcon } from '@phosphor-icons/react/dist/ssr/ImagesSquare';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { ProfileAvatar } from '@/lib/avatar/api-client';
import { activateProfileAvatar, generateAvatar, listProfileAvatarHistory } from '@/lib/avatar/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Avatar | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

const avatarSize = 400;
const emptyAvatarSrc = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f3f4f6"/>
  <circle cx="200" cy="156" r="58" fill="#d1d5db"/>
  <path d="M100 330c16-64 62-100 100-100s84 36 100 100" fill="#d1d5db"/>
</svg>
`)}`;

interface DragState {
  startX: number;
  startY: number;
  x: number;
  y: number;
}

type AvatarDialogTab = 'history' | 'upload';

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [avatar, setAvatar] = React.useState<null | ProfileAvatar>(null);
  const [avatars, setAvatars] = React.useState<ProfileAvatar[]>([]);
  const [processingAvatar, setProcessingAvatar] = React.useState<null | ProfileAvatar>(null);
  const [error, setError] = React.useState<string>('');
  const [fieldError, setFieldError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isActivating, setIsActivating] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
  const [dialogTab, setDialogTab] = React.useState<AvatarDialogTab>('history');
  const [previewUrl, setPreviewUrl] = React.useState<string>('');
  const [zoom, setZoom] = React.useState<number>(1);
  const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragState, setDragState] = React.useState<DragState | null>(null);
  const [status, setStatus] = React.useState<string>('');
  const [isPollingAvatar, setIsPollingAvatar] = React.useState<boolean>(false);

  const avatarFile = getAvatarFile(avatar);
  const avatarUrl = avatarFile ? resolveAssetUrl(avatarFile) : emptyAvatarSrc;
  const isVideo = avatarFile ? isVideoFile(avatarFile) : false;
  const isAvatarProcessing = Boolean(processingAvatar) || isPollingAvatar;
  const displayStatus = isAvatarProcessing ? 'processing' : status;
  const activeAvatarId = avatar?.status === 'active' ? String(avatar.id) : '';

  const loadAvatar = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const history = await listProfileAvatarHistory(profileId);
      const nextActiveAvatar = history.active_avatar ?? null;
      const nextProcessingAvatar = history.processing_avatar ?? null;

      setAvatars(history.avatars);
      setProcessingAvatar(nextProcessingAvatar);
      setAvatar(nextActiveAvatar ?? nextProcessingAvatar);
      setStatus(nextProcessingAvatar ? 'processing' : nextActiveAvatar?.status ?? '');
      setIsPollingAvatar(Boolean(nextProcessingAvatar));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

  React.useEffect(() => {
    loadAvatar().catch((err) => {
      logger.error(err);
    });
  }, [loadAvatar]);

  React.useEffect(() => {
    if (!isPollingAvatar) {
      return undefined;
    }

    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 48;

    const pollAvatar = async (): Promise<void> => {
      attempts += 1;

      try {
        const history = await listProfileAvatarHistory(profileId);

        if (isCancelled) {
          return;
        }

        const nextActiveAvatar = history.active_avatar ?? null;
        const nextProcessingAvatar = history.processing_avatar ?? null;

        setAvatars(history.avatars);
        setProcessingAvatar(nextProcessingAvatar);
        setAvatar(nextActiveAvatar ?? nextProcessingAvatar);

        if (!nextProcessingAvatar) {
          setStatus(nextActiveAvatar?.status ?? '');
          setIsPollingAvatar(false);
          return;
        }

        setStatus('processing');

        if (attempts >= maxAttempts) {
          setIsPollingAvatar(false);
        }
      } catch (err) {
        logger.error(err);

        if (!isCancelled) {
          setStatus('processing');
        }
      }
    };

    pollAvatar().catch((err) => {
      logger.error(err);
    });

    const intervalId = window.setInterval(() => {
      pollAvatar().catch((err) => {
        logger.error(err);
      });
    }, 10000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isPollingAvatar, profileId]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFieldError(t('dashboard.profiles.detail.avatar.errors.unsupportedFile'));
        return;
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(URL.createObjectURL(file));
      setFieldError('');
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      event.target.value = '';
    },
    [previewUrl, t]
  );

  const handleOpenDialog = React.useCallback((): void => {
    if (isAvatarProcessing) {
      return;
    }

    setDialogTab(avatars.length > 0 ? 'history' : 'upload');
    setDialogOpen(true);
    setFieldError('');
  }, [avatars.length, isAvatarProcessing]);

  const handleCloseDialog = React.useCallback((): void => {
    if (isSaving || isActivating) {
      return;
    }

    setDialogOpen(false);
    setFieldError('');
    setPosition({ x: 0, y: 0 });
    setZoom(1);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [isActivating, isSaving, previewUrl]);

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (!previewUrl) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({ startX: event.clientX, startY: event.clientY, x: position.x, y: position.y });
    },
    [position.x, position.y, previewUrl]
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (!dragState) {
        return;
      }

      setPosition({
        x: dragState.x + event.clientX - dragState.startX,
        y: dragState.y + event.clientY - dragState.startY,
      });
    },
    [dragState]
  );

  const handlePointerUp = React.useCallback((): void => {
    setDragState(null);
  }, []);

  const handleSave = React.useCallback(async (): Promise<void> => {
    if (!previewUrl) {
      setFieldError(t('dashboard.profiles.detail.avatar.errors.selectImage'));
      return;
    }

    setIsSaving(true);
    setFieldError('');

    try {
      const croppedFile = await createCroppedAvatarFile(
        previewUrl,
        position,
        zoom,
        t('dashboard.profiles.detail.avatar.errors.prepareImage')
      );
      const generated = await generateAvatar(profileId, croppedFile);
      const generatedAvatar = generated.avatar ?? null;

      if (generatedAvatar) {
        setProcessingAvatar(generatedAvatar);
        setAvatars((current) => upsertAvatar(current, generatedAvatar));
        setAvatar((current) => current ?? generatedAvatar);
      }

      setIsPollingAvatar(true);
      setStatus('processing');
      toast.success(t('dashboard.profiles.detail.avatar.toasts.generationStarted'));
      handleCloseDialog();
    } catch (err) {
      logger.error(err);
      const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
      setFieldError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [handleCloseDialog, position, previewUrl, profileId, t, zoom]);

  const handleActivateAvatar = React.useCallback(
    async (nextAvatar: ProfileAvatar): Promise<void> => {
      if (isAvatarProcessing || !isAvatarSelectable(nextAvatar)) {
        return;
      }

      setIsActivating(true);
      setFieldError('');

      try {
        const activatedAvatar = await activateProfileAvatar(profileId, nextAvatar.id);

        setAvatar(activatedAvatar);
        setStatus(activatedAvatar.status ?? 'active');
        setAvatars((current) =>
          current.map((item) => {
            if (String(item.id) === String(activatedAvatar.id)) {
              return activatedAvatar;
            }

            if (item.status === 'active') {
              return { ...item, status: 'inactive' };
            }

            return item;
          })
        );
        toast.success(t('dashboard.profiles.detail.avatar.toasts.avatarActivated'));
        handleCloseDialog();
      } catch (err) {
        logger.error(err);
        const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
        setFieldError(message);
        toast.error(message);
      } finally {
        setIsActivating(false);
      }
    },
    [handleCloseDialog, isAvatarProcessing, profileId, t]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            action={
              displayStatus ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {isAvatarProcessing ? <CircularProgress size={16} /> : null}
                  <Chip color={getStatusColor(displayStatus)} label={getStatusLabel(displayStatus, t)} />
                </Stack>
              ) : null
            }
            subheader={t('dashboard.profiles.detail.avatar.subheader')}
            title={t('dashboard.profiles.detail.avatar.title')}
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <CardContent>
              <Stack spacing={3} sx={{ alignItems: 'center' }}>
                {isAvatarProcessing ? (
                  <Alert color="warning" sx={{ width: '100%' }}>
                    <Stack spacing={1}>
                      <Typography variant="body2">{t('dashboard.profiles.detail.avatar.processingMessage')}</Typography>
                      <LinearProgress color="warning" />
                    </Stack>
                  </Alert>
                ) : null}
                <Box
                  sx={{ height: { xs: 280, sm: avatarSize }, position: 'relative', width: { xs: 280, sm: avatarSize } }}
                >
                  <Box
                    sx={{
                      border: '1px solid var(--mui-palette-divider)',
                      borderRadius: '50%',
                      height: '100%',
                      overflow: 'hidden',
                      width: '100%',
                    }}
                  >
                    {isVideo ? (
                      <Box
                        autoPlay
                        component="video"
                        loop
                        muted
                        playsInline
                        src={avatarUrl}
                        sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                      />
                    ) : (
                      <Box
                        alt={
                          avatarFile
                            ? String(t('dashboard.profiles.detail.avatar.alt.profile'))
                            : String(t('dashboard.profiles.detail.avatar.alt.empty'))
                        }
                        component="img"
                        src={avatarUrl}
                        sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                      />
                    )}
                  </Box>
                  <IconButton
                    aria-label={t('dashboard.profiles.detail.avatar.editAriaLabel')}
                    disabled={isAvatarProcessing}
                    onClick={handleOpenDialog}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: 2,
                      position: 'absolute',
                      right: { xs: 24, sm: 36 },
                      top: { xs: 18, sm: 28 },
                      zIndex: 1,
                      '&:hover': { bgcolor: 'background.paper' },
                      '&.Mui-disabled': { bgcolor: 'background.paper', opacity: 0.68 },
                    }}
                  >
                    <PencilSimpleIcon />
                  </IconButton>
                </Box>
                {!avatarFile ? (
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.profiles.detail.avatar.noAvatar')}
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          )}
        </Card>
      </Stack>
      <Dialog
        fullWidth
        maxWidth="md"
        onClose={handleCloseDialog}
        open={dialogOpen}
        slotProps={{ backdrop: { sx: { bgcolor: 'rgba(15, 23, 42, 0.72)' } } }}
      >
        <DialogTitle>{t('dashboard.profiles.detail.avatar.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Tabs
              onChange={(_, value: AvatarDialogTab) => {
                setDialogTab(value);
                setFieldError('');
              }}
              value={dialogTab}
              variant="fullWidth"
            >
              <Tab
                icon={<ImagesSquareIcon />}
                iconPosition="start"
                label={t('dashboard.profiles.detail.avatar.tabs.history')}
                value="history"
              />
              <Tab
                icon={<UploadSimpleIcon />}
                iconPosition="start"
                label={t('dashboard.profiles.detail.avatar.tabs.upload')}
                value="upload"
              />
            </Tabs>
            <Divider />

            {fieldError ? <Alert color="error">{fieldError}</Alert> : null}

            {dialogTab === 'history' ? (
              <AvatarHistoryGrid
                activeAvatarId={activeAvatarId}
                avatars={avatars}
                disabled={isActivating || isSaving}
                onSelect={(nextAvatar) => {
                  handleActivateAvatar(nextAvatar).catch((err) => {
                    logger.error(err);
                  });
                }}
                t={t}
              />
            ) : (
              <React.Fragment>
                <Button component="label" startIcon={<UploadSimpleIcon />} variant="outlined">
                  {t('dashboard.profiles.actions.uploadImage')}
                  <input accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileChange} type="file" />
                </Button>
                {previewUrl ? (
                  <React.Fragment>
                    <Box
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      sx={{
                        alignItems: 'center',
                        aspectRatio: '1 / 1',
                        backgroundColor: 'background.default',
                        backgroundImage:
                          'linear-gradient(var(--mui-palette-divider) 1px, transparent 1px), linear-gradient(90deg, var(--mui-palette-divider) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                        border: '1px solid var(--mui-palette-divider)',
                        borderRadius: 1,
                        cursor: 'grab',
                        display: 'flex',
                        justifyContent: 'center',
                        maxWidth: avatarSize,
                        mx: 'auto',
                        overflow: 'hidden',
                        position: 'relative',
                        touchAction: 'none',
                        width: '100%',
                      }}
                    >
                      <Box
                        alt={String(t('dashboard.profiles.detail.avatar.alt.preview'))}
                        component="img"
                        draggable={false}
                        src={previewUrl}
                        sx={{
                          height: '100%',
                          left: '50%',
                          objectFit: 'cover',
                          pointerEvents: 'none',
                          position: 'absolute',
                          top: '50%',
                          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                          transformOrigin: 'center',
                          userSelect: 'none',
                          width: '100%',
                        }}
                      />
                    </Box>
                    <FormControl>
                      <Typography gutterBottom variant="subtitle2">
                        {t('dashboard.profiles.detail.avatar.zoom')}
                      </Typography>
                      <Slider
                        max={3}
                        min={1}
                        onChange={(_, value) => {
                          setZoom(value as number);
                        }}
                        step={0.05}
                        value={zoom}
                      />
                    </FormControl>
                  </React.Fragment>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.profiles.detail.avatar.uploadHint')}
                  </Typography>
                )}
              </React.Fragment>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={isSaving || isActivating} onClick={handleCloseDialog}>
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          {dialogTab === 'upload' ? (
            <Button disabled={isSaving || !previewUrl} onClick={handleSave} variant="contained">
              {isSaving ? t('dashboard.profiles.detail.avatar.saving') : t('dashboard.profiles.actions.save')}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function AvatarHistoryGrid({
  activeAvatarId,
  avatars,
  disabled,
  onSelect,
  t,
}: {
  activeAvatarId: string;
  avatars: ProfileAvatar[];
  disabled: boolean;
  onSelect: (avatar: ProfileAvatar) => void;
  t: ReturnType<typeof useTranslation>['t'];
}): React.JSX.Element {
  if (!avatars.length) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          border: '1px dashed var(--mui-palette-divider)',
          borderRadius: 1,
          display: 'flex',
          minHeight: 180,
          justifyContent: 'center',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <ImagesSquareIcon fontSize="var(--icon-fontSize-lg)" />
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.profiles.detail.avatar.historyEmpty')}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 112px))',
        justifyContent: 'center',
      }}
    >
      {avatars.map((item) => {
        const file = getAvatarFile(item);
        const isVideo = file ? isVideoFile(file) : false;
        const isActive = String(item.id) === activeAvatarId || item.status === 'active';
        const canSelect = !disabled && !isActive && isAvatarSelectable(item);

        return (
          <ButtonBase
            aria-label={
              isActive
                ? String(t('dashboard.profiles.detail.avatar.currentAvatar'))
                : String(t('dashboard.profiles.detail.avatar.previousAvatar'))
            }
            disabled={!canSelect}
            key={item.id}
            onClick={() => {
              onSelect(item);
            }}
            sx={{
              aspectRatio: '1 / 1',
              border: '5px solid',
              borderColor: isActive ? 'success.main' : 'transparent',
              borderRadius: '50%',
              boxShadow: isActive
                ? '0 0 0 2px var(--mui-palette-background-paper)'
                : '0 0 0 1px var(--mui-palette-divider)',
              display: 'block',
              overflow: 'hidden',
              width: '100%',
              '&.Mui-disabled': {
                opacity: isActive ? 1 : 0.42,
              },
              '&:hover': {
                borderColor: canSelect ? 'success.light' : undefined,
              },
            }}
          >
            {file ? (
              isVideo ? (
                <Box
                  autoPlay
                  component="video"
                  loop
                  muted
                  playsInline
                  src={resolveAssetUrl(file)}
                  sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                />
              ) : (
                <Box
                  alt={String(t('dashboard.profiles.detail.avatar.alt.profile'))}
                  component="img"
                  src={resolveAssetUrl(file)}
                  sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                />
              )
            ) : (
              <Box
                alt={String(t('dashboard.profiles.detail.avatar.alt.empty'))}
                component="img"
                src={emptyAvatarSrc}
                sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
              />
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function getAvatarFile(avatar: null | ProfileAvatar): string {
  return avatar?.ai_video?.file || avatar?.file || avatar?.ai_image?.file || '';
}

function isAvatarSelectable(avatar: ProfileAvatar): boolean {
  return ['active', 'inactive'].includes(String(avatar.status ?? '').toLowerCase()) && Boolean(getAvatarFile(avatar));
}

function upsertAvatar(avatars: ProfileAvatar[], avatar: ProfileAvatar): ProfileAvatar[] {
  const exists = avatars.some((item) => String(item.id) === String(avatar.id));

  if (!exists) {
    return [avatar, ...avatars];
  }

  return avatars.map((item) => (String(item.id) === String(avatar.id) ? avatar : item));
}

function resolveAssetUrl(file: string): string {
  if (/^(?:blob:|data:|https?:\/\/)/i.test(file)) {
    return file;
  }

  const baseUrl = config.api?.baseUrl ?? '';

  if (file.startsWith('/')) {
    return `${baseUrl}${file}`;
  }

  if (file.startsWith('storage/')) {
    return `${baseUrl}/${file}`;
  }

  return `${baseUrl}/storage/${file}`;
}

function isVideoFile(file: string): boolean {
  return /\.(?:m4v|mov|mp4|ogg|webm)(?:\?.*)?$/i.test(file);
}

function getStatusColor(status: string): 'default' | 'error' | 'success' | 'warning' {
  const value = status.toLowerCase();

  if (['processing', 'pending', 'queued', 'running'].includes(value)) {
    return 'warning';
  }

  if (['active', 'completed', 'generated', 'ready', 'succeeded'].includes(value)) {
    return 'success';
  }

  if (['error', 'failed'].includes(value)) {
    return 'error';
  }

  return 'default';
}

function getStatusLabel(status: string, t: ReturnType<typeof useTranslation>['t']): string {
  const value = status.toLowerCase();

  if (['active', 'failed', 'inactive', 'processing'].includes(value)) {
    return t(`dashboard.profiles.detail.avatar.status.${value}`);
  }

  return status || t('dashboard.profiles.detail.avatar.status.unknown');
}

async function createCroppedAvatarFile(
  imageUrl: string,
  position: { x: number; y: number },
  zoom: number,
  errorMessage: string
): Promise<File> {
  const image = await loadImage(imageUrl, errorMessage);
  const canvas = document.createElement('canvas');
  canvas.height = avatarSize;
  canvas.width = avatarSize;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error(errorMessage);
  }

  const baseScale = Math.max(avatarSize / image.naturalWidth, avatarSize / image.naturalHeight);
  const drawWidth = image.naturalWidth * baseScale * zoom;
  const drawHeight = image.naturalHeight * baseScale * zoom;
  const drawX = avatarSize / 2 + position.x - drawWidth / 2;
  const drawY = avatarSize / 2 + position.y - drawHeight / 2;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, avatarSize, avatarSize);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error(errorMessage));
        return;
      }

      resolve(nextBlob);
    }, 'image/png');
  });

  return new File([blob], 'avatar.png', { type: 'image/png' });
}

async function loadImage(src: string, errorMessage: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(errorMessage));
    };
    image.src = src;
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

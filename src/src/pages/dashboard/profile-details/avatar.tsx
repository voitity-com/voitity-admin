'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { ProfileAvatar } from '@/lib/avatar/api-client';
import { generateAvatar, getProfileAvatar } from '@/lib/avatar/api-client';
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

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [avatar, setAvatar] = React.useState<null | ProfileAvatar>(null);
  const [error, setError] = React.useState<string>('');
  const [fieldError, setFieldError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = React.useState<string>('');
  const [zoom, setZoom] = React.useState<number>(1);
  const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragState, setDragState] = React.useState<DragState | null>(null);
  const [status, setStatus] = React.useState<string>('');
  const [isPollingAvatar, setIsPollingAvatar] = React.useState<boolean>(false);
  const [pendingAiImageId, setPendingAiImageId] = React.useState<string>('');

  const avatarFile = getAvatarFile(avatar);
  const avatarUrl = avatarFile ? resolveAssetUrl(avatarFile) : emptyAvatarSrc;
  const isVideo = avatarFile ? isVideoFile(avatarFile) : false;
  const displayStatus = isPollingAvatar ? 'processing' : status;

  const loadAvatar = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const nextAvatar = await getProfileAvatar(profileId);
      setAvatar(nextAvatar);
      setStatus(nextAvatar?.status ?? '');
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
        const nextAvatar = await getProfileAvatar(profileId);

        if (isCancelled) {
          return;
        }

        if (nextAvatar) {
          setAvatar(nextAvatar);

          const nextAiImageId = nextAvatar.ai_image?.id ? String(nextAvatar.ai_image.id) : '';
          const hasVideo = Boolean(nextAvatar.ai_video?.file || nextAvatar.file);
          const matchesPendingImage = pendingAiImageId ? nextAiImageId === pendingAiImageId : true;

          if (matchesPendingImage && hasVideo) {
            setStatus(nextAvatar.status ?? 'active');
            setPendingAiImageId('');
            setIsPollingAvatar(false);
            return;
          }
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
  }, [isPollingAvatar, pendingAiImageId, profileId]);

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
    setDialogOpen(true);
    setFieldError('');
  }, []);

  const handleCloseDialog = React.useCallback((): void => {
    if (isSaving) {
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
  }, [isSaving, previewUrl]);

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
      setPendingAiImageId(String(generated.id));
      setIsPollingAvatar(true);
      setStatus('processing');
      setAvatar((current) => (current ? { ...current, status: generated.status || 'processing' } : current));
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
                  {isPollingAvatar ? <CircularProgress size={16} /> : null}
                  <Chip color={getStatusColor(displayStatus)} label={displayStatus} />
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
                <Box sx={{ height: { xs: 280, sm: avatarSize }, position: 'relative', width: { xs: 280, sm: avatarSize } }}>
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
                    onClick={handleOpenDialog}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: 2,
                      position: 'absolute',
                      right: { xs: 24, sm: 36 },
                      top: { xs: 18, sm: 28 },
                      zIndex: 1,
                      '&:hover': { bgcolor: 'background.paper' },
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
        maxWidth="sm"
        onClose={handleCloseDialog}
        open={dialogOpen}
        slotProps={{ backdrop: { sx: { bgcolor: 'rgba(15, 23, 42, 0.72)' } } }}
      >
        <DialogTitle>{t('dashboard.profiles.detail.avatar.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
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
                  {fieldError ? <FormHelperText error>{fieldError}</FormHelperText> : null}
                </FormControl>
              </React.Fragment>
            ) : fieldError ? (
              <FormHelperText error>{fieldError}</FormHelperText>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={isSaving} onClick={handleCloseDialog}>
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          <Button disabled={isSaving || !previewUrl} onClick={handleSave} variant="contained">
            {isSaving ? t('dashboard.profiles.detail.avatar.saving') : t('dashboard.profiles.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function getAvatarFile(avatar: null | ProfileAvatar): string {
  return avatar?.ai_video?.file || avatar?.file || avatar?.ai_image?.file || '';
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

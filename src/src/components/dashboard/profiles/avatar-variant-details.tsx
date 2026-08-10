'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { FilmStrip as FilmStripIcon } from '@phosphor-icons/react/dist/ssr/FilmStrip';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';
import type { AvatarVariant, ProfileAvatar, ProfileAvatarVariant } from '@/lib/avatar/api-client';

const variantOrder: AvatarVariant[] = ['original', 'enhanced', 'animation'];

export interface AvatarVariantDetailsProps {
  avatar: ProfileAvatar;
  disabled: boolean;
  onClose: () => void;
  onUse: (variant: AvatarVariant) => void;
}

export function AvatarVariantDetails({
  avatar,
  disabled,
  onClose,
  onUse,
}: AvatarVariantDetailsProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Box
      onClick={onClose}
      sx={{
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        display: 'flex',
        inset: 0,
        justifyContent: 'center',
        minHeight: 260,
        p: { xs: 2, sm: 4 },
        position: 'absolute',
        zIndex: 2,
      }}
    >
      <IconButton
        aria-label={t('dashboard.profiles.detail.avatar.variants.close')}
        onClick={onClose}
        size="small"
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 2,
          position: 'absolute',
          right: 8,
          top: 8,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <XIcon />
      </IconButton>

      <Stack
        direction="row"
        flexWrap="wrap"
        gap={{ xs: 2, sm: 3 }}
        justifyContent="center"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {variantOrder.map((variant) => {
          const asset = avatar.variants?.[variant] ?? legacyVariant(avatar, variant);
          const isAvailable = asset.status === 'available' && Boolean(asset.file);
          const isSelected = isVariantSelected(avatar, variant, asset);
          const name = String(t(`dashboard.profiles.detail.avatar.variants.names.${variant}`));
          const status = isSelected
            ? String(t('dashboard.profiles.detail.avatar.variants.inUse'))
            : String(t(`dashboard.profiles.detail.avatar.variants.status.${asset.status}`));
          const actionLabel =
            isAvailable && !isSelected
              ? `${String(t('dashboard.profiles.detail.avatar.variants.use'))}: ${name}`
              : `${name}: ${status}`;

          return (
            <Stack key={variant} spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography noWrap variant="subtitle2">
                {name}
              </Typography>
              <Tooltip title={asset.failure_reason || status}>
                <Box component="span" sx={{ display: 'block' }}>
                  <ButtonBase
                    aria-label={actionLabel}
                    disabled={disabled || !isAvailable || isSelected}
                    onClick={() => {
                      onUse(variant);
                    }}
                    sx={{
                      aspectRatio: '1 / 1',
                      bgcolor: 'background.paper',
                      border: '5px solid',
                      borderColor: isSelected ? 'success.main' : 'background.paper',
                      borderRadius: '50%',
                      boxShadow: isSelected
                        ? '0 0 0 2px var(--mui-palette-background-paper), 0 8px 24px rgba(15, 23, 42, 0.28)'
                        : '0 0 0 1px var(--mui-palette-divider), 0 8px 24px rgba(15, 23, 42, 0.22)',
                      display: 'block',
                      overflow: 'hidden',
                      position: 'relative',
                      width: { xs: 92, sm: 112 },
                      '&.Mui-disabled': {
                        opacity: isSelected ? 1 : 0.72,
                      },
                      '&:hover': {
                        borderColor: isAvailable ? 'success.light' : 'background.paper',
                      },
                    }}
                  >
                    {asset.file ? (
                      asset.kind === 'video' ? (
                        <Box
                          autoPlay
                          component="video"
                          loop
                          muted
                          playsInline
                          src={resolveAssetUrl(asset.file)}
                          sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                        />
                      ) : (
                        <Box
                          alt={name}
                          component="img"
                          src={resolveAssetUrl(asset.file)}
                          sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                        />
                      )
                    ) : (
                      <Stack
                        sx={{
                          alignItems: 'center',
                          color: 'text.secondary',
                          height: '100%',
                          justifyContent: 'center',
                          width: '100%',
                        }}
                      >
                        {variant === 'animation' ? <FilmStripIcon size={30} /> : <ImageIcon size={30} />}
                      </Stack>
                    )}
                  </ButtonBase>
                </Box>
              </Tooltip>
              <Chip
                color={isSelected ? 'success' : variantStatusColor(asset.status)}
                label={status}
                size="small"
                sx={{ fontSize: '0.68rem', '& .MuiChip-label': { px: 0.75 } }}
              />
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

function legacyVariant(avatar: ProfileAvatar, variant: AvatarVariant): ProfileAvatarVariant {
  const file =
    variant === 'original'
      ? avatar.original_file
      : variant === 'enhanced'
        ? avatar.ai_image?.file
        : avatar.ai_video?.file || (avatar.file && isVideoFile(avatar.file) ? avatar.file : null);

  return {
    file,
    kind: variant === 'animation' ? 'video' : 'image',
    selected: avatar.selected_variant === variant,
    status: file ? 'available' : 'unavailable',
  };
}

function isVariantSelected(avatar: ProfileAvatar, variant: AvatarVariant, asset: ProfileAvatarVariant): boolean {
  if (avatar.status !== 'active') {
    return false;
  }

  if (asset.selected || avatar.selected_variant === variant) {
    return true;
  }

  return Boolean(asset.file && avatar.file === asset.file);
}

function variantStatusColor(
  status: ProfileAvatarVariant['status']
): 'default' | 'error' | 'info' | 'success' | 'warning' {
  if (status === 'available') {
    return 'success';
  }

  if (status === 'failed') {
    return 'error';
  }

  if (status === 'processing' || status === 'waiting') {
    return 'info';
  }

  return 'default';
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

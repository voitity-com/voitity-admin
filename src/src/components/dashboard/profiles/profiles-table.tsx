'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';
import type { ProfileAvatar } from '@/lib/avatar/api-client';
import type { Profile } from '@/lib/profiles/api-client';
import { getPublicProfileUrl, isPublishedProfile } from '@/lib/profiles/public-profile-url';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';

import { useProfilesSelection } from './profiles-selection-context';

export interface ProfilesTableProps {
  onOpen?: (profile: Profile) => void;
  rows?: Profile[];
  spotlightProfileId?: null | string;
}

export function ProfilesTable({ onOpen, rows = [], spotlightProfileId }: ProfilesTableProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const columns = React.useMemo(() => getColumns({ language, t }), [language, t]);
  const { deselectAll, deselectOne, selectAll, selectOne, selected } = useProfilesSelection();

  return (
    <React.Fragment>
      <DataTable<Profile>
        columns={columns}
        getRowAriaLabel={(row) => t('dashboard.profiles.actions.openProfile', { name: row.name })}
        getRowDataAttributes={(row) =>
          isSpotlightProfile(row, spotlightProfileId) ? { 'data-profile-onboarding-anchor': String(row.id) } : {}
        }
        getRowSx={(row) =>
          isSpotlightProfile(row, spotlightProfileId)
            ? (theme) => ({
                outline: '8px solid rgba(255, 255, 255, 0.22)',
                outlineOffset: -4,
                position: 'relative',
                transform: 'translateZ(0)',
                transition: theme.transitions.create(['box-shadow', 'outline-color', 'transform'], {
                  duration: theme.transitions.duration.shorter,
                }),
                zIndex: theme.zIndex.modal + 2,
                '& > td': {
                  bgcolor: 'background.paper',
                  borderBottomColor: 'rgba(255, 255, 255, 0.5)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.5)',
                },
                '& > td:first-of-type': {
                  borderBottomLeftRadius: 8,
                  borderLeft: '1px solid rgba(255, 255, 255, 0.5)',
                  borderTopLeftRadius: 8,
                },
                '& > td:last-of-type': {
                  borderBottomRightRadius: 8,
                  borderRight: '1px solid rgba(255, 255, 255, 0.5)',
                  borderTopRightRadius: 8,
                },
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
              })
            : undefined
        }
        hover
        onClick={(_, row) => {
          onOpen?.(row);
        }}
        onDeselectAll={deselectAll}
        onDeselectOne={(_, row) => {
          deselectOne(String(row.id));
        }}
        onSelectAll={selectAll}
        onSelectOne={(_, row) => {
          selectOne(String(row.id));
        }}
        rows={rows}
        selectable
        selected={selected}
        uniqueRowId={(row) => String(row.id)}
      />
      {!rows.length ? (
        <Box sx={{ p: 3 }}>
          <Typography color="text.secondary" sx={{ textAlign: 'center' }} variant="body2">
            {t('dashboard.profiles.empty')}
          </Typography>
        </Box>
      ) : null}
    </React.Fragment>
  );
}

function getColumns({
  language,
  t,
}: {
  language: string;
  t: (key: string) => string;
}): ColumnDef<Profile>[] {
  return [
    {
      formatter: (row): React.JSX.Element => renderAvatarCell(row, t),
      name: t('dashboard.profiles.fields.avatar'),
      width: '88px',
    },
    {
      formatter: (row): React.JSX.Element => renderNameCell(row, t),
      name: t('dashboard.profiles.fields.name'),
      width: '260px',
    },
    {
      formatter: (row): string => row.alias || '-',
      name: t('dashboard.profiles.fields.alias'),
      width: '180px',
    },
    {
      formatter: (row): string => formatProfession(row.profession_key),
      name: t('dashboard.profiles.fields.profession'),
      width: '160px',
    },
    {
      formatter: (row): React.JSX.Element => renderStatusCell(row, t),
      name: t('dashboard.profiles.fields.status'),
      width: '180px',
    },
    {
      formatter: (row): string => formatDate(row.updated_at, language),
      name: t('dashboard.profiles.fields.updated'),
      width: '160px',
    },
  ];
}

function renderNameCell(row: Profile, t: (key: string) => string): React.JSX.Element {
  const publicProfileUrl = isPublishedProfile(row) ? getPublicProfileUrl(row) : null;

  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography sx={{ whiteSpace: 'nowrap' }} variant="subtitle2">
        {row.name}
      </Typography>
      {publicProfileUrl ? (
        <Link
          href={publicProfileUrl}
          onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
            event.stopPropagation();
          }}
          onMouseDown={(event: React.MouseEvent<HTMLAnchorElement>) => {
            event.stopPropagation();
          }}
          rel="noreferrer"
          sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
          target="_blank"
          underline="hover"
          variant="caption"
        >
          {t('dashboard.profiles.actions.viewProfile')}
        </Link>
      ) : null}
    </Stack>
  );
}

function renderAvatarCell(row: Profile, t: (key: string) => string): React.JSX.Element {
  const media = getAvatarMedia(row.avatar ?? null);

  if (!media) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          bgcolor: 'background.level2',
          borderRadius: '50%',
          color: 'text.secondary',
          display: 'flex',
          fontSize: '0.875rem',
          fontWeight: 600,
          height: 56,
          justifyContent: 'center',
          overflow: 'hidden',
          width: 56,
        }}
      >
        {getInitials(row.name)}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: '50%',
        height: 56,
        overflow: 'hidden',
        width: 56,
      }}
    >
      {media.type === 'video' ? (
        <Box
          autoPlay
          component="video"
          loop
          muted
          playsInline
          src={resolveAssetUrl(media.file)}
          sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
        />
      ) : (
        <Box
          alt={t('dashboard.profiles.detail.avatar.alt.profile')}
          component="img"
          src={resolveAssetUrl(media.file)}
          sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
        />
      )}
    </Box>
  );
}

function renderStatusCell(row: Profile, t: (key: string) => string): React.JSX.Element {
  const status = normalizeProfileStatus(row.status);

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Chip color={status === 'published' ? 'success' : 'default'} label={t(`dashboard.profiles.status.${status}`)} size="small" />
      <Chip
        color={row.active ? 'success' : 'default'}
        label={row.active ? t('dashboard.profiles.status.active') : t('dashboard.profiles.status.inactive')}
        size="small"
        variant="outlined"
      />
    </Stack>
  );
}

function normalizeProfileStatus(status: null | string | undefined): string {
  return ['draft', 'ready', 'published', 'hidden'].includes(status ?? '') ? String(status) : 'draft';
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDate(value: null | string | undefined, language: string): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatProfession(value: null | string | undefined): string {
  if (!value) {
    return '-';
  }

  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getAvatarMedia(avatar: null | ProfileAvatar): null | { file: string; type: 'image' | 'video' } {
  if (avatar?.ai_video?.file) {
    return { file: avatar.ai_video.file, type: 'video' };
  }

  const file = avatar?.file || avatar?.ai_image?.file || '';

  if (!file) {
    return null;
  }

  return { file, type: isVideoFile(file) ? 'video' : 'image' };
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

function isSpotlightProfile(row: Profile, spotlightProfileId: null | string | undefined): boolean {
  return Boolean(spotlightProfileId) && String(row.id) === spotlightProfileId;
}

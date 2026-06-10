'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { config } from '@/config';
import type { ProfileAvatar } from '@/lib/avatar/api-client';
import type { Profile } from '@/lib/profiles/api-client';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';

import { useProfilesSelection } from './profiles-selection-context';

export interface ProfilesTableProps {
  onOpen?: (profile: Profile) => void;
  rows?: Profile[];
}

export function ProfilesTable({ onOpen, rows = [] }: ProfilesTableProps): React.JSX.Element {
  const columns = React.useMemo(() => getColumns(), []);
  const { deselectAll, deselectOne, selectAll, selectOne, selected } = useProfilesSelection();

  return (
    <React.Fragment>
      <DataTable<Profile>
        columns={columns}
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
            No profiles found
          </Typography>
        </Box>
      ) : null}
    </React.Fragment>
  );
}

function getColumns(): ColumnDef<Profile>[] {
  return [
    {
      formatter: renderAvatarCell,
      name: 'Avatar',
      width: '88px',
    },
    {
      formatter: (row): React.JSX.Element => (
        <Typography sx={{ whiteSpace: 'nowrap' }} variant="subtitle2">
          {row.name}
        </Typography>
      ),
      name: 'Name',
      width: '260px',
    },
    {
      formatter: (row): string => row.alias || '-',
      name: 'Alias',
      width: '180px',
    },
    {
      formatter: renderStatusCell,
      name: 'Status',
      width: '120px',
    },
    {
      formatter: (row): string => formatDate(row.updated_at),
      name: 'Updated',
      width: '160px',
    },
  ];
}

function renderAvatarCell(row: Profile): React.JSX.Element {
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
          alt={`${row.name} avatar`}
          component="img"
          src={resolveAssetUrl(media.file)}
          sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
        />
      )}
    </Box>
  );
}

function renderStatusCell(row: Profile): React.JSX.Element {
  return (
    <Chip
      color={row.active ? 'success' : 'default'}
      label={row.active ? 'Active' : 'Inactive'}
      size="small"
      variant="outlined"
    />
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDate(value?: null | string): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
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

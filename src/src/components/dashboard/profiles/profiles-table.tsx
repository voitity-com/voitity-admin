'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Database as DatabaseIcon } from '@phosphor-icons/react/dist/ssr/Database';

import type { Profile } from '@/lib/profiles/api-client';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';

import { useProfilesSelection } from './profiles-selection-context';

export interface ProfilesTableProps {
  onEdit?: (profile: Profile) => void;
  onEditData?: (profile: Profile) => void;
  rows?: Profile[];
}

export function ProfilesTable({ onEdit, onEditData, rows = [] }: ProfilesTableProps): React.JSX.Element {
  const columns = React.useMemo(() => getColumns({ onEdit, onEditData }), [onEdit, onEditData]);
  const { deselectAll, deselectOne, selectAll, selectOne, selected } = useProfilesSelection();

  return (
    <React.Fragment>
      <DataTable<Profile>
        columns={columns}
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

function getColumns({
  onEdit,
  onEditData,
}: {
  onEdit?: (profile: Profile) => void;
  onEditData?: (profile: Profile) => void;
}): ColumnDef<Profile>[] {
  return [
    {
      formatter: renderProfileCell,
      name: 'Name',
      width: '280px',
    },
    { field: 'genre', name: 'Genre', width: '120px' },
    { field: 'personality', name: 'Personality', width: '180px' },
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
    {
      formatter: (row): React.JSX.Element => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', minWidth: '260px' }}>
          <Button
            color="secondary"
            onClick={() => {
              onEdit?.(row);
            }}
            size="small"
            startIcon={<PencilSimpleIcon />}
            variant="outlined"
          >
            Update profile
          </Button>
          <Button
            color="secondary"
            onClick={() => {
              onEditData?.(row);
            }}
            size="small"
            startIcon={<DatabaseIcon />}
            variant="outlined"
          >
            Update data
          </Button>
        </Stack>
      ),
      name: 'Actions',
      align: 'right',
      width: '300px',
    },
  ];
}

function renderProfileCell(row: Profile): React.JSX.Element {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Avatar>{getInitials(row.name)}</Avatar>
      <div>
        <Typography sx={{ whiteSpace: 'nowrap' }} variant="subtitle2">
          {row.name}
        </Typography>
        <Typography color="text.secondary" noWrap variant="body2">
          {row.description}
        </Typography>
      </div>
    </Stack>
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

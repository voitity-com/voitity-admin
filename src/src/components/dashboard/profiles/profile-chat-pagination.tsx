'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

interface ProfileChatPaginationProps {
  currentPage: number;
  disabled?: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  totalLabel?: null | string;
}

export function ProfileChatPagination({
  currentPage,
  disabled = false,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  totalLabel,
}: ProfileChatPaginationProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <CardActions
      sx={{
        alignItems: 'center',
        borderTop: '1px solid var(--mui-palette-divider)',
        justifyContent: 'space-between',
        px: 3,
      }}
    >
      <Typography color="text.secondary" variant="body2">
        {t('dashboard.profiles.detail.chats.pagination.page', { page: currentPage })}
        {totalLabel ? ` · ${totalLabel}` : null}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          color="secondary"
          disabled={!hasPreviousPage || disabled}
          onClick={() => {
            onPageChange(currentPage - 1);
          }}
          variant="outlined"
        >
          {t('dashboard.profiles.detail.chats.pagination.previous')}
        </Button>
        <Button
          color="secondary"
          disabled={!hasNextPage || disabled}
          onClick={() => {
            onPageChange(currentPage + 1);
          }}
          variant="outlined"
        >
          {t('dashboard.profiles.detail.chats.pagination.next')}
        </Button>
      </Stack>
    </CardActions>
  );
}

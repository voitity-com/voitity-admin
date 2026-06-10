'use client';

import * as React from 'react';
import TablePagination from '@mui/material/TablePagination';
import { useTranslation } from 'react-i18next';

function noop(): void {
  return undefined;
}

interface ProfilesPaginationProps {
  count: number;
  page: number;
}

export function ProfilesPagination({ count, page }: ProfilesPaginationProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <TablePagination
      component="div"
      count={count}
      getItemAriaLabel={(type) => {
        const labels = {
          first: t('dashboard.profiles.pagination.firstPage'),
          last: t('dashboard.profiles.pagination.lastPage'),
          next: t('dashboard.profiles.pagination.nextPage'),
          previous: t('dashboard.profiles.pagination.previousPage'),
        };

        return labels[type];
      }}
      labelDisplayedRows={({ count: total, from, to }) =>
        t('dashboard.profiles.pagination.displayedRows', {
          from,
          total: total === -1 ? t('dashboard.profiles.pagination.moreThan', { to }) : total,
          to,
        })
      }
      labelRowsPerPage={t('dashboard.profiles.pagination.rowsPerPage')}
      onPageChange={noop}
      onRowsPerPageChange={noop}
      page={page}
      rowsPerPage={5}
      rowsPerPageOptions={[5, 10, 25]}
    />
  );
}

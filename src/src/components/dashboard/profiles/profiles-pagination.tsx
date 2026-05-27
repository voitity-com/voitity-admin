'use client';

import * as React from 'react';
import TablePagination from '@mui/material/TablePagination';

function noop(): void {
  return undefined;
}

interface ProfilesPaginationProps {
  count: number;
  page: number;
}

export function ProfilesPagination({ count, page }: ProfilesPaginationProps): React.JSX.Element {
  return (
    <TablePagination
      component="div"
      count={count}
      onPageChange={noop}
      onRowsPerPageChange={noop}
      page={page}
      rowsPerPage={5}
      rowsPerPageOptions={[5, 10, 25]}
    />
  );
}

'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { useTranslation } from 'react-i18next';

import type { LoginHistoryEvent, LoginHistoryPagination } from '@/lib/auth/custom/api-client';
import { authClient } from '@/lib/auth/custom/client';
import { dayjs } from '@/lib/dayjs';
import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';

const rowsPerPage = 10;

const defaultPagination = {
  current_page: 1,
  last_page: 1,
  per_page: rowsPerPage,
  total: 0,
} satisfies LoginHistoryPagination;

interface LoginHistoryRow extends LoginHistoryEvent {
  ipAddressLabel: string;
  loginTypeLabel: string;
  timestampLabel: string;
  userAgentLabel: string;
}

const columns = [
  {
    formatter: (row): React.JSX.Element => <LoginTypeCell timestamp={row.timestampLabel} type={row.loginTypeLabel} />,
    name: 'loginType',
    width: '250px',
  },
  { field: 'ipAddressLabel', name: 'ipAddress', width: '150px' },
  { field: 'userAgentLabel', name: 'userAgent', width: '320px' },
] satisfies ColumnDef<LoginHistoryRow>[];

function noop(): void {
  return undefined;
}

export function LoginHistory(): React.JSX.Element {
  const { t } = useTranslation();
  const [events, setEvents] = React.useState<LoginHistoryEvent[]>([]);
  const [pagination, setPagination] = React.useState<LoginHistoryPagination>(defaultPagination);
  const [page, setPage] = React.useState(0);
  const [error, setError] = React.useState<null | string>(null);
  const [loading, setLoading] = React.useState(true);

  const loadPage = React.useCallback(async (nextPage: number): Promise<void> => {
    setLoading(true);
    setError(null);

    const response = await authClient.getLoginHistory({ page: nextPage + 1, perPage: rowsPerPage });

    if (response.error) {
      setEvents([]);
      setPagination(defaultPagination);
      setError(response.error);
      setLoading(false);
      return;
    }

    setEvents(response.data?.events ?? []);
    setPagination(response.data?.pagination ?? defaultPagination);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const rows = React.useMemo(
    () =>
      events.map((event) => {
        const createdAt = event.created_at
          ? dayjs(event.created_at).format('hh:mm A MMM D, YYYY')
          : t('dashboard.settings.security.loginHistory.unknown');

        return {
          ...event,
          ipAddressLabel: event.ip_address || t('dashboard.settings.security.loginHistory.unknown'),
          loginTypeLabel: getLoginTypeLabel(event.type, t),
          timestampLabel: t('dashboard.settings.security.loginHistory.timestamp', { date: createdAt }),
          userAgentLabel: event.user_agent || t('dashboard.settings.security.loginHistory.unknown'),
        };
      }),
    [events, t]
  );

  const translatedColumns = React.useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        name: t(`dashboard.settings.security.loginHistory.columns.${column.name}`),
      })),
    [t]
  );

  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar>
            <TimerIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.security.loginHistory.subheader')}
        title={t('dashboard.settings.security.loginHistory.title')}
      />
      <CardContent>
        <Card sx={{ overflowX: 'auto' }} variant="outlined">
          {loading ? (
            <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '180px', p: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3 }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          ) : rows.length ? (
            <DataTable<LoginHistoryRow> columns={translatedColumns} rows={rows} />
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.settings.security.loginHistory.empty')}
              </Typography>
            </Box>
          )}
          <TablePagination
            component="div"
            count={pagination.total}
            onPageChange={(_, nextPage) => {
              setPage(nextPage);
            }}
            onRowsPerPageChange={noop}
            page={Math.max((pagination.current_page || 1) - 1, 0)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
          />
        </Card>
      </CardContent>
    </Card>
  );
}

function LoginTypeCell({ timestamp, type }: { timestamp: string; type: string }): React.JSX.Element {
  return (
    <div>
      <Typography variant="subtitle2">{type}</Typography>
      <Typography color="text.secondary" variant="inherit">
        {timestamp}
      </Typography>
    </div>
  );
}

function getLoginTypeLabel(type: null | string | undefined, t: ReturnType<typeof useTranslation>['t']): string {
  if (type === 'credential') {
    return t('dashboard.settings.security.loginHistory.types.credential');
  }

  if (type === 'google') {
    return t('dashboard.settings.security.loginHistory.types.google');
  }

  return t('dashboard.settings.security.loginHistory.types.unknown');
}

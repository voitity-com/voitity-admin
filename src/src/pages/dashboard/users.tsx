'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { SignIn as SignInIcon } from '@phosphor-icons/react/dist/ssr/SignIn';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import type { AdminUser, AdminUsersPage } from '@/lib/admin-users/api-client';
import { impersonateAdminUser, listAdminUsers } from '@/lib/admin-users/api-client';
import { startAdminImpersonation } from '@/lib/auth/custom/admin-impersonation-store';
import { mapApiUser } from '@/lib/auth/custom/api-client';
import { logger } from '@/lib/default-logger';
import { useUser } from '@/hooks/use-user';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Users | Dashboard | ${config.site.name}` } satisfies Metadata;
const DEFAULT_PER_PAGE = 20;

export function Page(): React.JSX.Element {
  const { checkSession, isLoading: isAuthLoading, user } = useUser();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, perPage, search } = useExtractSearchParams(searchParams);
  const [searchValue, setSearchValue] = React.useState<string>(search);
  const [usersPage, setUsersPage] = React.useState<AdminUsersPage | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const [impersonatingUserId, setImpersonatingUserId] = React.useState<string | null>(null);
  const isAdmin = user?.role === 'admin';
  const language = i18n.resolvedLanguage ?? i18n.language;

  React.useEffect(() => {
    setSearchValue(search);
  }, [search]);

  const updateQuery = React.useCallback(
    (updates: Record<string, null | number | string>): void => {
      const nextSearchParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          nextSearchParams.delete(key);
          return;
        }

        nextSearchParams.set(key, String(value));
      });

      setSearchParams(nextSearchParams);
    },
    [searchParams, setSearchParams]
  );

  const loadUsers = React.useCallback(async (): Promise<void> => {
    if (!isAdmin) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const nextPage = await listAdminUsers({ page, perPage, search });
      setUsersPage(nextPage);
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.users.errors.generic'));
      logger.error(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, page, perPage, search, t]);

  React.useEffect(() => {
    if (isAuthLoading || !isAdmin) {
      return;
    }

    loadUsers().catch((err) => {
      logger.error(err);
    });
  }, [isAdmin, isAuthLoading, loadUsers]);

  const handleSearchSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      updateQuery({ page: 1, search: searchValue.trim() });
    },
    [searchValue, updateQuery]
  );

  const handleClearSearch = React.useCallback((): void => {
    setSearchValue('');
    updateQuery({ page: 1, search: null });
  }, [updateQuery]);

  const handleImpersonate = React.useCallback(
    async (targetUser: AdminUser): Promise<void> => {
      setImpersonatingUserId(String(targetUser.id));

      try {
        const response = await impersonateAdminUser(targetUser.id);
        const impersonatedUser = mapApiUser(response.user, {
          email: targetUser.email ?? undefined,
          id: String(targetUser.id),
          name: targetUser.name ?? undefined,
          role: targetUser.role ?? undefined,
        });
        const started = startAdminImpersonation(response.access_token, impersonatedUser);

        if (!started) {
          throw new Error(t('dashboard.users.errors.sessionMissing'));
        }

        await checkSession?.();
        toast.success(t('dashboard.users.toasts.impersonating', { user: getUserName(targetUser) }));
        navigate(paths.dashboard.profiles);
      } catch (err) {
        logger.error(err);
        toast.error(getErrorMessage(err, t('dashboard.users.errors.impersonate')));
      } finally {
        setImpersonatingUserId(null);
      }
    },
    [checkSession, navigate, t]
  );

  const pagination = usersPage?.pagination ?? {
    current_page: page,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Box
        sx={{
          maxWidth: 'var(--Content-maxWidth)',
          m: 'var(--Content-margin)',
          p: 'var(--Content-padding)',
          width: 'var(--Content-width)',
        }}
      >
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: '1 1 auto' }}>
              <Typography variant="h4">{t('dashboard.users.title')}</Typography>
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.users.description')}
              </Typography>
            </Box>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ width: { xs: '100%', sm: 360 } }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MagnifyingGlassIcon />
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                  }}
                  placeholder={t('dashboard.users.searchPlaceholder')}
                  size="small"
                  value={searchValue}
                />
                <Button type="submit" variant="contained">
                  {t('dashboard.users.actions.search')}
                </Button>
              </Stack>
            </Box>
          </Stack>

          {isAuthLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : null}

          {!isAuthLoading && !isAdmin ? <Alert color="warning">{t('dashboard.users.notAuthorized')}</Alert> : null}
          {error ? <Alert color="error">{error}</Alert> : null}

          {!isAuthLoading && isAdmin ? (
            <Card>
              {search ? (
                <Box sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Chip label={t('dashboard.users.filters.searching', { search })} variant="outlined" />
                    <Button onClick={handleClearSearch} size="small">
                      {t('dashboard.users.actions.clearSearch')}
                    </Button>
                  </Stack>
                </Box>
              ) : null}
              <Divider />
              {isLoading ? (
                <Stack sx={{ alignItems: 'center', p: 4 }}>
                  <CircularProgress />
                </Stack>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <AdminUsersTable
                    currentUserId={String(user?.id ?? '')}
                    impersonatingUserId={impersonatingUserId}
                    language={language}
                    onImpersonate={handleImpersonate}
                    rows={usersPage?.users ?? []}
                  />
                </Box>
              )}
              <Divider />
              <TablePagination
                component="div"
                count={pagination.total}
                getItemAriaLabel={(type) => {
                  const labels = {
                    first: t('dashboard.users.pagination.firstPage'),
                    last: t('dashboard.users.pagination.lastPage'),
                    next: t('dashboard.users.pagination.nextPage'),
                    previous: t('dashboard.users.pagination.previousPage'),
                  };

                  return labels[type];
                }}
                labelDisplayedRows={({ count: total, from, to }) =>
                  t('dashboard.users.pagination.displayedRows', { from, to, total })
                }
                labelRowsPerPage={t('dashboard.users.pagination.rowsPerPage')}
                onPageChange={(_, nextPage) => {
                  updateQuery({ page: nextPage + 1 });
                }}
                onRowsPerPageChange={(event) => {
                  updateQuery({ page: 1, perPage: Number(event.target.value) });
                }}
                page={Math.max(pagination.current_page - 1, 0)}
                rowsPerPage={pagination.per_page}
                rowsPerPageOptions={[10, 20, 50, 100]}
              />
            </Card>
          ) : null}
        </Stack>
      </Box>
    </React.Fragment>
  );
}

interface AdminUsersTableProps {
  currentUserId: string;
  impersonatingUserId: null | string;
  language: string;
  onImpersonate: (user: AdminUser) => Promise<void>;
  rows: AdminUser[];
}

function AdminUsersTable({
  currentUserId,
  impersonatingUserId,
  language,
  onImpersonate,
  rows,
}: AdminUsersTableProps): React.JSX.Element {
  const { t } = useTranslation();
  const columns = React.useMemo(
    () => getColumns({ currentUserId, impersonatingUserId, language, onImpersonate, t }),
    [currentUserId, impersonatingUserId, language, onImpersonate, t]
  );

  return (
    <React.Fragment>
      <DataTable<AdminUser> columns={columns} rows={rows} uniqueRowId={(row) => String(row.id)} />
      {!rows.length ? (
        <Box sx={{ p: 3 }}>
          <Typography color="text.secondary" sx={{ textAlign: 'center' }} variant="body2">
            {t('dashboard.users.empty')}
          </Typography>
        </Box>
      ) : null}
    </React.Fragment>
  );
}

function getColumns({
  currentUserId,
  impersonatingUserId,
  language,
  onImpersonate,
  t,
}: {
  currentUserId: string;
  impersonatingUserId: null | string;
  language: string;
  onImpersonate: (user: AdminUser) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ColumnDef<AdminUser>[] {
  return [
    {
      formatter: (row) => renderUserCell(row),
      name: t('dashboard.users.fields.user'),
      width: '300px',
    },
    {
      formatter: (row) => (
        <Chip
          color={row.role === 'admin' ? 'primary' : 'default'}
          label={row.role || t('dashboard.users.fields.unknown')}
          size="small"
          variant="outlined"
        />
      ),
      name: t('dashboard.users.fields.role'),
      width: '120px',
    },
    {
      formatter: (row) => renderResourcesCell(row, t),
      name: t('dashboard.users.fields.resources'),
      width: '560px',
    },
    {
      formatter: (row) => formatDate(row.created_at, language),
      name: t('dashboard.users.fields.created'),
      width: '180px',
    },
    {
      formatter: (row) => {
        const isCurrentUser = String(row.id) === currentUserId;
        const isLoading = impersonatingUserId === String(row.id);

        return (
          <Button
            disabled={Boolean(impersonatingUserId) || isCurrentUser}
            onClick={() => {
              onImpersonate(row).catch((err) => {
                logger.error(err);
              });
            }}
            size="small"
            startIcon={<SignInIcon />}
            variant="outlined"
          >
            {isCurrentUser
              ? t('dashboard.users.actions.currentUser')
              : isLoading
                ? t('dashboard.users.actions.entering')
                : t('dashboard.users.actions.impersonate')}
          </Button>
        );
      },
      name: t('dashboard.users.fields.actions'),
      width: '210px',
    },
  ];
}

function renderUserCell(row: AdminUser): React.JSX.Element {
  const name = getUserName(row);

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar src={row.avatar ?? undefined} sx={{ flex: '0 0 auto' }}>
        {getInitials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap variant="subtitle2">
          {name}
        </Typography>
        <Typography color="text.secondary" noWrap variant="body2">
          {row.email || '-'}
        </Typography>
      </Box>
    </Stack>
  );
}

function renderResourcesCell(
  row: AdminUser,
  t: (key: string, options?: Record<string, unknown>) => string
): React.JSX.Element {
  const counts = row.counts;
  const resources = [
    { key: 'profiles', label: t('dashboard.users.resources.profiles'), value: counts.profiles },
    { key: 'sources', label: t('dashboard.users.resources.sources'), value: counts.sources },
    { key: 'avatars', label: t('dashboard.users.resources.avatars'), value: counts.avatars },
    { key: 'voices', label: t('dashboard.users.resources.voices'), value: counts.voices },
    { key: 'images', label: t('dashboard.users.resources.images'), value: counts.ai_images },
    { key: 'videos', label: t('dashboard.users.resources.videos'), value: counts.ai_videos },
    { key: 'chats', label: t('dashboard.users.resources.chats'), value: counts.chats },
  ];

  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
      {resources.map((resource) => (
        <Chip key={resource.key} label={`${resource.label}: ${resource.value}`} size="small" variant="outlined" />
      ))}
    </Stack>
  );
}

function useExtractSearchParams(searchParams: URLSearchParams): { page: number; perPage: number; search: string } {
  const page = Number(searchParams.get('page') ?? 1);
  const perPage = Number(searchParams.get('perPage') ?? DEFAULT_PER_PAGE);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : DEFAULT_PER_PAGE,
    search: searchParams.get('search') ?? '',
  };
}

function getUserName(user: Pick<AdminUser, 'email' | 'name'>): string {
  return user.name || user.email || 'User';
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

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

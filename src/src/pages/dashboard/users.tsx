'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Info as InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { UserSwitch as UserSwitchIcon } from '@phosphor-icons/react/dist/ssr/UserSwitch';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import type { AdminSubscriptionPlan, AdminUser, AdminUsersPage } from '@/lib/admin-users/api-client';
import { impersonateAdminUser, listAdminUsers, updateAdminUserSubscription } from '@/lib/admin-users/api-client';
import { startAdminImpersonation } from '@/lib/auth/custom/admin-impersonation-store';
import { mapApiUser } from '@/lib/auth/custom/api-client';
import { logger } from '@/lib/default-logger';
import { useUser } from '@/hooks/use-user';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Users | Dashboard | ${config.site.name}` } satisfies Metadata;
const DEFAULT_PER_PAGE = 20;

interface PendingSubscriptionChange {
  plan: AdminSubscriptionPlan;
  user: AdminUser;
}

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
  const [pendingSubscriptionChange, setPendingSubscriptionChange] =
    React.useState<PendingSubscriptionChange | null>(null);
  const [resourcesUser, setResourcesUser] = React.useState<AdminUser | null>(null);
  const [updatingSubscriptionUserId, setUpdatingSubscriptionUserId] = React.useState<string | null>(null);
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
  }, [page, perPage, search, t]);

  React.useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }

    loadUsers().catch((err) => {
      logger.error(err);
    });
  }, [isAuthLoading, loadUsers, user]);

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

  const handleRequestSubscriptionChange = React.useCallback((targetUser: AdminUser, plan: AdminSubscriptionPlan): void => {
    if (!plan.id || targetUser.subscription?.plan === plan.id) {
      return;
    }

    setPendingSubscriptionChange({ plan, user: targetUser });
  }, []);

  const handleConfirmSubscriptionChange = React.useCallback(async (): Promise<void> => {
    if (!pendingSubscriptionChange) {
      return;
    }

    const targetUser = pendingSubscriptionChange.user;
    const plan = pendingSubscriptionChange.plan;

    if (!plan.id || targetUser.subscription?.plan === plan.id) {
      setPendingSubscriptionChange(null);
      return;
    }

    setUpdatingSubscriptionUserId(String(targetUser.id));

    try {
      const updatedUser = await updateAdminUserSubscription(targetUser.id, plan.id);

      setUsersPage((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          users: current.users.map((row) => (String(row.id) === String(updatedUser.id) ? updatedUser : row)),
        };
      });
      setPendingSubscriptionChange(null);
      toast.success(t('dashboard.users.toasts.subscriptionUpdated', { user: getUserName(targetUser) }));
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, t('dashboard.users.errors.subscriptionUpdate')));
    } finally {
      setUpdatingSubscriptionUserId(null);
    }
  }, [pendingSubscriptionChange, t]);

  const handleCloseSubscriptionConfirmation = React.useCallback((): void => {
    if (
      pendingSubscriptionChange &&
      updatingSubscriptionUserId === String(pendingSubscriptionChange.user.id)
    ) {
      return;
    }

    setPendingSubscriptionChange(null);
  }, [pendingSubscriptionChange, updatingSubscriptionUserId]);

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

          {error ? <Alert color="error">{error}</Alert> : null}

          {!isAuthLoading ? (
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
                    onRequestSubscriptionChange={handleRequestSubscriptionChange}
                    onShowResources={setResourcesUser}
                    rows={usersPage?.users ?? []}
                    subscriptionPlans={usersPage?.subscription_plans ?? []}
                    updatingSubscriptionUserId={updatingSubscriptionUserId}
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
          <ResourcesDialog
            language={language}
            onClose={() => {
              setResourcesUser(null);
            }}
            user={resourcesUser}
          />
          <SubscriptionConfirmationDialog
            change={pendingSubscriptionChange}
            isSubmitting={Boolean(
              pendingSubscriptionChange &&
                updatingSubscriptionUserId === String(pendingSubscriptionChange.user.id)
            )}
            onClose={handleCloseSubscriptionConfirmation}
            onConfirm={handleConfirmSubscriptionChange}
          />
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
  onRequestSubscriptionChange: (user: AdminUser, plan: AdminSubscriptionPlan) => void;
  onShowResources: (user: AdminUser) => void;
  rows: AdminUser[];
  subscriptionPlans: AdminSubscriptionPlan[];
  updatingSubscriptionUserId: null | string;
}

function AdminUsersTable({
  currentUserId,
  impersonatingUserId,
  language,
  onImpersonate,
  onRequestSubscriptionChange,
  onShowResources,
  rows,
  subscriptionPlans,
  updatingSubscriptionUserId,
}: AdminUsersTableProps): React.JSX.Element {
  const { t } = useTranslation();
  const columns = React.useMemo(
    () =>
      getColumns({
        currentUserId,
        impersonatingUserId,
        language,
        onImpersonate,
        onRequestSubscriptionChange,
        onShowResources,
        subscriptionPlans,
        t,
        updatingSubscriptionUserId,
      }),
    [
      currentUserId,
      impersonatingUserId,
      language,
      onImpersonate,
      onRequestSubscriptionChange,
      onShowResources,
      subscriptionPlans,
      t,
      updatingSubscriptionUserId,
    ]
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
  onRequestSubscriptionChange,
  onShowResources,
  subscriptionPlans,
  t,
  updatingSubscriptionUserId,
}: {
  currentUserId: string;
  impersonatingUserId: null | string;
  language: string;
  onImpersonate: (user: AdminUser) => Promise<void>;
  onRequestSubscriptionChange: (user: AdminUser, plan: AdminSubscriptionPlan) => void;
  onShowResources: (user: AdminUser) => void;
  subscriptionPlans: AdminSubscriptionPlan[];
  t: (key: string, options?: Record<string, unknown>) => string;
  updatingSubscriptionUserId: null | string;
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
      formatter: (row) =>
        renderSubscriptionCell({
          isUpdating: updatingSubscriptionUserId === String(row.id),
          onRequestSubscriptionChange,
          plans: subscriptionPlans,
          row,
          t,
        }),
      name: t('dashboard.users.fields.subscription'),
      width: '230px',
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
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <Tooltip title={t('dashboard.users.actions.viewResources')}>
              <IconButton
                aria-label={t('dashboard.users.actions.viewResources')}
                onClick={() => {
                  onShowResources(row);
                }}
                size="small"
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                isCurrentUser
                  ? t('dashboard.users.actions.currentUser')
                  : isLoading
                    ? t('dashboard.users.actions.entering')
                    : t('dashboard.users.actions.impersonate')
              }
            >
              <span>
                <IconButton
                  aria-label={
                    isCurrentUser
                      ? t('dashboard.users.actions.currentUser')
                      : t('dashboard.users.actions.impersonate')
                  }
                  disabled={Boolean(impersonatingUserId) || isCurrentUser}
                  onClick={() => {
                    onImpersonate(row).catch((err) => {
                      logger.error(err);
                    });
                  }}
                  size="small"
                >
                  {isLoading ? <CircularProgress size={18} /> : <UserSwitchIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      },
      name: t('dashboard.users.fields.actions'),
      width: '120px',
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

function renderSubscriptionCell({
  isUpdating,
  onRequestSubscriptionChange,
  plans,
  row,
  t,
}: {
  isUpdating: boolean;
  onRequestSubscriptionChange: (user: AdminUser, plan: AdminSubscriptionPlan) => void;
  plans: AdminSubscriptionPlan[];
  row: AdminUser;
  t: (key: string, options?: Record<string, unknown>) => string;
}): React.JSX.Element {
  const value = row.subscription?.plan ?? '';

  return (
    <TextField
      disabled={isUpdating || !plans.length}
      onChange={(event) => {
        const selectedPlan = plans.find((plan) => plan.id === event.target.value);

        if (selectedPlan) {
          onRequestSubscriptionChange(row, selectedPlan);
        }
      }}
      select
      size="small"
      sx={{ minWidth: 190 }}
      value={value}
    >
      {!value ? (
        <MenuItem disabled value="">
          {t('dashboard.users.subscription.none')}
        </MenuItem>
      ) : null}
      {plans.map((plan) => (
        <MenuItem key={plan.id} value={plan.id}>
          {formatPlanLabel(plan, t)}
        </MenuItem>
      ))}
    </TextField>
  );
}

function SubscriptionConfirmationDialog({
  change,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  change: PendingSubscriptionChange | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}): React.JSX.Element {
  const { t } = useTranslation();
  const currentPlan = change?.user.subscription?.plan_name || change?.user.subscription?.plan;
  const nextPlan = change ? formatPlanLabel(change.plan, t) : '';

  return (
    <Dialog fullWidth maxWidth="xs" onClose={isSubmitting ? undefined : onClose} open={Boolean(change)}>
      <DialogTitle>{t('dashboard.users.subscription.confirmTitle')}</DialogTitle>
      <DialogContent>
        {change ? (
          <Stack spacing={2}>
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.users.subscription.confirmMessage', {
                plan: nextPlan,
                user: getUserName(change.user),
              })}
            </Typography>
            <Stack divider={<Divider />} spacing={0}>
              <SummaryRow
                label={t('dashboard.users.subscription.currentPlan')}
                value={currentPlan || t('dashboard.users.subscription.none')}
              />
              <SummaryRow label={t('dashboard.users.subscription.newPlan')} value={nextPlan} />
            </Stack>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button disabled={isSubmitting} onClick={onClose}>
          {t('dashboard.users.actions.cancel')}
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={() => {
            onConfirm().catch((err) => {
              logger.error(err);
            });
          }}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          variant="contained"
        >
          {t('dashboard.users.actions.confirmSubscription')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ textAlign: 'right' }} variant="subtitle2">
        {value}
      </Typography>
    </Stack>
  );
}

function ResourcesDialog({
  language,
  onClose,
  user,
}: {
  language: string;
  onClose: () => void;
  user: AdminUser | null;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Dialog fullWidth maxWidth="xs" onClose={onClose} open={Boolean(user)}>
      <DialogTitle>{t('dashboard.users.resourcesDialog.title', { user: user ? getUserName(user) : '' })}</DialogTitle>
      <DialogContent>
        {user ? (
          <Stack divider={<Divider />} spacing={0}>
            {getResources(user, t).map((resource) => (
              <Stack
                direction="row"
                key={resource.key}
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}
              >
                <Typography color="text.secondary" variant="body2">
                  {resource.label}
                </Typography>
                <Typography variant="subtitle2">{formatNumber(resource.value, language)}</Typography>
              </Stack>
            ))}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('dashboard.users.actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function getResources(
  row: AdminUser,
  t: (key: string, options?: Record<string, unknown>) => string
): { key: string; label: string; value: number }[] {
  const counts = row.counts;
  return [
    { key: 'profiles', label: t('dashboard.users.resources.profiles'), value: counts.profiles },
    { key: 'sources', label: t('dashboard.users.resources.sources'), value: counts.sources },
    { key: 'avatars', label: t('dashboard.users.resources.avatars'), value: counts.avatars },
    { key: 'voices', label: t('dashboard.users.resources.voices'), value: counts.voices },
    { key: 'images', label: t('dashboard.users.resources.images'), value: counts.ai_images },
    { key: 'videos', label: t('dashboard.users.resources.videos'), value: counts.ai_videos },
    { key: 'chats', label: t('dashboard.users.resources.chats'), value: counts.chats },
  ];
}

function formatPlanLabel(
  plan: AdminSubscriptionPlan,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return plan.unlimited
    ? t('dashboard.users.subscription.unlimitedPlan', { plan: plan.name })
    : t('dashboard.users.subscription.plan', { interval: plan.interval, plan: plan.name });
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

function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language).format(value);
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

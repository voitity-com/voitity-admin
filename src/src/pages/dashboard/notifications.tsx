'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { ClipboardText as ClipboardTextIcon } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { config } from '@/config';
import { RouterLink } from '@/components/core/link';
import { toast } from '@/components/core/toaster';
import {
  APP_NOTIFICATIONS_CHANGED_EVENT,
  type AppNotification,
  type AppNotificationPage,
  getAppNotifications,
  markAllAppNotificationsAsRead,
  markAppNotificationAsRead,
} from '@/lib/notifications/api-client';

const PER_PAGE = 20;

type KindFilter = 'all' | 'log' | 'notification';
type ReadFilter = 'all' | 'read' | 'unread';

export function Page(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { kind, openId, page, read } = useNotificationSearchParams(searchParams);
  const [notificationsPage, setNotificationsPage] = React.useState<AppNotificationPage | null>(null);
  const [selectedNotification, setSelectedNotification] = React.useState<AppNotification | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<null | string>(null);
  const title = t('dashboard.notificationCenter.pageTitle');

  const updateQuery = React.useCallback(
    (updates: Record<string, null | number | string>): void => {
      const nextSearchParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        const shouldDelete =
          value === null ||
          value === '' ||
          (key === 'page' && value === 1) ||
          (key === 'read' && value === 'all') ||
          (key === 'kind' && value === 'notification');

        if (shouldDelete) {
          nextSearchParams.delete(key);
          return;
        }

        nextSearchParams.set(key, String(value));
      });

      setSearchParams(nextSearchParams);
    },
    [searchParams, setSearchParams]
  );

  const loadNotifications = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextPage = await getAppNotifications({ kind, locale: language, page, perPage: PER_PAGE, read });
      setNotificationsPage(nextPage);
    } catch (err) {
      setError(getErrorMessage(err, t('dashboard.notificationCenter.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [kind, language, page, read, t]);

  React.useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  React.useEffect(() => {
    const handleNotificationsChanged = (): void => {
      void loadNotifications();
    };

    window.addEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);

    return () => {
      window.removeEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    };
  }, [loadNotifications]);

  const handleMarkAllRead = React.useCallback(async (): Promise<void> => {
    try {
      await markAllAppNotificationsAsRead(language, { kind });
      toast.success(t('dashboard.notificationCenter.toasts.markedRead'));
      await loadNotifications();
    } catch (err) {
      toast.error(getErrorMessage(err, t('dashboard.notificationCenter.errors.markRead')));
    }
  }, [kind, language, loadNotifications, t]);

  const updateNotification = React.useCallback((notification: AppNotification): void => {
    setNotificationsPage((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        notifications: current.notifications.map((item) =>
          String(item.id) === String(notification.id) ? { ...item, ...notification } : item
        ),
      };
    });
  }, []);

  const handleOpenNotification = React.useCallback(
    async (notification: AppNotification, options: { updateQuery?: boolean } = {}): Promise<void> => {
      const shouldUpdateQuery = options.updateQuery ?? true;

      setSelectedNotification(notification);

      if (shouldUpdateQuery) {
        updateQuery({ open: notification.id });
      }

      if (notification.read_at) {
        return;
      }

      try {
        const updatedNotification = await markAppNotificationAsRead(notification.id, language);
        const nextNotification = { ...notification, ...updatedNotification };

        setSelectedNotification(nextNotification);
        updateNotification(nextNotification);
      } catch (err) {
        toast.error(getErrorMessage(err, t('dashboard.notificationCenter.errors.markRead')));
      }
    },
    [language, t, updateNotification, updateQuery]
  );

  const handleCloseNotification = React.useCallback((): void => {
    setSelectedNotification(null);
    updateQuery({ open: null });
  }, [updateQuery]);

  React.useEffect(() => {
    if (!openId || loading || !notificationsPage || String(selectedNotification?.id) === openId) {
      return;
    }

    const notification = notificationsPage.notifications.find((item) => String(item.id) === openId);

    if (notification) {
      void handleOpenNotification(notification, { updateQuery: false });
    }
  }, [handleOpenNotification, loading, notificationsPage, openId, selectedNotification]);

  const notifications = notificationsPage?.notifications ?? [];
  const total = notificationsPage?.pagination.total ?? 0;

  return (
    <React.Fragment>
      <Helmet>
        <title>{`${title} | ${config.site.name}`}</title>
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
          <Stack
            direction={{ sm: 'row', xs: 'column' }}
            spacing={3}
            sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
          >
            <Box sx={{ flex: '1 1 auto' }}>
              <Typography variant="h4">{title}</Typography>
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.notificationCenter.subtitle')}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: { sm: 'flex-end', xs: 'flex-start' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <Button
                disabled={(notificationsPage?.unread_count ?? 0) === 0}
                onClick={handleMarkAllRead}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
                variant="outlined"
              >
                {t('dashboard.notificationCenter.actions.markAllRead')}
              </Button>
            </Box>
          </Stack>

          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack
                direction={{ sm: 'row', xs: 'column' }}
                spacing={2}
                sx={{ alignItems: { sm: 'center', xs: 'stretch' }, justifyContent: 'space-between', px: 3, py: 2.5 }}
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle1">{t('dashboard.notificationCenter.cardTitle')}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.notificationCenter.cardSubheader')}
                  </Typography>
                </Stack>
                <Stack
                  direction={{ sm: 'row', xs: 'column' }}
                  spacing={1.5}
                  sx={{ minWidth: { md: 420, sm: 360, xs: '100%' } }}
                >
                  <TextField
                    label={t('dashboard.notificationCenter.filters.kind')}
                    onChange={(event) => {
                      updateQuery({ kind: event.target.value, page: 1 });
                    }}
                    select
                    size="small"
                    value={kind}
                  >
                    <MenuItem value="all">{t('dashboard.notificationCenter.filters.kindOptions.all')}</MenuItem>
                    <MenuItem value="notification">
                      {t('dashboard.notificationCenter.filters.kindOptions.notification')}
                    </MenuItem>
                    <MenuItem value="log">{t('dashboard.notificationCenter.filters.kindOptions.log')}</MenuItem>
                  </TextField>
                  <TextField
                    label={t('dashboard.notificationCenter.filters.read')}
                    onChange={(event) => {
                      updateQuery({ page: 1, read: event.target.value });
                    }}
                    select
                    size="small"
                    value={read}
                  >
                    <MenuItem value="all">{t('dashboard.notificationCenter.filters.readOptions.all')}</MenuItem>
                    <MenuItem value="unread">{t('dashboard.notificationCenter.filters.readOptions.unread')}</MenuItem>
                    <MenuItem value="read">{t('dashboard.notificationCenter.filters.readOptions.read')}</MenuItem>
                  </TextField>
                </Stack>
              </Stack>
              <Divider />

              {loading ? (
                <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : error ? (
                <Box sx={{ p: 3 }}>
                  <Alert severity="error">{error}</Alert>
                </Box>
              ) : notifications.length === 0 ? (
                <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
                  <Typography variant="subtitle1">{t('dashboard.notificationCenter.empty.title')}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.notificationCenter.empty.description')}
                  </Typography>
                </Box>
              ) : (
                <Stack divider={<Divider />} spacing={0}>
                  {notifications.map((notification) => (
                    <NotificationListItem
                      key={notification.id}
                      language={language}
                      notification={notification}
                      onOpen={() => {
                        void handleOpenNotification(notification);
                      }}
                      t={t}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
            <Divider />
            <TablePagination
              component="div"
              count={total}
              labelDisplayedRows={({ count, from, to }) =>
                t('dashboard.notificationCenter.pagination.displayedRows', { count, from, to })
              }
              labelRowsPerPage={t('dashboard.notificationCenter.pagination.rowsPerPage')}
              onPageChange={(_event, nextPage) => {
                updateQuery({ page: nextPage + 1 });
              }}
              page={page - 1}
              rowsPerPage={PER_PAGE}
              rowsPerPageOptions={[PER_PAGE]}
            />
          </Card>
          <NotificationDetailDialog
            language={language}
            notification={selectedNotification}
            onClose={handleCloseNotification}
            t={t}
          />
        </Stack>
      </Box>
    </React.Fragment>
  );
}

interface NotificationListItemProps {
  language: string;
  notification: AppNotification;
  onOpen: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}

function NotificationListItem({ language, notification, onOpen, t }: NotificationListItemProps): React.JSX.Element {
  const unread = !notification.read_at;
  const isLog = notification.kind === 'log';

  return (
    <Box
      component="button"
      onClick={onOpen}
      sx={{
        appearance: 'none',
        bgcolor: unread ? 'background.level1' : 'background.paper',
        border: 0,
        borderLeft: '4px solid',
        borderLeftColor: unread ? 'primary.main' : 'transparent',
        color: 'text.primary',
        cursor: 'pointer',
        display: 'block',
        font: 'inherit',
        px: { sm: 3, xs: 2 },
        py: 1.5,
        textAlign: 'left',
        width: '100%',
        '&:hover': {
          bgcolor: unread ? 'background.level2' : 'action.hover',
        },
      }}
      type="button"
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
        <Avatar
          sx={{
            bgcolor: isLog ? 'action.selected' : unread ? 'primary.main' : 'background.default',
            color: isLog ? 'text.secondary' : unread ? 'primary.contrastText' : 'text.secondary',
            flex: '0 0 auto',
            height: 36,
            width: 36,
          }}
        >
          {isLog ? (
            <ClipboardTextIcon fontSize="var(--icon-fontSize-md)" />
          ) : (
            <BellIcon fontSize="var(--icon-fontSize-md)" />
          )}
        </Avatar>
        <Stack
          direction={{ sm: 'row', xs: 'column' }}
          spacing={{ sm: 2, xs: 1 }}
          sx={{ minWidth: 0, width: '100%' }}
        >
          <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography sx={{ fontWeight: unread ? 700 : 600, minWidth: 0 }} variant="subtitle2">
              {notification.title}
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.55, maxWidth: '72ch' }} variant="body2">
              {notification.body}
            </Typography>
          </Stack>
          <Stack
            spacing={0.75}
            sx={{ alignItems: { sm: 'flex-end', xs: 'flex-start' }, flex: '0 0 auto', minWidth: { sm: 174, xs: 0 } }}
          >
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexWrap: 'wrap', justifyContent: { sm: 'flex-end', xs: 'flex-start' }, rowGap: 0.75 }}
            >
              <Chip
                color={isLog ? 'default' : 'primary'}
                label={t(`dashboard.notificationCenter.kind.${notification.kind}`)}
                size="small"
                sx={{ height: 22 }}
                variant="soft"
              />
              <Chip
                color={unread ? 'warning' : 'default'}
                label={t(`dashboard.notificationCenter.status.${unread ? 'unread' : 'read'}`)}
                size="small"
                sx={{ height: 22 }}
                variant="soft"
              />
            </Stack>
            <Typography color="text.secondary" variant="caption">
              {formatDate(notification.created_at, language)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

interface NotificationDetailDialogProps {
  language: string;
  notification: AppNotification | null;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}

function NotificationDetailDialog({
  language,
  notification,
  onClose,
  t,
}: NotificationDetailDialogProps): React.JSX.Element {
  if (!notification) {
    return <Dialog open={false} />;
  }

  const isLog = notification.kind === 'log';
  const read = Boolean(notification.read_at);

  return (
    <Dialog PaperProps={{ sx: { borderRadius: 2 } }} fullWidth maxWidth="sm" onClose={onClose} open>
      <DialogTitle sx={{ px: 3, py: 2.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Avatar
            sx={{
              bgcolor: isLog ? 'action.selected' : 'primary.main',
              color: isLog ? 'text.secondary' : 'primary.contrastText',
              flex: '0 0 auto',
              height: 40,
              mt: 0.25,
              width: 40,
            }}
          >
            {isLog ? (
              <ClipboardTextIcon fontSize="var(--icon-fontSize-md)" />
            ) : (
              <BellIcon fontSize="var(--icon-fontSize-md)" />
            )}
          </Avatar>
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1">{notification.title}</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Chip
                color={isLog ? 'default' : 'primary'}
                label={t(`dashboard.notificationCenter.kind.${notification.kind}`)}
                size="small"
                variant="soft"
              />
              <Chip
                color={read ? 'default' : 'warning'}
                label={t(`dashboard.notificationCenter.status.${read ? 'read' : 'unread'}`)}
                size="small"
                variant="soft"
              />
            </Stack>
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
        <Stack spacing={2}>
          <Typography color="text.secondary" variant="body2">
            {formatDate(notification.created_at, language)}
          </Typography>
          <Typography variant="body2">{notification.body}</Typography>
          {notification.action_url && notification.action_label ? (
            <div>
              <Link
                component={RouterLink}
                href={notification.action_url}
                onClick={onClose}
                sx={{ fontWeight: 600 }}
                underline="hover"
                variant="body2"
              >
                {notification.action_label}
              </Link>
            </div>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>{t('dashboard.notificationCenter.actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function useNotificationSearchParams(searchParams: URLSearchParams): {
  kind: KindFilter;
  openId: null | string;
  page: number;
  read: ReadFilter;
} {
  const pageParam = Number(searchParams.get('page') ?? '1');
  const kindParam = searchParams.get('kind');
  const openParam = searchParams.get('open');
  const readParam = searchParams.get('read');

  return {
    kind:
      kindParam === 'all' || kindParam === 'notification' || kindParam === 'log' ? kindParam : 'notification',
    openId: openParam?.trim() ? openParam.trim() : null,
    page: Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1,
    read: readParam === 'read' || readParam === 'unread' ? readParam : 'all',
  };
}

function formatDate(value: null | string | undefined, language: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

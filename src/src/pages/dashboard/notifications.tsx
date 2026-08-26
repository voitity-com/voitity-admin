'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { ClipboardText as ClipboardTextIcon } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { config } from '@/config';
import { RouterLink } from '@/components/core/link';
import { toast } from '@/components/core/toaster';
import { useSelection } from '@/hooks/use-selection';
import {
  APP_NOTIFICATIONS_CHANGED_EVENT,
  type AppNotification,
  type AppNotificationGroup,
  type AppNotificationPage,
  getAppNotifications,
  markAppNotificationAsRead,
  markSelectedAppNotificationsAsRead,
} from '@/lib/notifications/api-client';

const PER_PAGE = 20;

type KindFilter = 'all' | 'log' | 'notification';
type ReadFilter = 'all' | 'read' | 'unread';

export function Page(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const timezone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const { kind, openId, page, read } = useNotificationSearchParams(searchParams);
  const [notificationsPage, setNotificationsPage] = React.useState<AppNotificationPage | null>(null);
  const [selectedNotification, setSelectedNotification] = React.useState<AppNotification | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<null | string>(null);
  const [actionsAnchor, setActionsAnchor] = React.useState<HTMLElement | null>(null);
  const [processingSelection, setProcessingSelection] = React.useState(false);
  const notifications = React.useMemo(() => notificationsPage?.notifications ?? [], [notificationsPage]);
  const individualNotifications = React.useMemo(
    () =>
      notifications.flatMap((notification) =>
        notification.type === 'group' ? notification.notifications : [notification]
      ),
    [notifications]
  );
  const notificationIds = React.useMemo(
    () => individualNotifications.map((notification) => notification.id),
    [individualNotifications]
  );
  const { deselectAll, deselectOne, selectAll, selectOne, selected, selectedAll, selectedAny } =
    useSelection(notificationIds);
  const selectedUnreadIds = React.useMemo(
    () =>
      individualNotifications
        .filter((notification) => selected.has(notification.id) && !notification.read_at)
        .map((notification) => notification.id),
    [individualNotifications, selected]
  );
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
      const nextPage = await getAppNotifications({
        groupChats: true,
        kind,
        locale: language,
        page,
        perPage: PER_PAGE,
        read,
        timezone,
      });

      if (page > nextPage.pagination.last_page) {
        updateQuery({ page: nextPage.pagination.last_page });
        return;
      }

      setNotificationsPage(nextPage);
    } catch (err) {
      setError(getErrorMessage(err, t('dashboard.notificationCenter.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [kind, language, page, read, t, timezone, updateQuery]);

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

  const handleMarkSelectedRead = React.useCallback(async (): Promise<void> => {
    if (selectedUnreadIds.length === 0) {
      return;
    }

    setActionsAnchor(null);
    setProcessingSelection(true);

    try {
      const markedReadCount = await markSelectedAppNotificationsAsRead(selectedUnreadIds, language);
      toast.success(t('dashboard.notificationCenter.toasts.markedSelectedRead', { count: markedReadCount }));
      deselectAll();
    } catch (err) {
      toast.error(getErrorMessage(err, t('dashboard.notificationCenter.errors.markRead')));
    } finally {
      setProcessingSelection(false);
    }
  }, [deselectAll, language, selectedUnreadIds, t]);

  const updateNotification = React.useCallback((notification: AppNotification): void => {
    setNotificationsPage((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        notifications: current.notifications.map((item) => {
          if (item.type === 'notification') {
            return String(item.id) === String(notification.id) ? { ...item, ...notification } : item;
          }

          const childWasUnread = item.notifications.some(
            (child) => String(child.id) === String(notification.id) && !child.read_at
          );
          const childNotifications = item.notifications.map((child) =>
            String(child.id) === String(notification.id) ? { ...child, ...notification } : child
          );

          return {
            ...item,
            notifications: childNotifications,
            unread_count: childWasUnread && notification.read_at ? Math.max(0, item.unread_count - 1) : item.unread_count,
          };
        }),
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

    const notification = notificationsPage.notifications
      .flatMap((item) => (item.type === 'group' ? item.notifications : [item]))
      .find((item) => String(item.id) === openId);

    if (notification) {
      void handleOpenNotification(notification, { updateQuery: false });
    }
  }, [handleOpenNotification, loading, notificationsPage, openId, selectedNotification]);

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
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                <Typography variant="h4">{title}</Typography>
                <Chip
                  color={(notificationsPage?.unread_count ?? 0) > 0 ? 'warning' : 'default'}
                  label={t('dashboard.notificationCenter.unreadTotal', {
                    count: notificationsPage?.unread_count ?? 0,
                  })}
                  size="small"
                  variant="soft"
                />
              </Stack>
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.notificationCenter.subtitle')}
              </Typography>
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

              {notifications.length > 0 ? (
                <React.Fragment>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5 }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Checkbox
                        checked={notificationIds.length > 0 ? selectedAll : false}
                        disabled={loading || processingSelection}
                        indeterminate={selectedAny ? !selectedAll : false}
                        inputProps={{ 'aria-label': t('dashboard.notificationCenter.selection.selectAll') }}
                        onChange={(event) => {
                          if (event.target.checked) {
                            selectAll();
                          } else {
                            deselectAll();
                          }
                        }}
                      />
                      <Typography variant="subtitle2">
                        {t('dashboard.notificationCenter.selection.selectAll')}
                      </Typography>
                      {selectedAny ? (
                        <Typography color="text.secondary" variant="body2">
                          {t('dashboard.notificationCenter.selection.selectedCount', { count: selected.size })}
                        </Typography>
                      ) : null}
                    </Stack>
                    <Button
                      aria-controls={actionsAnchor ? 'notification-actions-menu' : undefined}
                      aria-expanded={actionsAnchor ? 'true' : undefined}
                      aria-haspopup="menu"
                      disabled={!selectedAny || processingSelection}
                      endIcon={<CaretDownIcon fontSize="var(--icon-fontSize-sm)" />}
                      onClick={(event) => {
                        setActionsAnchor(event.currentTarget);
                      }}
                      size="small"
                      variant="outlined"
                    >
                      {t('dashboard.notificationCenter.actions.actions')}
                    </Button>
                    <Menu
                      anchorEl={actionsAnchor}
                      id="notification-actions-menu"
                      onClose={() => {
                        setActionsAnchor(null);
                      }}
                      open={Boolean(actionsAnchor)}
                    >
                      <MenuItem
                        disabled={selectedUnreadIds.length === 0 || processingSelection}
                        onClick={() => {
                          void handleMarkSelectedRead();
                        }}
                      >
                        {t('dashboard.notificationCenter.actions.markRead')}
                      </MenuItem>
                    </Menu>
                  </Stack>
                  <Divider />
                </React.Fragment>
              ) : null}

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
                  {notifications.map((notification) =>
                    notification.type === 'group' ? (
                      <ChatNotificationGroupItem
                        group={notification}
                        key={notification.id}
                        language={language}
                        onDeselect={(groupNotificationIds) => {
                          groupNotificationIds.forEach(deselectOne);
                        }}
                        onOpen={(child) => {
                          void handleOpenNotification(child);
                        }}
                        onSelect={(groupNotificationIds) => {
                          groupNotificationIds.forEach(selectOne);
                        }}
                        selected={selected}
                        t={t}
                      />
                    ) : (
                      <NotificationListItem
                        key={notification.id}
                        language={language}
                        notification={notification}
                        onDeselect={() => {
                          deselectOne(notification.id);
                        }}
                        onOpen={() => {
                          void handleOpenNotification(notification);
                        }}
                        onSelect={() => {
                          selectOne(notification.id);
                        }}
                        selected={selected.has(notification.id)}
                        t={t}
                      />
                    )
                  )}
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
              sx={{
                '& .MuiTablePagination-actions': {
                  left: '50%',
                  marginLeft: '0 !important',
                  position: 'absolute',
                  transform: 'translateX(-50%)',
                },
                '& .MuiTablePagination-displayedRows': {
                  display: { sm: 'block', xs: 'none' },
                  margin: 0,
                },
                '& .MuiTablePagination-select, & .MuiTablePagination-selectLabel': {
                  display: 'none',
                },
                '& .MuiTablePagination-spacer': {
                  display: 'none',
                },
                '& .MuiTablePagination-toolbar': {
                  justifyContent: 'flex-start',
                  minHeight: 64,
                  position: 'relative',
                },
              }}
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

interface ChatNotificationGroupItemProps {
  group: AppNotificationGroup;
  language: string;
  onDeselect: (notificationIds: (number | string)[]) => void;
  onOpen: (notification: AppNotification) => void;
  onSelect: (notificationIds: (number | string)[]) => void;
  selected: Set<number | string>;
  t: ReturnType<typeof useTranslation>['t'];
}

function ChatNotificationGroupItem({
  group,
  language,
  onDeselect,
  onOpen,
  onSelect,
  selected,
  t,
}: ChatNotificationGroupItemProps): React.JSX.Element {
  const [expanded, setExpanded] = React.useState(false);
  const selectedCount = group.notification_ids.filter((notificationId) => selected.has(notificationId)).length;
  const selectedAll = group.notification_ids.length > 0 && selectedCount === group.notification_ids.length;
  const selectedAny = selectedCount > 0;
  const unread = group.unread_count > 0;

  return (
    <Box
      sx={{
        bgcolor: unread ? 'background.level1' : 'background.paper',
        borderLeft: '4px solid',
        borderLeftColor: unread ? 'primary.main' : 'transparent',
      }}
    >
      <Stack direction="row" spacing={0} sx={{ alignItems: 'stretch', minWidth: 0 }}>
        <Box sx={{ alignItems: 'flex-start', display: 'flex', pl: { sm: 2, xs: 1 }, pt: 1 }}>
          <Checkbox
            checked={selectedAll}
            indeterminate={selectedAny ? !selectedAll : false}
            inputProps={{
              'aria-label': t('dashboard.notificationCenter.selection.selectChatGroup', {
                profile: group.profile_name ?? '',
              }),
            }}
            onChange={(event) => {
              if (event.target.checked) {
                onSelect(group.notification_ids);
              } else {
                onDeselect(group.notification_ids);
              }
            }}
          />
        </Box>
        <Box sx={{ flex: '1 1 auto', minWidth: 0, pl: 1, pr: { sm: 3, xs: 2 }, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
            <Avatar
              sx={{
                bgcolor: unread ? 'primary.main' : 'background.default',
                color: unread ? 'primary.contrastText' : 'text.secondary',
                flex: '0 0 auto',
                height: 36,
                width: 36,
              }}
            >
              <ChatsCircleIcon fontSize="var(--icon-fontSize-md)" />
            </Avatar>
            <Stack
              direction={{ md: 'row', xs: 'column' }}
              spacing={{ md: 2, xs: 1 }}
              sx={{ minWidth: 0, width: '100%' }}
            >
              <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
                <Typography sx={{ fontWeight: unread ? 700 : 600 }} variant="subtitle2">
                  {t('dashboard.notificationCenter.chatGroup.title')}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('dashboard.notificationCenter.chatGroup.summary', {
                    count: group.count,
                    profile: group.profile_name ?? t('dashboard.notificationCenter.chatGroup.unknownProfile'),
                  })}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', pt: 0.25, rowGap: 1 }}>
                  <Button
                    endIcon={
                      expanded ? (
                        <CaretDownIcon fontSize="var(--icon-fontSize-sm)" />
                      ) : (
                        <CaretRightIcon fontSize="var(--icon-fontSize-sm)" />
                      )
                    }
                    onClick={() => {
                      setExpanded((current) => !current);
                    }}
                    size="small"
                    variant="text"
                  >
                    {t(
                      expanded
                        ? 'dashboard.notificationCenter.chatGroup.hideChats'
                        : 'dashboard.notificationCenter.chatGroup.showChats',
                      { count: group.count }
                    )}
                  </Button>
                  {group.action_url ? (
                    <Link
                      component={RouterLink}
                      href={group.action_url}
                      sx={{ fontWeight: 600 }}
                      underline="hover"
                      variant="body2"
                    >
                      {t('dashboard.notificationCenter.chatGroup.viewAll')}
                    </Link>
                  ) : null}
                </Stack>
              </Stack>
              <Stack
                spacing={0.75}
                sx={{
                  alignItems: { md: 'flex-end', xs: 'flex-start' },
                  flex: '0 0 auto',
                  minWidth: { md: 190, xs: 0 },
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ flexWrap: 'wrap', justifyContent: { md: 'flex-end', xs: 'flex-start' }, rowGap: 0.75 }}
                >
                  <Chip
                    color="primary"
                    label={t('dashboard.notificationCenter.chatGroup.chatCount', { count: group.count })}
                    size="small"
                    sx={{ height: 22 }}
                    variant="soft"
                  />
                  <Chip
                    color={unread ? 'warning' : 'default'}
                    label={t('dashboard.notificationCenter.chatGroup.unreadCount', { count: group.unread_count })}
                    size="small"
                    sx={{ height: 22 }}
                    variant="soft"
                  />
                </Stack>
                <Typography color="text.secondary" variant="caption">
                  {formatDate(group.created_at, language)}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Stack>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <Stack divider={<Divider />} spacing={0} sx={{ bgcolor: 'background.paper', ml: { sm: 7, xs: 2 } }}>
          {group.notifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              language={language}
              notification={notification}
              onDeselect={() => {
                onDeselect([notification.id]);
              }}
              onOpen={() => {
                onOpen(notification);
              }}
              onSelect={() => {
                onSelect([notification.id]);
              }}
              selected={selected.has(notification.id)}
              t={t}
            />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

interface NotificationListItemProps {
  language: string;
  notification: AppNotification;
  onDeselect: () => void;
  onOpen: () => void;
  onSelect: () => void;
  selected: boolean;
  t: ReturnType<typeof useTranslation>['t'];
}

function NotificationListItem({
  language,
  notification,
  onDeselect,
  onOpen,
  onSelect,
  selected,
  t,
}: NotificationListItemProps): React.JSX.Element {
  const unread = !notification.read_at;
  const isLog = notification.kind === 'log';

  return (
    <Box
      sx={{
        bgcolor: unread ? 'background.level1' : 'background.paper',
        borderLeft: '4px solid',
        borderLeftColor: unread ? 'primary.main' : 'transparent',
        color: 'text.primary',
        width: '100%',
        '&:hover': {
          bgcolor: unread ? 'background.level2' : 'action.hover',
        },
      }}
    >
      <Stack direction="row" spacing={0} sx={{ alignItems: 'stretch', minWidth: 0 }}>
        <Box sx={{ alignItems: 'flex-start', display: 'flex', pl: { sm: 2, xs: 1 }, pt: 1 }}>
          <Checkbox
            checked={selected}
            inputProps={{
              'aria-label': t('dashboard.notificationCenter.selection.selectOne', { title: notification.title }),
            }}
            onChange={(event) => {
              if (event.target.checked) {
                onSelect();
              } else {
                onDeselect();
              }
            }}
          />
        </Box>
        <Box
          component="button"
          onClick={onOpen}
          sx={{
            appearance: 'none',
            bgcolor: 'transparent',
            border: 0,
            color: 'text.primary',
            cursor: 'pointer',
            flex: '1 1 auto',
            font: 'inherit',
            minWidth: 0,
            pl: 1,
            pr: { sm: 3, xs: 2 },
            py: 1.5,
            textAlign: 'left',
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
                sx={{
                  alignItems: { sm: 'flex-end', xs: 'flex-start' },
                  flex: '0 0 auto',
                  minWidth: { sm: 174, xs: 0 },
                }}
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

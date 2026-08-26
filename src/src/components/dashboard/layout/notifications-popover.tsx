'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { ShieldWarning as ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { paths } from '@/paths';
import { toast } from '@/components/core/toaster';
import { RouterLink } from '@/components/core/link';
import {
  type AppNotification,
  getAppNotifications,
  markAppNotificationAsRead,
  markBellNotificationsAsRead,
} from '@/lib/notifications/api-client';

export interface NotificationsPopoverProps {
  anchorEl: null | Element;
  onChanged?: (unreadCount: number) => void;
  onClose?: () => void;
  open?: boolean;
}

export function NotificationsPopover({
  anchorEl,
  onChanged,
  onClose,
  open = false,
}: NotificationsPopoverProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<null | string>(null);

  const loadNotifications = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await getAppNotifications({ locale: language, perPage: 20, scope: 'bell' });

      setNotifications(
        page.notifications.flatMap((notification) =>
          notification.type === 'group' ? notification.notifications : [notification]
        )
      );
      setUnreadCount(page.unread_count);
      onChanged?.(page.unread_count);
    } catch (err) {
      setError(getErrorMessage(err, t('dashboard.notifications.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [language, onChanged, t]);

  React.useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [loadNotifications, open]);

  const handleMarkAllAsRead = React.useCallback(async () => {
    try {
      await markBellNotificationsAsRead(language);
      setNotifications([]);
      setUnreadCount(0);
      onChanged?.(0);
      toast.success(t('dashboard.notifications.toasts.markedRead'));
    } catch (err) {
      toast.error(getErrorMessage(err, t('dashboard.notifications.errors.markRead')));
    }
  }, [language, onChanged, t]);

  const handleMarkAsRead = React.useCallback(
    async (notification: AppNotification) => {
      try {
        await markAppNotificationAsRead(notification.id, language);
        setNotifications((current) => current.filter((item) => item.id !== notification.id));

        if (!notification.read_at) {
          const nextUnreadCount = Math.max(0, unreadCount - 1);

          setUnreadCount(nextUnreadCount);
          onChanged?.(nextUnreadCount);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, t('dashboard.notifications.errors.markRead')));
      }
    },
    [language, onChanged, t, unreadCount]
  );

  const handleOpenNotification = React.useCallback(
    (notification: AppNotification): void => {
      onClose?.();
      navigate(`${paths.dashboard.notifications}?open=${encodeURIComponent(String(notification.id))}`);
    },
    [navigate, onClose]
  );

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      onClose={onClose}
      open={open}
      slotProps={{ paper: { sx: { width: { sm: '420px', xs: 'calc(100vw - 32px)' } } } }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="h6">{t('dashboard.notifications.title')}</Typography>
          <Typography color="text.secondary" variant="caption">
            {t('dashboard.notifications.unreadCount', { count: unreadCount })}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button component={RouterLink} href={paths.dashboard.notifications} size="small" variant="text">
            {t('dashboard.notifications.actions.viewAll')}
          </Button>
          <Button disabled={unreadCount === 0 || loading} onClick={handleMarkAllAsRead} size="small" variant="text">
            {t('dashboard.notifications.actions.markAllRead')}
          </Button>
        </Stack>
      </Stack>
      {loading ? (
        <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2 }}>
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2">{t('dashboard.notifications.empty')}</Typography>
        </Box>
      ) : (
        <Box sx={{ maxHeight: '360px', overflowY: 'auto' }}>
          <List disablePadding>
            {notifications.map((notification, index) => (
              <NotificationItem
                divider={index < notifications.length - 1}
                key={notification.id}
                language={language}
                notification={notification}
                onMarkRead={() => {
                  void handleMarkAsRead(notification);
                }}
                onOpen={() => {
                  handleOpenNotification(notification);
                }}
                t={t}
              />
            ))}
          </List>
        </Box>
      )}
    </Popover>
  );
}

interface NotificationItemProps {
  divider?: boolean;
  language: string;
  notification: AppNotification;
  onMarkRead?: () => void;
  onOpen: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}

function NotificationItem({
  divider,
  language,
  notification,
  onMarkRead,
  onOpen,
  t,
}: NotificationItemProps): React.JSX.Element {
  const unread = !notification.read_at;
  const Icon = iconForCategory(notification.category);

  return (
    <ListItem
      divider={divider}
      sx={{ alignItems: 'flex-start', gap: 2, justifyContent: 'space-between', py: 2 }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
        <Avatar
          sx={{
            bgcolor: unread ? 'primary.main' : 'action.selected',
            color: unread ? 'primary.contrastText' : 'text.secondary',
          }}
        >
          <Icon fontSize="var(--Icon-fontSize)" />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Box
            component="button"
            onClick={onOpen}
            sx={{
              appearance: 'none',
              bgcolor: 'transparent',
              border: 0,
              cursor: 'pointer',
              display: 'block',
              p: 0,
              textAlign: 'left',
              width: '100%',
              '&:hover .notification-title': { textDecoration: 'underline' },
            }}
            type="button"
          >
            <Typography className="notification-title" variant="subtitle2">
              {notification.title}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {notification.body}
            </Typography>
            <Typography color="text.secondary" display="block" variant="caption">
              {formatDate(notification.created_at, language)}
            </Typography>
          </Box>
          <Button
            onClick={onMarkRead}
            size="small"
            sx={{ mt: 0.5, px: 0 }}
            variant="text"
          >
            {t('dashboard.notifications.actions.markRead')}
          </Button>
        </Box>
      </Stack>
    </ListItem>
  );
}

function iconForCategory(category: null | string | undefined): typeof BellIcon {
  if (category === 'billing') {
    return CreditCardIcon;
  }

  if (category === 'security' || category === 'admin' || category === 'system') {
    return ShieldWarningIcon;
  }

  if (category === 'profile' || category === 'account') {
    return UserIcon;
  }

  return BellIcon;
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
  }).format(date);
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

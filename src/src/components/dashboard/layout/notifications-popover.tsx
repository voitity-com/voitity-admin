'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { ShieldWarning as ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components/core/toaster';
import { RouterLink } from '@/components/core/link';
import {
  type AppNotification,
  dismissAppNotification,
  getAppNotifications,
  markAllAppNotificationsAsRead,
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
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<null | string>(null);

  const loadNotifications = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await getAppNotifications({ locale: language, perPage: 20 });

      setNotifications(page.notifications);
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
      await markAllAppNotificationsAsRead(language);
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      onChanged?.(0);
      toast.success(t('dashboard.notifications.toasts.markedRead'));
    } catch (err) {
      toast.error(getErrorMessage(err, t('dashboard.notifications.errors.markRead')));
    }
  }, [language, onChanged, t]);

  const handleDismiss = React.useCallback(
    async (notification: AppNotification) => {
      try {
        await dismissAppNotification(notification.id, language);
        setNotifications((current) => current.filter((item) => item.id !== notification.id));

        if (!notification.read_at) {
          const nextUnreadCount = Math.max(0, unreadCount - 1);

          setUnreadCount(nextUnreadCount);
          onChanged?.(nextUnreadCount);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, t('dashboard.notifications.errors.dismiss')));
      }
    },
    [language, onChanged, t, unreadCount]
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
        <Tooltip title={t('dashboard.notifications.actions.markAllRead')}>
          <span>
            <IconButton
              aria-label={t('dashboard.notifications.actions.markAllRead')}
              disabled={unreadCount === 0 || loading}
              edge="end"
              onClick={handleMarkAllAsRead}
            >
              <CheckCircleIcon />
            </IconButton>
          </span>
        </Tooltip>
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
                onDismiss={() => {
                  void handleDismiss(notification);
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
  onDismiss?: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}

function NotificationItem({ divider, language, notification, onDismiss, t }: NotificationItemProps): React.JSX.Element {
  const unread = !notification.read_at;
  const Icon = iconForCategory(notification.category);

  return (
    <ListItem divider={divider} sx={{ alignItems: 'flex-start', gap: 2, justifyContent: 'space-between', py: 2 }}>
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
          <Typography variant="subtitle2">{notification.title}</Typography>
          <Typography color="text.secondary" variant="body2">
            {notification.body}
          </Typography>
          {notification.action_url && notification.action_label ? (
            <Link component={RouterLink} href={notification.action_url} underline="hover" variant="body2">
              {notification.action_label}
            </Link>
          ) : null}
          <Typography color="text.secondary" display="block" variant="caption">
            {formatDate(notification.created_at, language)}
          </Typography>
        </Box>
      </Stack>
      <Tooltip title={t('dashboard.notifications.actions.dismiss')}>
        <IconButton edge="end" onClick={onDismiss} size="small">
          <XIcon />
        </IconButton>
      </Tooltip>
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

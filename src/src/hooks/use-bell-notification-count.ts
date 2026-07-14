'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { getSupportedLanguage } from '@/lib/i18n';
import { APP_NOTIFICATIONS_CHANGED_EVENT, getAppNotifications } from '@/lib/notifications/api-client';

export function useBellNotificationCount(): { refresh: () => Promise<void>; unreadCount: number } {
  const { i18n } = useTranslation();
  const language = getSupportedLanguage(i18n.language);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const refresh = React.useCallback(async (): Promise<void> => {
    try {
      const page = await getAppNotifications({ locale: language, perPage: 1, scope: 'bell' });

      setUnreadCount(page.unread_count);
    } catch {
      setUnreadCount(0);
    }
  }, [language]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const handleNotificationsChanged = (): void => {
      void refresh();
    };

    window.addEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);

    return () => {
      window.removeEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    };
  }, [refresh]);

  return { refresh, unreadCount };
}

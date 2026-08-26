import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface RequestOptions {
  body?: unknown;
  locale?: string;
  method: 'DELETE' | 'GET' | 'PATCH';
}

export interface NotificationPreference {
  channel: string;
  default_enabled: boolean;
  enabled: boolean;
  key: string;
}

export interface AppNotification {
  action_label?: null | string;
  action_url?: null | string;
  body: string;
  category?: null | string;
  created_at?: null | string;
  dismissed_at?: null | string;
  id: number | string;
  key: string;
  kind: 'log' | 'notification';
  read_at?: null | string;
  title: string;
  type: 'notification';
  visible_in_bell: boolean;
}

export interface AppNotificationGroup {
  action_url?: null | string;
  category?: null | string;
  count: number;
  created_at?: null | string;
  id: string;
  key: 'new_chat_received';
  kind: 'notification';
  notification_ids: (number | string)[];
  notifications: AppNotification[];
  profile_id?: null | number | string;
  profile_name?: null | string;
  type: 'group';
  unread_count: number;
  visible_in_bell: boolean;
}

export type AppNotificationFeedItem = AppNotification | AppNotificationGroup;

export interface AppNotificationPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AppNotificationPage {
  notifications: AppNotificationFeedItem[];
  pagination: AppNotificationPagination;
  unread_count: number;
}

export class NotificationPreferencesApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'NotificationPreferencesApiError';
    this.status = status;
  }
}

export const APP_NOTIFICATIONS_CHANGED_EVENT = 'bigmelo:app-notifications-changed';

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const response = await requestJson<unknown>('/api/notification-preferences', { method: 'GET' });

  return normalizePreferences(response);
}

export async function updateNotificationPreferences(
  preferences: Record<string, boolean>
): Promise<NotificationPreference[]> {
  const response = await requestJson<unknown>('/api/notification-preferences', {
    body: { preferences },
    method: 'PATCH',
  });

  return normalizePreferences(response);
}

export async function getAppNotifications(
  params: {
    groupChats?: boolean;
    kind?: 'all' | 'log' | 'notification';
    locale?: string;
    page?: number;
    perPage?: number;
    read?: 'all' | 'read' | 'unread';
    scope?: 'all' | 'bell';
    timezone?: string;
  } = {}
): Promise<AppNotificationPage> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
  });

  if (params.locale) {
    query.set('locale', params.locale);
  }

  if (params.groupChats) {
    query.set('group_chats', '1');
  }

  if (params.scope && params.scope !== 'all') {
    query.set('scope', params.scope);
  }

  if (params.kind && params.kind !== 'all') {
    query.set('kind', params.kind);
  }

  if (params.read && params.read !== 'all') {
    query.set('read', params.read);
  }

  if (params.timezone) {
    query.set('timezone', params.timezone);
  }

  const response = await requestJson<unknown>(`/api/notifications?${query.toString()}`, {
    locale: params.locale,
    method: 'GET',
  });

  return normalizeAppNotificationPage(response);
}

export async function markAllAppNotificationsAsRead(
  locale?: string,
  params: { kind?: 'all' | 'log' | 'notification'; scope?: 'all' | 'bell' } = {}
): Promise<void> {
  const query = new URLSearchParams();

  if (locale) {
    query.set('locale', locale);
  }

  if (params.scope && params.scope !== 'all') {
    query.set('scope', params.scope);
  }

  if (params.kind && params.kind !== 'all') {
    query.set('kind', params.kind);
  }

  const queryString = query.toString();

  await requestJson<unknown>(`/api/notifications/read-all${queryString ? `?${queryString}` : ''}`, {
    locale,
    method: 'PATCH',
  });
  dispatchAppNotificationsChanged();
}

export async function markBellNotificationsAsRead(locale?: string): Promise<void> {
  const query = new URLSearchParams({ scope: 'bell' });

  if (locale) {
    query.set('locale', locale);
  }

  await requestJson<unknown>(`/api/notifications/read-all?${query.toString()}`, { locale, method: 'PATCH' });
  dispatchAppNotificationsChanged();
}

export async function markAppNotificationAsRead(id: number | string, locale?: string): Promise<AppNotification> {
  const response = await requestJson<unknown>(`/api/notifications/${id}/read`, { locale, method: 'PATCH' });

  const notification = normalizeAppNotification(getResponseData(response)) ?? normalizeEmptyNotification(id);

  dispatchAppNotificationsChanged();

  return notification;
}

export async function markSelectedAppNotificationsAsRead(
  notificationIds: (number | string)[],
  locale?: string
): Promise<number> {
  if (notificationIds.length === 0) {
    return 0;
  }

  const chunks = Array.from({ length: Math.ceil(notificationIds.length / 50) }, (_value, index) =>
    notificationIds.slice(index * 50, index * 50 + 50)
  );

  try {
    const responses = await Promise.all(
      chunks.map((chunk) =>
        requestJson<unknown>('/api/notifications/read', {
          body: { notification_ids: chunk },
          locale,
          method: 'PATCH',
        })
      )
    );

    return responses.reduce<number>((markedReadCount, response) => {
      const data = getResponseData(response);
      const responseCount = isRecord(data) ? getNumber(data.marked_read_count, 0) : 0;

      return markedReadCount + responseCount;
    }, 0);
  } finally {
    dispatchAppNotificationsChanged();
  }
}

export async function dismissAppNotification(id: number | string, locale?: string): Promise<void> {
  await requestJson<unknown>(`/api/notifications/${id}`, { locale, method: 'DELETE' });
  dispatchAppNotificationsChanged();
}

function normalizePreferences(response: unknown): NotificationPreference[] {
  const payload = isRecord(response) && isRecord(response.data) ? response.data : response;

  if (!isRecord(payload)) {
    return [];
  }

  const preferences = payload.preferences;

  if (!Array.isArray(preferences)) {
    return [];
  }

  return preferences.map(normalizePreference).filter(isNotificationPreference);
}

function normalizeAppNotificationPage(response: unknown): AppNotificationPage {
  const data = getResponseData(response);

  if (!isRecord(data)) {
    return emptyNotificationPage();
  }

  const notifications = Array.isArray(data.notifications)
    ? data.notifications.map(normalizeAppNotificationFeedItem).filter(isAppNotificationFeedItem)
    : [];

  return {
    notifications,
    pagination: normalizePagination(data.pagination),
    unread_count: typeof data.unread_count === 'number' ? data.unread_count : 0,
  };
}

function normalizePagination(value: unknown): AppNotificationPagination {
  if (!isRecord(value)) {
    return { current_page: 1, last_page: 1, per_page: 20, total: 0 };
  }

  return {
    current_page: getNumber(value.current_page, 1),
    last_page: getNumber(value.last_page, 1),
    per_page: getNumber(value.per_page, 20),
    total: getNumber(value.total, 0),
  };
}

function normalizeAppNotification(value: unknown): AppNotification | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'number' || typeof value.id === 'string' ? value.id : null;
  const key = getString(value.key);
  const title = getString(value.title);
  const body = getString(value.body);

  if (id === null || !key || !title || !body) {
    return null;
  }

  return {
    action_label: getNullableString(value.action_label),
    action_url: getNullableString(value.action_url),
    body,
    category: getNullableString(value.category),
    created_at: getNullableString(value.created_at),
    dismissed_at: getNullableString(value.dismissed_at),
    id,
    key,
    kind: value.kind === 'log' ? 'log' : 'notification',
    read_at: getNullableString(value.read_at),
    title,
    type: 'notification',
    visible_in_bell: typeof value.visible_in_bell === 'boolean' ? value.visible_in_bell : true,
  };
}

function normalizeAppNotificationFeedItem(value: unknown): AppNotificationFeedItem | null {
  if (isRecord(value) && value.type === 'group') {
    return normalizeAppNotificationGroup(value);
  }

  return normalizeAppNotification(value);
}

function normalizeAppNotificationGroup(value: Record<string, unknown>): AppNotificationGroup | null {
  const id = getString(value.id);
  const notifications = Array.isArray(value.notifications)
    ? value.notifications.map(normalizeAppNotification).filter(isAppNotification)
    : [];
  const notificationIds = Array.isArray(value.notification_ids)
    ? value.notification_ids.filter(isNotificationId)
    : notifications.map((notification) => notification.id);

  if (!id || value.key !== 'new_chat_received' || notifications.length === 0 || notificationIds.length === 0) {
    return null;
  }

  return {
    action_url: getNullableString(value.action_url),
    category: getNullableString(value.category),
    count: getNumber(value.count, notifications.length),
    created_at: getNullableString(value.created_at),
    id,
    key: 'new_chat_received',
    kind: 'notification',
    notification_ids: notificationIds,
    notifications,
    profile_id:
      typeof value.profile_id === 'number' || typeof value.profile_id === 'string' ? value.profile_id : null,
    profile_name: getNullableString(value.profile_name),
    type: 'group',
    unread_count: getNumber(
      value.unread_count,
      notifications.filter((notification) => !notification.read_at).length
    ),
    visible_in_bell: typeof value.visible_in_bell === 'boolean' ? value.visible_in_bell : true,
  };
}

function isAppNotification(value: AppNotification | null): value is AppNotification {
  return value !== null;
}

function isAppNotificationFeedItem(value: AppNotificationFeedItem | null): value is AppNotificationFeedItem {
  return value !== null;
}

function isNotificationId(value: unknown): value is number | string {
  return typeof value === 'number' || (typeof value === 'string' && Boolean(value.trim()));
}

function normalizePreference(value: unknown): NotificationPreference | null {
  if (!isRecord(value)) {
    return null;
  }

  const key = getString(value.key);
  const channel = getString(value.channel);

  if (!key || !channel || typeof value.enabled !== 'boolean' || typeof value.default_enabled !== 'boolean') {
    return null;
  }

  return {
    channel,
    default_enabled: value.default_enabled,
    enabled: value.enabled,
    key,
  };
}

function isNotificationPreference(value: NotificationPreference | null): value is NotificationPreference {
  return value !== null;
}

async function requestJson<T>(path: string, options: RequestOptions): Promise<T> {
  const baseUrl = config.api?.baseUrl;
  const token = getStoredApiToken();

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL env variable');
  }

  if (!token) {
    throw new Error('Missing API access token');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (options.locale) {
    headers['X-Locale'] = options.locale;
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    headers,
    method: options.method,
  });

  if (!response.ok) {
    throw new NotificationPreferencesApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getNullableString(value: unknown): null | string {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getResponseData(response: unknown): unknown {
  return isRecord(response) && 'data' in response ? response.data : response;
}

function emptyNotificationPage(): AppNotificationPage {
  return {
    notifications: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    unread_count: 0,
  };
}

function normalizeEmptyNotification(id: number | string): AppNotification {
  return {
    body: '',
    id,
    key: '',
    kind: 'notification',
    title: '',
    type: 'notification',
    visible_in_bell: false,
  };
}

function dispatchAppNotificationsChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(APP_NOTIFICATIONS_CHANGED_EVENT));
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { errors?: Record<string, string[]>; message?: string };

    if (json.message) {
      return json.message;
    }

    const firstError = Object.values(json.errors ?? {})[0]?.[0];

    if (firstError) {
      return firstError;
    }
  } catch {
    // Fall through to generic message.
  }

  return 'Notification preferences request failed';
}

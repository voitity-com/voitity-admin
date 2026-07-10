import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface RequestOptions {
  body?: unknown;
  method: 'GET' | 'PATCH';
}

export interface NotificationPreference {
  channel: string;
  default_enabled: boolean;
  enabled: boolean;
  key: string;
}

export class NotificationPreferencesApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'NotificationPreferencesApiError';
    this.status = status;
  }
}

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

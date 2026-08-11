import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface RequestOptions {
  body?: unknown;
  method?: 'GET' | 'PATCH';
}

export interface ProfileWidgetSettings {
  avatarUrl: null | string;
  available: boolean;
  createdAt: null | string;
  enabled: boolean;
  launcherLabel: string;
  profileActive: boolean;
  profileStatus: null | string;
  publicKey: string;
  updatedAt: null | string;
}

export class ProfileWidgetApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'ProfileWidgetApiError';
    this.status = status;
  }
}

export async function getProfileWidget(profileId: number | string): Promise<ProfileWidgetSettings> {
  const response = await requestJson<ApiEnvelope<{ widget: unknown }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/widget`,
    { method: 'GET' }
  );

  return normalizeWidget(response.data.widget);
}

export async function updateProfileWidget(
  profileId: number | string,
  enabled: boolean
): Promise<ProfileWidgetSettings> {
  const response = await requestJson<ApiEnvelope<{ widget: unknown }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/widget`,
    { body: { enabled }, method: 'PATCH' }
  );

  return normalizeWidget(response.data.widget);
}

function normalizeWidget(value: unknown): ProfileWidgetSettings {
  const widget = isRecord(value) ? value : {};

  return {
    avatarUrl: optionalString(widget.avatar_url),
    available: widget.available === true,
    createdAt: optionalString(widget.created_at),
    enabled: widget.enabled === true,
    launcherLabel: stringValue(widget.launcher_label),
    profileActive: widget.profile_active === true,
    profileStatus: optionalString(widget.profile_status),
    publicKey: stringValue(widget.public_key),
    updatedAt: optionalString(widget.updated_at),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown): null | string {
  const normalized = stringValue(value).trim();
  return normalized || null;
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
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body,
    cache: options.method === 'GET' ? 'no-store' : undefined,
    headers,
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new ProfileWidgetApiError(await errorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { errors?: Record<string, string[]>; message?: string };
    return payload.message ?? Object.values(payload.errors ?? {})[0]?.[0] ?? 'Widget request failed';
  } catch {
    return 'Widget request failed';
  }
}

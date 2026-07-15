import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface RequestOptions {
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'POST' | 'PUT';
}

export interface ProfileIntegration {
  expires_at?: null | string;
  id: number | string;
  last_synced_at?: null | string;
  media_count?: number;
  metadata?: null | Record<string, unknown>;
  provider: string;
  provider_user_id?: null | string;
  selected_media_count?: number;
  status?: null | string;
  username?: null | string;
}

export interface InstagramMedia {
  caption?: null | string;
  id: number | string;
  media_type?: null | string;
  media_url?: null | string;
  observation?: null | string;
  permalink?: null | string;
  provider_media_id?: null | string;
  selected: boolean;
  taken_at?: null | string;
  thumbnail_url?: null | string;
}

export interface InstagramMediaPage {
  integration: null | ProfileIntegration;
  media: InstagramMedia[];
  oauth?: InstagramOAuthDiagnostics | null;
  selection_limit: number;
}

export interface InstagramOAuthDiagnostics {
  redirect_host?: null | string;
  redirect_uri?: null | string;
  uses_local_redirect?: boolean;
}

export interface InstagramConnectUrl {
  oauth?: InstagramOAuthDiagnostics | null;
  url: string;
}

export class IntegrationApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'IntegrationApiError';
    this.status = status;
  }
}

export async function createInstagramConnectUrl(profileId: number | string): Promise<InstagramConnectUrl> {
  const response = await requestJson<ApiEnvelope<Partial<InstagramConnectUrl>> | Partial<InstagramConnectUrl>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/integrations/instagram/connect-url`,
    { method: 'POST' }
  );
  const data = isApiEnvelope<Partial<InstagramConnectUrl>>(response) ? response.data : response;

  if (!data.url) {
    throw new Error('The API did not return an Instagram connection URL.');
  }

  return { oauth: data.oauth ?? null, url: data.url };
}

export async function getInstagramMedia(profileId: number | string): Promise<InstagramMediaPage> {
  const response = await requestJson<ApiEnvelope<InstagramMediaPage> | InstagramMediaPage>(
    `/api/profile/${encodeURIComponent(String(profileId))}/integrations/instagram/media`,
    { method: 'GET' }
  );

  return normalizeInstagramMediaPage(isApiEnvelope<InstagramMediaPage>(response) ? response.data : response);
}

export async function syncInstagramMedia(profileId: number | string): Promise<ProfileIntegration> {
  const response = await requestJson<
    ApiEnvelope<{ integration?: ProfileIntegration; synced_count?: number }> | { integration?: ProfileIntegration }
  >(`/api/profile/${encodeURIComponent(String(profileId))}/integrations/instagram/sync`, { method: 'POST' });
  const data = isApiEnvelope<{ integration?: ProfileIntegration }>(response) ? response.data : response;

  if (!data.integration) {
    throw new Error('The API did not return the Instagram integration.');
  }

  return data.integration;
}

export async function updateInstagramMediaSelection(
  profileId: number | string,
  media: Pick<InstagramMedia, 'id' | 'observation' | 'selected'>[]
): Promise<InstagramMediaPage> {
  const response = await requestJson<ApiEnvelope<InstagramMediaPage> | InstagramMediaPage>(
    `/api/profile/${encodeURIComponent(String(profileId))}/integrations/instagram/media-selection`,
    {
      body: { media },
      method: 'PUT',
    }
  );

  return normalizeInstagramMediaPage(isApiEnvelope<InstagramMediaPage>(response) ? response.data : response);
}

export async function disconnectInstagram(profileId: number | string): Promise<void> {
  await requestJson(`/api/profile/${encodeURIComponent(String(profileId))}/integrations/instagram`, {
    method: 'DELETE',
  });
}

function normalizeInstagramMediaPage(value: InstagramMediaPage): InstagramMediaPage {
  return {
    integration: value.integration ?? null,
    media: Array.isArray(value.media) ? value.media : [],
    oauth: value.oauth ?? null,
    selection_limit: Number(value.selection_limit || 10),
  };
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
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: options.method === 'GET' || !options.method ? 'no-store' : undefined,
    headers,
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new IntegrationApiError(await getErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function isApiEnvelope<T>(response: unknown): response is ApiEnvelope<T> {
  return typeof response === 'object' && response !== null && 'data' in response;
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
    // Fall through.
  }

  return 'Integration request failed';
}

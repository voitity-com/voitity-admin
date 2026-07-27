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

export type IntegrationProvider = 'instagram' | 'tiktok';

export interface ProfileIntegration {
  expires_at?: null | string;
  id: number | string;
  last_synced_at?: null | string;
  media_count?: number;
  metadata?: null | Record<string, unknown>;
  provider: string;
  provider_user_id?: null | string;
  refresh_expires_at?: null | string;
  selected_media_count?: number;
  status?: null | string;
  username?: null | string;
}

export interface IntegrationMedia {
  caption?: null | string;
  id: number | string;
  media_type?: null | string;
  media_url?: null | string;
  observation?: null | string;
  permalink?: null | string;
  provider?: null | string;
  provider_media_id?: null | string;
  selected: boolean;
  taken_at?: null | string;
  thumbnail_url?: null | string;
}

export interface IntegrationMediaPage {
  integration: null | ProfileIntegration;
  media: IntegrationMedia[];
  oauth?: IntegrationOAuthDiagnostics | null;
  selection_limit: number;
}

export interface IntegrationOAuthDiagnostics {
  redirect_host?: null | string;
  redirect_uri?: null | string;
  uses_local_redirect?: boolean;
}

export interface IntegrationConnectUrl {
  oauth?: IntegrationOAuthDiagnostics | null;
  url: string;
}

export type InstagramMedia = IntegrationMedia;
export type InstagramMediaPage = IntegrationMediaPage;
export type InstagramOAuthDiagnostics = IntegrationOAuthDiagnostics;
export type InstagramConnectUrl = IntegrationConnectUrl;

export class IntegrationApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'IntegrationApiError';
    this.status = status;
  }
}

export async function createIntegrationConnectUrl(
  profileId: number | string,
  provider: IntegrationProvider
): Promise<IntegrationConnectUrl> {
  const response = await requestJson<ApiEnvelope<Partial<IntegrationConnectUrl>> | Partial<IntegrationConnectUrl>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/integrations/${provider}/connect-url`,
    { method: 'POST' }
  );
  const data = isApiEnvelope<Partial<IntegrationConnectUrl>>(response) ? response.data : response;

  if (!data.url) {
    throw new Error(`The API did not return a ${providerLabel(provider)} connection URL.`);
  }

  return { oauth: data.oauth ?? null, url: data.url };
}

export async function getIntegrationMedia(
  profileId: number | string,
  provider: IntegrationProvider
): Promise<IntegrationMediaPage> {
  const response = await requestJson<ApiEnvelope<IntegrationMediaPage> | IntegrationMediaPage>(
    `/api/profile/${encodeURIComponent(String(profileId))}/integrations/${provider}/media`,
    { method: 'GET' }
  );

  return normalizeIntegrationMediaPage(isApiEnvelope<IntegrationMediaPage>(response) ? response.data : response);
}

export async function syncIntegrationMedia(
  profileId: number | string,
  provider: IntegrationProvider
): Promise<ProfileIntegration> {
  const response = await requestJson<
    ApiEnvelope<{ integration?: ProfileIntegration; synced_count?: number }> | { integration?: ProfileIntegration }
  >(`/api/profile/${encodeURIComponent(String(profileId))}/integrations/${provider}/sync`, { method: 'POST' });
  const data = isApiEnvelope<{ integration?: ProfileIntegration }>(response) ? response.data : response;

  if (!data.integration) {
    throw new Error(`The API did not return the ${providerLabel(provider)} integration.`);
  }

  return data.integration;
}

export async function updateIntegrationMediaSelection(
  profileId: number | string,
  provider: IntegrationProvider,
  media: Pick<IntegrationMedia, 'id' | 'observation' | 'selected'>[]
): Promise<IntegrationMediaPage> {
  const response = await requestJson<ApiEnvelope<IntegrationMediaPage> | IntegrationMediaPage>(
    `/api/profile/${encodeURIComponent(String(profileId))}/integrations/${provider}/media-selection`,
    {
      body: { media },
      method: 'PUT',
    }
  );

  return normalizeIntegrationMediaPage(isApiEnvelope<IntegrationMediaPage>(response) ? response.data : response);
}

export async function disconnectIntegration(profileId: number | string, provider: IntegrationProvider): Promise<void> {
  await requestJson(`/api/profile/${encodeURIComponent(String(profileId))}/integrations/${provider}`, {
    method: 'DELETE',
  });
}

export async function createInstagramConnectUrl(profileId: number | string): Promise<InstagramConnectUrl> {
  return createIntegrationConnectUrl(profileId, 'instagram');
}

export async function getInstagramMedia(profileId: number | string): Promise<InstagramMediaPage> {
  return getIntegrationMedia(profileId, 'instagram');
}

export async function syncInstagramMedia(profileId: number | string): Promise<ProfileIntegration> {
  return syncIntegrationMedia(profileId, 'instagram');
}

export async function updateInstagramMediaSelection(
  profileId: number | string,
  media: Pick<InstagramMedia, 'id' | 'observation' | 'selected'>[]
): Promise<InstagramMediaPage> {
  return updateIntegrationMediaSelection(profileId, 'instagram', media);
}

export async function disconnectInstagram(profileId: number | string): Promise<void> {
  await disconnectIntegration(profileId, 'instagram');
}

function normalizeIntegrationMediaPage(value: IntegrationMediaPage): IntegrationMediaPage {
  return {
    integration: value.integration ?? null,
    media: Array.isArray(value.media) ? value.media : [],
    oauth: value.oauth ?? null,
    selection_limit: Number(value.selection_limit || 10),
  };
}

function providerLabel(provider: IntegrationProvider): string {
  return provider === 'tiktok' ? 'TikTok' : 'Instagram';
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

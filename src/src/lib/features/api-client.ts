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

export type FeatureGroup = 'domains' | 'integrations' | 'products';
export type FeatureKey =
  | 'domains.custom'
  | 'integrations.instagram'
  | 'integrations.onlyfans'
  | 'integrations.other'
  | 'integrations.tiktok'
  | 'integrations.youtube'
  | 'products';
export type IntegrationFeatureProvider = 'instagram' | 'onlyfans' | 'other' | 'tiktok' | 'youtube';

export interface FeatureFlag {
  available?: boolean;
  enabled: boolean;
  effective?: boolean;
  globally_enabled?: boolean;
  group: FeatureGroup;
  key: FeatureKey;
  name: string;
  profile_configurable?: boolean;
  provider?: IntegrationFeatureProvider;
}

export type FeaturePatch = Partial<Record<FeatureKey, boolean>>;

export class FeatureApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'FeatureApiError';
    this.status = status;
  }
}

export async function getAdminFeatures(): Promise<FeatureFlag[]> {
  const response = await requestJson<ApiEnvelope<{ features: FeatureFlag[] }>>('/api/admin/features', {
    method: 'GET',
  });

  return normalizeFeatures(response.data.features);
}

export async function updateAdminFeatures(features: FeaturePatch): Promise<FeatureFlag[]> {
  const response = await requestJson<ApiEnvelope<{ features: FeatureFlag[] }>>('/api/admin/features', {
    body: { features: toApiFeaturePayload(features) },
    method: 'PATCH',
  });

  return normalizeFeatures(response.data.features);
}

export async function getProfileFeatures(profileId: number | string): Promise<FeatureFlag[]> {
  const response = await requestJson<ApiEnvelope<{ features: FeatureFlag[] }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/features`,
    { method: 'GET' }
  );

  return normalizeFeatures(response.data.features);
}

export async function updateProfileFeatures(
  profileId: number | string,
  features: FeaturePatch
): Promise<FeatureFlag[]> {
  const response = await requestJson<ApiEnvelope<{ features: FeatureFlag[] }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/features`,
    {
      body: { features: toApiFeaturePayload(features) },
      method: 'PATCH',
    }
  );

  return normalizeFeatures(response.data.features);
}

export function isFeatureEffective(features: FeatureFlag[], key: FeatureKey): boolean {
  return Boolean(features.find((feature) => feature.key === key)?.effective);
}

export function enabledIntegrationProviders(features: FeatureFlag[]): IntegrationFeatureProvider[] {
  return features
    .filter((feature) => feature.group === 'integrations' && feature.provider && feature.effective)
    .map((feature) => feature.provider!);
}

function normalizeFeatures(features: FeatureFlag[] | undefined): FeatureFlag[] {
  return Array.isArray(features) ? features : [];
}

function toApiFeaturePayload(features: FeaturePatch): Record<string, unknown> {
  const payload: {
    domains?: { custom?: boolean };
    integrations?: Partial<Record<IntegrationFeatureProvider, boolean>>;
    products?: boolean;
  } = {};

  Object.entries(features).forEach(([key, enabled]) => {
    if (typeof enabled !== 'boolean') {
      return;
    }

    if (key === 'products') {
      payload.products = enabled;
      return;
    }

    if (key === 'domains.custom') {
      payload.domains = { custom: enabled };
      return;
    }

    const provider = key.replace('integrations.', '') as IntegrationFeatureProvider;
    payload.integrations = {
      ...(payload.integrations ?? {}),
      [provider]: enabled,
    };
  });

  return payload;
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
    cache: options.method === 'GET' || !options.method ? 'no-store' : undefined,
    headers,
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new FeatureApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
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

  return 'Feature request failed';
}

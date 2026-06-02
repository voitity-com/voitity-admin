import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface RequestOptions {
  body?: unknown;
  formData?: FormData;
  method?: 'GET' | 'POST';
}

export interface ProfileAvatar {
  ai_image?: null | {
    file?: null | string;
    id: number | string;
    status?: null | string;
  };
  ai_video?: null | {
    file?: null | string;
    id: number | string;
    status?: null | string;
  };
  file?: null | string;
  id: number | string;
  profile_id: number | string;
  status?: null | string;
}

export interface GeneratedAvatar {
  file?: null | string;
  id: number | string;
  profile_id?: null | number | string;
  source?: null | string;
  source_id?: null | string;
  status?: null | string;
}

export class AvatarApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'AvatarApiError';
    this.status = status;
  }
}

export async function getProfileAvatar(profileId: number | string): Promise<null | ProfileAvatar> {
  try {
    const response = await requestJson<ApiEnvelope<ProfileAvatar> | ProfileAvatar>(
      `/api/avatar/${encodeURIComponent(String(profileId))}`,
      { method: 'GET' }
    );

    return isApiEnvelope<ProfileAvatar>(response) ? response.data : response;
  } catch (error) {
    if (error instanceof AvatarApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function generateAvatar(profileId: number | string, image: File): Promise<GeneratedAvatar> {
  const formData = new FormData();
  formData.append('profile_id', String(profileId));
  formData.append('image', image);

  const response = await requestJson<ApiEnvelope<GeneratedAvatar> | GeneratedAvatar>('/api/avatar/generate', {
    formData,
    method: 'POST',
  });

  return isApiEnvelope<GeneratedAvatar>(response) ? response.data : response;
}

function isApiEnvelope<T>(response: unknown): response is ApiEnvelope<T> {
  return typeof response === 'object' && response !== null && 'data' in response;
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

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
    headers,
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new AvatarApiError(await getErrorMessage(response), response.status);
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
    // Fall through to generic message.
  }

  return 'Avatar request failed';
}

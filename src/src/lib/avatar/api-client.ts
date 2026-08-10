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

export type ProfileAvatarStatus = 'active' | 'failed' | 'inactive' | 'processing';
export type AvatarGenerationStatus = 'completed' | 'image_failed' | 'processing' | 'video_failed';
export type AvatarVariant = 'animation' | 'enhanced' | 'original';
export type AvatarVariantStatus = 'available' | 'failed' | 'not_generated' | 'processing' | 'unavailable' | 'waiting';

export interface ProfileAvatarVariant {
  failure_code?: null | string;
  failure_reason?: null | string;
  file?: null | string;
  kind: 'image' | 'video';
  selected?: boolean;
  status: AvatarVariantStatus;
}

export interface ProfileAvatar {
  ai_video_id?: null | number | string;
  aiimage_id?: null | number | string;
  ai_image?: null | {
    failure_code?: null | string;
    failure_reason?: null | string;
    file?: null | string;
    id: number | string;
    status?: null | string;
  };
  ai_video?: null | {
    failure_code?: null | string;
    failure_reason?: null | string;
    file?: null | string;
    id: number | string;
    status?: null | string;
  };
  failure_code?: null | string;
  failure_reason?: null | string;
  file?: null | string;
  generation_status?: null | AvatarGenerationStatus;
  has_processing_avatar?: boolean;
  id: number | string;
  original_file?: null | string;
  profile_id: number | string;
  processing_avatar?: null | ProfileAvatar;
  selected_variant?: null | AvatarVariant;
  status?: null | ProfileAvatarStatus;
  variants?: Partial<Record<AvatarVariant, ProfileAvatarVariant>>;
  created_at?: null | string;
  updated_at?: null | string;
}

export interface GeneratedAvatar {
  avatar?: null | ProfileAvatar;
  file?: null | string;
  failure_code?: null | string;
  failure_reason?: null | string;
  id: number | string;
  profile_id?: null | number | string;
  source?: null | string;
  source_id?: null | string;
  status?: null | ProfileAvatarStatus;
}

export interface ProfileAvatarHistory {
  active_avatar?: null | ProfileAvatar;
  avatars: ProfileAvatar[];
  processing_avatar?: null | ProfileAvatar;
  total: number;
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

export async function listProfileAvatarHistory(profileId: number | string): Promise<ProfileAvatarHistory> {
  const response = await requestJson<ApiEnvelope<ProfileAvatarHistory> | ProfileAvatarHistory>(
    `/api/avatar/${encodeURIComponent(String(profileId))}/history`,
    { method: 'GET' }
  );

  return isApiEnvelope<ProfileAvatarHistory>(response) ? response.data : response;
}

export async function activateProfileAvatar(
  profileId: number | string,
  avatarId: number | string,
  variant: AvatarVariant
): Promise<ProfileAvatar> {
  const response = await requestJson<ApiEnvelope<ProfileAvatar> | ProfileAvatar>(
    `/api/avatar/${encodeURIComponent(String(profileId))}/activate`,
    {
      body: { avatar_id: avatarId, variant },
      method: 'POST',
    }
  );

  return isApiEnvelope<ProfileAvatar>(response) ? response.data : response;
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

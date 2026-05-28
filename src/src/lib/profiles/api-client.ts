import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

export interface Profile {
  id: number | string;
  user_id?: number | string;
  name: string;
  description: string;
  genre: string;
  personality: string;
  active?: boolean;
  data?: null | Record<string, unknown>;
  created_at?: null | string;
  updated_at?: null | string;
}

export interface ProfilePayload {
  name: string;
  description: string;
  genre: string;
  personality: string;
  active?: boolean;
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface ProfilesListData {
  profiles: Profile[];
  total?: number;
}

interface RequestOptions {
  body?: unknown;
  formData?: FormData;
  method?: 'GET' | 'PATCH' | 'POST' | 'PUT';
}

export interface Voice {
  id: number | string;
  name: string;
  description?: null | string;
  language_code?: null | string;
  profile_id?: number | string;
}

export interface VoiceSample {
  id: number | string;
  voice_id: number | string;
  file?: string;
}

export interface VoiceTestAudio {
  audio_content?: null | string;
  audio_format?: null | string;
  audio_url?: null | string;
  duration?: null | number;
  metadata?: Record<string, unknown>;
  profile_id: number | string;
  status?: null | string;
  text: string;
  voice_id: number | string;
}

export class ProfileApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'ProfileApiError';
    this.status = status;
  }
}

export async function listProfiles(): Promise<Profile[]> {
  const response = await requestJson<ApiEnvelope<ProfilesListData> | ProfilesListData | Profile[]>('/api/profile', {
    method: 'GET',
  });

  if (Array.isArray(response)) {
    return response;
  }

  if ('data' in response) {
    return response.data.profiles ?? [];
  }

  return response.profiles ?? [];
}

export async function getProfile(id: number | string): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(`/api/profile/${encodeURIComponent(String(id))}`, {
    method: 'GET',
  });
  return unwrapProfile(response);
}

export async function createProfile(payload: ProfilePayload): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>('/api/profile', { body: payload, method: 'POST' });
  return unwrapProfile(response);
}

export async function updateProfile(id: number | string, payload: ProfilePayload): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(`/api/profile/${encodeURIComponent(String(id))}`, {
    body: payload,
    method: 'PATCH',
  });
  return unwrapProfile(response);
}

export async function updateProfileData(id: number | string, data: Record<string, unknown>): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(
    `/api/profile/${encodeURIComponent(String(id))}/data`,
    {
      body: { data },
      method: 'PUT',
    }
  );
  return unwrapProfile(response);
}

export async function createVoice(payload: {
  description?: string;
  language_code: string;
  name: string;
  profile_id: number | string;
}): Promise<Voice> {
  const response = await requestJson<ApiEnvelope<Voice> | Voice>('/api/voice', { body: payload, method: 'POST' });
  return isApiEnvelope<Voice>(response) ? response.data : response;
}

export async function uploadVoiceSample(params: {
  file: File;
  language_code: string;
  voiceId: number | string;
}): Promise<VoiceSample> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('language_code', params.language_code);
  formData.append('active', 'true');

  const response = await requestJson<ApiEnvelope<VoiceSample> | VoiceSample>(
    `/api/voice/${encodeURIComponent(String(params.voiceId))}/sample`,
    { formData, method: 'POST' }
  );

  return isApiEnvelope<VoiceSample>(response) ? response.data : response;
}

export async function testVoiceAudio(payload: {
  profile_id: number | string;
  text: string;
}): Promise<VoiceTestAudio> {
  const response = await requestJson<ApiEnvelope<VoiceTestAudio> | VoiceTestAudio>('/api/voice/test', {
    body: payload,
    method: 'POST',
  });
  return isApiEnvelope<VoiceTestAudio>(response) ? response.data : response;
}

function unwrapProfile(response: ApiEnvelope<Profile> | Profile): Profile {
  return isApiEnvelope(response) ? response.data : response;
}

function isApiEnvelope<T>(response: unknown): response is ApiEnvelope<T> {
  return typeof response === 'object' && response !== null && 'message' in response && 'data' in response;
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
    throw new ProfileApiError(await getErrorMessage(response), response.status);
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

  return 'Profile request failed';
}

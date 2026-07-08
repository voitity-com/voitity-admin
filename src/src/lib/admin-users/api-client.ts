import { config } from '@/config';
import type { ApiUser } from '@/lib/auth/custom/api-client';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
}

export interface AdminUserCounts {
  ai_images: number;
  ai_videos: number;
  avatars: number;
  chats: number;
  profiles: number;
  sources: number;
  voices: number;
}

export interface AdminUserProfile {
  active?: boolean;
  alias?: null | string;
  counts?: Omit<AdminUserCounts, 'profiles'>;
  created_at?: null | string;
  id: number | string;
  name?: null | string;
  status?: null | string;
  updated_at?: null | string;
}

export interface AdminUser extends ApiUser {
  counts: AdminUserCounts;
  created_at?: null | string;
  profiles?: AdminUserProfile[];
  updated_at?: null | string;
}

export interface AdminUsersPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AdminUsersPage {
  pagination: AdminUsersPagination;
  users: AdminUser[];
}

export interface AdminImpersonationResponse {
  access_token: string;
  admin: ApiUser;
  user: ApiUser;
}

export class AdminUsersApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminUsersApiError';
    this.status = status;
  }
}

export async function listAdminUsers(
  params: {
    page?: number;
    perPage?: number;
    search?: string;
  } = {}
): Promise<AdminUsersPage> {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.perPage) {
    searchParams.set('per_page', String(params.perPage));
  }

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  const query = searchParams.toString();
  const response = await requestJson(`/api/admin/users${query ? `?${query}` : ''}`, { method: 'GET' });

  return normalizeAdminUsersPage(response);
}

export async function getAdminUser(userId: number | string): Promise<AdminUser> {
  const response = await requestJson(`/api/admin/users/${encodeURIComponent(String(userId))}`, {
    method: 'GET',
  });
  const data = getResponseData(response);

  if (!isRecord(data)) {
    throw new Error('Invalid admin user response');
  }

  return normalizeAdminUser(data);
}

export async function impersonateAdminUser(userId: number | string): Promise<AdminImpersonationResponse> {
  const response = await requestJson(`/api/admin/users/${encodeURIComponent(String(userId))}/impersonate`, {
    method: 'POST',
  });
  const data = getResponseData(response);

  if (!isRecord(data) || typeof data.access_token !== 'string' || !isRecord(data.admin) || !isRecord(data.user)) {
    throw new Error('Invalid impersonation response');
  }

  return {
    access_token: data.access_token,
    admin: data.admin as unknown as ApiUser,
    user: data.user as unknown as ApiUser,
  };
}

export async function stopAdminImpersonation(): Promise<void> {
  await requestJson('/api/admin/impersonation/stop', { method: 'POST' });
}

function normalizeAdminUsersPage(response: unknown): AdminUsersPage {
  const data = getResponseData(response);

  if (!isRecord(data)) {
    return { pagination: emptyPagination(), users: [] };
  }

  const rawUsers = Array.isArray(data.users) ? data.users : [];
  const pagination = isRecord(data.pagination) ? data.pagination : {};

  return {
    pagination: {
      current_page: getNumberField(pagination, 'current_page') ?? 1,
      last_page: getNumberField(pagination, 'last_page') ?? 1,
      per_page: getNumberField(pagination, 'per_page') ?? rawUsers.length,
      total: getNumberField(pagination, 'total') ?? rawUsers.length,
    },
    users: rawUsers.filter(isRecord).map(normalizeAdminUser),
  };
}

function normalizeAdminUser(value: Record<string, unknown>): AdminUser {
  const counts = isRecord(value.counts) ? value.counts : {};
  const profiles = Array.isArray(value.profiles)
    ? value.profiles.filter(isRecord).map(normalizeAdminUserProfile)
    : undefined;

  return {
    avatar: getStringField(value, 'avatar'),
    counts: normalizeCounts(counts),
    created_at: getStringField(value, 'created_at'),
    email: getStringField(value, 'email'),
    first_name: getStringField(value, 'first_name'),
    id: value.id as number | string,
    last_name: getStringField(value, 'last_name'),
    name: getStringField(value, 'name'),
    profiles,
    provider: getStringField(value, 'provider'),
    role: getStringField(value, 'role'),
    updated_at: getStringField(value, 'updated_at'),
  };
}

function normalizeAdminUserProfile(value: Record<string, unknown>): AdminUserProfile {
  const counts = isRecord(value.counts) ? value.counts : {};

  return {
    active: typeof value.active === 'boolean' ? value.active : undefined,
    alias: getStringField(value, 'alias'),
    counts: normalizeCounts(counts),
    created_at: getStringField(value, 'created_at'),
    id: value.id as number | string,
    name: getStringField(value, 'name'),
    status: getStringField(value, 'status'),
    updated_at: getStringField(value, 'updated_at'),
  };
}

function normalizeCounts(value: Record<string, unknown>): AdminUserCounts {
  return {
    ai_images: getNumberField(value, 'ai_images') ?? 0,
    ai_videos: getNumberField(value, 'ai_videos') ?? 0,
    avatars: getNumberField(value, 'avatars') ?? 0,
    chats: getNumberField(value, 'chats') ?? 0,
    profiles: getNumberField(value, 'profiles') ?? 0,
    sources: getNumberField(value, 'sources') ?? 0,
    voices: getNumberField(value, 'voices') ?? 0,
  };
}

function emptyPagination(): AdminUsersPagination {
  return { current_page: 1, last_page: 1, per_page: 20, total: 0 };
}

async function requestJson<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = config.api?.baseUrl;
  const token = getStoredApiToken();

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL env variable');
  }

  if (!token) {
    throw new Error('Missing API access token');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new AdminUsersApiError(await getErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function getResponseData<T>(response: ApiEnvelope<T> | T): T {
  if (isRecord(response) && 'data' in response) {
    return response.data as T;
  }

  return response as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getNumberField(value: Record<string, unknown>, key: string): number | undefined {
  const field = value[key];

  if (typeof field === 'number') {
    return field;
  }

  if (typeof field === 'string') {
    const parsed = Number(field);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function getStringField(value: Record<string, unknown>, key: string): null | string | undefined {
  const field = value[key];

  return typeof field === 'string' ? field : null;
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

  return 'Admin users request failed';
}

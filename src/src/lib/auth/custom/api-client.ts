import { config } from '@/config';
import type { User } from '@/types/user';

export interface ApiUser {
  id: number | string;
  name?: null | string;
  email?: null | string;
  first_name?: null | string;
  last_name?: null | string;
  avatar?: null | string;
  provider?: null | string;
  role?: null | string;
}

export interface AuthApiResponse {
  access_token: string;
  user?: ApiUser;
}

export interface GoogleAuthPayload {
  google_id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  avatar?: string;
  access_token: string;
}

interface RequestOptions {
  body?: unknown;
  method?: 'GET' | 'POST';
  token?: string;
}

export class ApiRequestError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function postGetToken(params: { email: string; password: string }): Promise<AuthApiResponse> {
  return requestJson<AuthApiResponse>('/api/auth/get-token', { body: params });
}

export async function postGoogleSignIn(payload: GoogleAuthPayload): Promise<AuthApiResponse> {
  return requestJson<AuthApiResponse>('/api/auth/google/sign-in', { body: payload });
}

export async function postGoogleSignUp(payload: GoogleAuthPayload): Promise<AuthApiResponse> {
  return requestJson<AuthApiResponse>('/api/auth/google/sign-up', { body: payload });
}

export async function postLogout(token: string): Promise<void> {
  await requestJson('/api/auth/logout', { token });
}

export async function getCurrentUser(token: string): Promise<ApiUser> {
  const response = await requestJson<ApiUser | { data?: ApiUser; user?: ApiUser }>('/api/user', { method: 'GET', token });

  if (hasUserKey(response) && response.user) {
    return response.user;
  }

  if (hasDataKey(response) && response.data) {
    return response.data;
  }

  return response as ApiUser;
}

export function mapApiUser(user: ApiUser | undefined, fallback: Partial<User> = {}): User {
  const nameParts = user?.name?.split(' ') ?? [];
  const firstName = user?.first_name ?? (fallback.firstName as string | undefined) ?? nameParts[0] ?? '';
  const lastName = user?.last_name ?? (fallback.lastName as string | undefined) ?? nameParts.slice(1).join(' ');
  const name = user?.name ?? fallback.name ?? [firstName, lastName].filter(Boolean).join(' ');

  return {
    ...fallback,
    id: String(user?.id ?? fallback.id ?? user?.email ?? 'authenticated-user'),
    name,
    avatar: user?.avatar ?? fallback.avatar,
    email: user?.email ?? fallback.email,
    firstName,
    lastName,
    provider: user?.provider ?? fallback.provider,
    role: user?.role ?? fallback.role,
  };
}

async function requestJson<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = config.api?.baseUrl;

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL env variable');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers,
    method: options.method ?? 'POST',
  });

  if (!response.ok) {
    throw new ApiRequestError(await getErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function hasUserKey(value: ApiUser | { data?: ApiUser; user?: ApiUser }): value is { user?: ApiUser } {
  return 'user' in value;
}

function hasDataKey(value: ApiUser | { data?: ApiUser; user?: ApiUser }): value is { data?: ApiUser } {
  return 'data' in value;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string; errors?: Record<string, string[]> };

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

  return 'Authentication request failed';
}

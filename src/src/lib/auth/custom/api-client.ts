import type { User } from '@/types/user';
import { config } from '@/config';
import type { CheckoutIntent } from '@/lib/billing/checkout-intent';

export interface ApiUser {
  id: number | string;
  name?: null | string;
  email?: null | string;
  first_name?: null | string;
  last_name?: null | string;
  avatar?: null | string;
  email_verified_at?: null | string;
  locale?: null | string;
  provider?: null | string;
  role?: null | string;
  checkout_intent?: CheckoutIntent | null;
}

export interface AuthApiResponse {
  access_token: string;
  user?: ApiUser;
}

export interface EmailSignUpResponse {
  email_verification_required?: boolean;
  message?: string;
  user?: ApiUser;
}

export interface EmailSignUpPayload {
  name: string;
  email: string;
  locale?: string;
  password: string;
  password_confirmation: string;
  checkout_intent?: CheckoutIntent;
}

export interface GoogleAuthPayload {
  google_id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  avatar?: string;
  locale?: string;
  access_token: string;
}

export interface PasswordForgotPayload {
  email: string;
  locale?: string;
}

export interface PasswordResetPayload {
  email: string;
  password: string;
  password_confirmation: string;
  token: string;
}

export interface PasswordResetValidatePayload {
  email: string;
  locale?: string;
  token: string;
}

export interface PasswordChangePayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface MessageApiResponse {
  message?: string;
  status?: string;
}

export interface LoginHistoryEvent {
  created_at?: null | string;
  id: number | string;
  ip_address?: null | string;
  type?: null | string;
  user_agent?: null | string;
}

export interface LoginHistoryPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface LoginHistoryPage {
  events: LoginHistoryEvent[];
  pagination: LoginHistoryPagination;
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

export async function postSignUp(payload: EmailSignUpPayload): Promise<EmailSignUpResponse> {
  return requestJson<EmailSignUpResponse>('/api/auth/sign-up', { body: payload });
}

export async function postGoogleSignIn(payload: GoogleAuthPayload): Promise<AuthApiResponse> {
  return requestJson<AuthApiResponse>('/api/auth/google/sign-in', { body: payload });
}

export async function postGoogleSignUp(payload: GoogleAuthPayload): Promise<AuthApiResponse> {
  return requestJson<AuthApiResponse>('/api/auth/google/sign-up', { body: payload });
}

export async function postPasswordForgot(payload: PasswordForgotPayload): Promise<MessageApiResponse> {
  return requestJson<MessageApiResponse>('/api/auth/password/forgot', { body: payload });
}

export async function postPasswordReset(payload: PasswordResetPayload): Promise<MessageApiResponse> {
  return requestJson<MessageApiResponse>('/api/auth/password/reset', { body: payload });
}

export async function postPasswordResetValidate(payload: PasswordResetValidatePayload): Promise<MessageApiResponse> {
  return requestJson<MessageApiResponse>('/api/auth/password/reset/validate', { body: payload });
}

export async function postPasswordChange(payload: PasswordChangePayload, token: string): Promise<MessageApiResponse> {
  return requestJson<MessageApiResponse>('/api/auth/password/change', { body: payload, token });
}

export async function getLoginHistory(
  token: string,
  params: { page?: number; perPage?: number } = {}
): Promise<LoginHistoryPage> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 10),
  });
  const response = await requestJson<LoginHistoryPage | { data?: LoginHistoryPage }>(
    `/api/auth/login-history?${query.toString()}`,
    {
      method: 'GET',
      token,
    }
  );

  if (hasLoginHistoryData(response) && response.data) {
    return response.data;
  }

  return response as LoginHistoryPage;
}

export async function postLogout(token: string): Promise<void> {
  await requestJson('/api/auth/logout', { token });
}

export async function getCurrentUser(token: string): Promise<ApiUser> {
  const response = await requestJson<ApiUser | { data?: ApiUser; user?: ApiUser }>('/api/user', {
    method: 'GET',
    token,
  });

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
    locale: user?.locale ?? fallback.locale,
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

function hasLoginHistoryData(
  value: LoginHistoryPage | { data?: LoginHistoryPage }
): value is { data?: LoginHistoryPage } {
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

'use client';

import { clearApiAccessToken, getStoredApiToken, saveApiAccessToken } from '@/lib/auth/custom/api-token';
import type { User } from '@/types/user';

const STORAGE_USER_KEY = 'custom-auth-user';
const LEGACY_TOKEN_KEY = 'custom-auth-token';

export interface AuthSession {
  accessToken: string;
  user: User;
}

export function persistAuthSession(accessToken: string, user: User): void {
  if (typeof window === 'undefined') {
    return;
  }

  saveApiAccessToken(accessToken);
  window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const accessToken = getStoredApiToken();
  const user = getStoredUser();

  if (!accessToken || !user) {
    return null;
  }

  return { accessToken, user };
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  clearApiAccessToken();
  window.localStorage.removeItem(STORAGE_USER_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    window.localStorage.removeItem(STORAGE_USER_KEY);
    return null;
  }
}

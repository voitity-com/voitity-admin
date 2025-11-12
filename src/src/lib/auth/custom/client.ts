'use client';

import type { GoogleProfile } from '@/lib/google/profile';
import type { User } from '@/types/user';

function generateToken(): string {
  const arr = new Uint8Array(12);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (v) => v.toString(16).padStart(2, '0')).join('');
}

const STORAGE_TOKEN_KEY = 'custom-auth-token';
const STORAGE_USER_KEY = 'custom-auth-user';

const defaultUser = {
  id: 'USR-000',
  avatar: '/assets/avatar.png',
  firstName: 'Sofia',
  lastName: 'Rivers',
  email: 'sofia@devias.io',
} satisfies User;

export interface SignUpParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignInWithOAuthParams {
  provider: 'google';
  token: string;
  profile: GoogleProfile;
}

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

export interface ResetPasswordParams {
  email: string;
}

class AuthClient {
  async signUp(_: SignUpParams): Promise<{ error?: string }> {
    // Make API request

    // We do not handle the API, so we'll just generate a token and store it in localStorage.
    const token = generateToken();
    persistSession(token, defaultUser);

    return {};
  }

  async signInWithOAuth(params: SignInWithOAuthParams): Promise<{ error?: string }> {
    const { provider, profile, token } = params;

    if (provider !== 'google') {
      return { error: `Unsupported provider: ${provider}` };
    }

    const user = buildUserFromGoogleProfile(profile);
    persistSession(token, user);

    return {};
  }

  async signInWithPassword(params: SignInWithPasswordParams): Promise<{ error?: string }> {
    const { email, password } = params;

    // Make API request

    // We do not handle the API, so we'll check if the credentials match with the hardcoded ones.
    if (email !== 'sofia@devias.io' || password !== 'Secret1') {
      return { error: 'Invalid credentials' };
    }

    const token = generateToken();
    persistSession(token, defaultUser);

    return {};
  }

  async resetPassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Password reset not implemented' };
  }

  async updatePassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Update reset not implemented' };
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    // Make API request

    // We do not handle the API, so just check if we have a token in localStorage.
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);

    if (!token) {
      return { data: null };
    }

    const storedUser = getStoredUser();

    if (!storedUser) {
      return { data: null };
    }

    return { data: storedUser };
  }

  async signOut(): Promise<{ error?: string }> {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);

    return {};
  }
}

export const authClient = new AuthClient();

function persistSession(token: string, user: User): void {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

function getStoredUser(): User | null {
  const raw = localStorage.getItem(STORAGE_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(STORAGE_USER_KEY);
    return null;
  }
}

function buildUserFromGoogleProfile(profile: GoogleProfile): User {
  const [firstNameFallback = '', lastNameFallback = ''] = profile.name?.split(' ') ?? [];
  const firstName = profile.given_name ?? firstNameFallback ?? profile.email;
  const lastName = profile.family_name ?? lastNameFallback ?? '';

  return {
    id: profile.sub,
    avatar: profile.picture,
    email: profile.email,
    firstName,
    lastName,
    name: profile.name ?? `${firstName} ${lastName}`.trim(),
    provider: 'google',
  };
}

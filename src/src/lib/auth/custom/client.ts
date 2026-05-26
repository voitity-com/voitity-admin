'use client';

import type { GoogleProfile } from '@/lib/google/profile';
import type { User } from '@/types/user';

import {
  ApiRequestError,
  getCurrentUser,
  mapApiUser,
  postGetToken,
  postGoogleSignIn,
  postGoogleSignUp,
  postLogout,
  type AuthApiResponse,
  type GoogleAuthPayload,
} from './api-client';
import { clearAuthSession, getAuthSession, persistAuthSession, persistAuthUser } from './session-store';

export interface SignUpParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface GoogleAuthParams {
  accessToken: string;
  profile: GoogleProfile;
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
    return { error: 'Email sign up is not available for this API.' };
  }

  async signInWithOAuth(params: SignInWithOAuthParams): Promise<{ error?: string }> {
    return this.signInWithGoogle({ accessToken: params.token, profile: params.profile });
  }

  async signInWithGoogle(params: GoogleAuthParams): Promise<{ error?: string }> {
    const result = await this.authenticateWithGoogle(params, postGoogleSignIn);

    if (result.status === 404) {
      return this.authenticateWithGoogle(params, postGoogleSignUp);
    }

    return result;
  }

  async signUpWithGoogle(params: GoogleAuthParams): Promise<{ error?: string }> {
    return this.authenticateWithGoogle(params, postGoogleSignUp);
  }

  async signInWithPassword(params: SignInWithPasswordParams): Promise<{ error?: string }> {
    try {
      const response = await postGetToken(params);
      persistAuthSession(response.access_token, mapApiUser(response.user, { email: params.email }));
      return {};
    } catch (err) {
      return { error: getErrorMessage(err) };
    }
  }

  async resetPassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Password reset not implemented' };
  }

  async updatePassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Update reset not implemented' };
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const session = getAuthSession();

    if (!session) {
      return { data: null };
    }

    try {
      const apiUser = await getCurrentUser(session.accessToken);
      const user = mapApiUser(apiUser, session.user);
      persistAuthUser(user);
      return { data: user };
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        clearAuthSession();
        return { data: null };
      }

      if (session.user) {
        return { data: session.user };
      }

      return { error: getErrorMessage(err) };
    }
  }

  async signOut(): Promise<{ error?: string }> {
    const session = getAuthSession();

    try {
      if (session?.accessToken) {
        await postLogout(session.accessToken);
      }

      return {};
    } catch (err) {
      return { error: getErrorMessage(err) };
    } finally {
      clearAuthSession();
    }
  }

  private async authenticateWithGoogle(
    params: GoogleAuthParams,
    authenticate: (payload: GoogleAuthPayload) => Promise<AuthApiResponse>
  ): Promise<{ error?: string; status?: number }> {
    try {
      const response = await authenticate(createGoogleAuthPayload(params));
      persistAuthSession(response.access_token, mapApiUser(response.user, buildUserFromGoogleProfile(params.profile)));
      return {};
    } catch (err) {
      if (err instanceof ApiRequestError) {
        return { error: err.message, status: err.status };
      }

      return { error: getErrorMessage(err) };
    }
  }
}

export const authClient = new AuthClient();

function createGoogleAuthPayload({ accessToken, profile }: GoogleAuthParams): GoogleAuthPayload {
  const { firstName, lastName, name } = getGoogleDisplayName(profile);

  return {
    google_id: profile.sub,
    email: profile.email,
    first_name: firstName,
    last_name: lastName,
    name,
    avatar: profile.picture,
    access_token: accessToken,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Authentication request failed';
}

function buildUserFromGoogleProfile(profile: GoogleProfile): User {
  const { firstName, lastName, name } = getGoogleDisplayName(profile);

  return {
    id: profile.sub,
    avatar: profile.picture,
    email: profile.email,
    firstName,
    lastName,
    name,
    provider: 'google',
  };
}

function getGoogleDisplayName(profile: GoogleProfile): { firstName: string; lastName: string; name: string } {
  const [firstNameFallback = profile.email, ...lastNameParts] = profile.name?.trim().split(/\s+/) ?? [];
  const firstName = profile.given_name || firstNameFallback || profile.email;
  const lastName = profile.family_name || lastNameParts.join(' ') || firstName;

  return {
    firstName,
    lastName,
    name: profile.name || `${firstName} ${lastName}`.trim(),
  };
}

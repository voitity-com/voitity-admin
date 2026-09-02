'use client';

import type { User } from '@/types/user';
import { saveCheckoutIntent, type CheckoutIntent } from '@/lib/billing/checkout-intent';
import type { GoogleProfile } from '@/lib/google/profile';

import { clearAdminImpersonationSession } from './admin-impersonation-store';
import {
  ApiRequestError,
  getCurrentUser,
  getLoginHistory,
  mapApiUser,
  postGetToken,
  postGoogleSignIn,
  postGoogleSignUp,
  postLogout,
  postPasswordChange,
  postPasswordForgot,
  postPasswordReset,
  postPasswordResetValidate,
  postSignUp,
  type AuthApiResponse,
  type GoogleAuthPayload,
  type LoginHistoryPage,
} from './api-client';
import { clearAuthSession, getAuthSession, persistAuthSession, persistAuthUser } from './session-store';

export interface SignUpParams {
  name: string;
  email: string;
  locale?: string;
  password: string;
  passwordConfirmation: string;
  checkoutIntent?: CheckoutIntent;
}

export interface GoogleAuthParams {
  accessToken: string;
  locale?: string;
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
  locale?: string;
}

export interface UpdatePasswordParams {
  email: string;
  password: string;
  passwordConfirmation: string;
  token: string;
}

export interface ValidatePasswordResetLinkParams {
  email: string;
  locale?: string;
  token: string;
}

export interface ChangePasswordParams {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

export interface GetLoginHistoryParams {
  page?: number;
  perPage?: number;
}

class AuthClient {
  async signUp(params: SignUpParams): Promise<{ error?: string; message?: string }> {
    try {
      const response = await postSignUp({
        name: params.name,
        email: params.email,
        locale: params.locale,
        password: params.password,
        password_confirmation: params.passwordConfirmation,
        checkout_intent: params.checkoutIntent,
      });

      return { message: response.message };
    } catch (err) {
      return { error: getErrorMessage(err) };
    }
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

  async resetPassword(params: ResetPasswordParams): Promise<{ error?: string; message?: string }> {
    try {
      const response = await postPasswordForgot({
        email: params.email,
        locale: params.locale,
      });

      return { message: response.message };
    } catch (err) {
      return { error: getErrorMessage(err) };
    }
  }

  async updatePassword(params: UpdatePasswordParams): Promise<{ error?: string; message?: string }> {
    try {
      const response = await postPasswordReset({
        email: params.email,
        password: params.password,
        password_confirmation: params.passwordConfirmation,
        token: params.token,
      });

      return { message: response.message };
    } catch (err) {
      return { error: getErrorMessage(err) };
    }
  }

  async validatePasswordResetLink(
    params: ValidatePasswordResetLinkParams
  ): Promise<{ error?: string; message?: string; status?: string }> {
    try {
      const response = await postPasswordResetValidate(params);

      return { message: response.message, status: response.status };
    } catch (err) {
      return { error: getErrorMessage(err) };
    }
  }

  async changePassword(params: ChangePasswordParams): Promise<{ error?: string; message?: string }> {
    const session = getAuthSession();

    if (!session) {
      return { error: 'Missing API access token' };
    }

    try {
      const response = await postPasswordChange(
        {
          current_password: params.currentPassword,
          password: params.password,
          password_confirmation: params.passwordConfirmation,
        },
        session.accessToken
      );

      return { message: response.message };
    } catch (err) {
      return { error: getErrorMessage(err) };
    }
  }

  async getLoginHistory(params: GetLoginHistoryParams = {}): Promise<{ data?: LoginHistoryPage; error?: string }> {
    const session = getAuthSession();

    if (!session) {
      return { error: 'Missing API access token' };
    }

    try {
      const data = await getLoginHistory(session.accessToken, params);

      return { data };
    } catch (err) {
      return { error: getErrorMessage(err) };
    }
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const session = getAuthSession();

    if (!session) {
      return { data: null };
    }

    try {
      const apiUser = await getCurrentUser(session.accessToken);
      if (apiUser.checkout_intent) {
        saveCheckoutIntent(apiUser.checkout_intent);
      }
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
      clearAdminImpersonationSession();
    }
  }

  private async authenticateWithGoogle(
    params: GoogleAuthParams,
    authenticate: (payload: GoogleAuthPayload) => Promise<AuthApiResponse>
  ): Promise<{ error?: string; status?: number }> {
    try {
      const response = await authenticate(createGoogleAuthPayload(params));
      if (response.user?.checkout_intent) {
        saveCheckoutIntent(response.user.checkout_intent);
      }
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

function createGoogleAuthPayload({ accessToken, locale, profile }: GoogleAuthParams): GoogleAuthPayload {
  const { firstName, lastName, name } = getGoogleDisplayName(profile);

  return {
    google_id: profile.sub,
    email: profile.email,
    first_name: firstName,
    last_name: lastName,
    name,
    avatar: profile.picture,
    locale,
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

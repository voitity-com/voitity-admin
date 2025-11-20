import { config } from '@/config';
import { saveApiAccessToken, getStoredApiToken } from '@/lib/auth/custom/api-token';

export interface GoogleAuthPayload {
  google_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  avatar?: string;
  access_token: string;
}

export interface GoogleApiResponse {
  access_token?: string;
  [key: string]: unknown;
}

async function postGoogleAuth(path: string, payload: GoogleAuthPayload): Promise<GoogleApiResponse> {
  const baseUrl = config.api?.baseUrl;

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL env variable');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Google authentication request failed');
  }

  try {
    const data = (await response.json()) as GoogleApiResponse;
    if (data.access_token) {
      saveApiAccessToken(data.access_token);
      console.log('Stored backend access token:', getStoredApiToken());
    }
    return data;
  } catch {
    return {};
  }
}

export function createGoogleAuthPayload(params: {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  accessToken: string;
}): GoogleAuthPayload {
  return {
    google_id: params.googleId,
    email: params.email,
    first_name: params.firstName,
    last_name: params.lastName,
    name: params.name,
    avatar: params.avatar,
    access_token: params.accessToken,
  };
}

export async function postGoogleSignIn(payload: GoogleAuthPayload): Promise<GoogleApiResponse> {
  const response = await postGoogleAuth('/api/auth/google/sign-in', payload);
  console.log('API response (Google sign-in):', response);
  return response;
}

export async function postGoogleSignUp(payload: GoogleAuthPayload): Promise<GoogleApiResponse> {
  const response = await postGoogleAuth('/api/auth/google/sign-up', payload);
  console.log('API response (Google sign-up):', response);
  return response;
}

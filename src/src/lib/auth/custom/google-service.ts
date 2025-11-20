import { config } from '@/config';

export interface GoogleAuthPayload {
  google_id: string;
  email: string;
  name?: string;
  avatar?: string;
  access_token: string;
}

async function postGoogleAuth(path: string, payload: GoogleAuthPayload): Promise<unknown> {
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
    return await response.json();
  } catch {
    return undefined;
  }
}

export function createGoogleAuthPayload(params: {
  googleId: string;
  email: string;
  name?: string;
  avatar?: string;
  accessToken: string;
}): GoogleAuthPayload {
  return {
    google_id: params.googleId,
    email: params.email,
    name: params.name,
    avatar: params.avatar,
    access_token: params.accessToken,
  };
}

export async function postGoogleSignIn(payload: GoogleAuthPayload): Promise<unknown> {
  const response = await postGoogleAuth('/api/auth/google/sign-in', payload);
  console.log('API response (Google sign-in):', response);
  return response;
}

export async function postGoogleSignUp(payload: GoogleAuthPayload): Promise<unknown> {
  const response = await postGoogleAuth('/api/auth/google/sign-up', payload);
  console.log('API response (Google sign-up):', response);
  return response;
}

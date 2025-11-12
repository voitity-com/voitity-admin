import { config } from '@/config';
import { logger } from '@/lib/default-logger';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_SCOPE = 'openid profile email';

let scriptPromise: Promise<void> | null = null;

function ensureScript(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google OAuth is only available in the browser'));
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  if (document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`)) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google OAuth script'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function preloadGoogleScript(): Promise<void> {
  try {
    await ensureScript();
  } catch (error) {
    logger.error(error);
  }
}

export async function requestGoogleAccessToken(): Promise<string> {
  if (!config.google?.clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID env variable');
  }

  await ensureScript();

  const googleGlobal = (window as typeof window & { google?: any }).google;

  if (!googleGlobal?.accounts?.oauth2?.initTokenClient) {
    throw new Error('Google OAuth client not available');
  }

  return new Promise((resolve, reject) => {
    const client = googleGlobal.accounts.oauth2.initTokenClient({
      client_id: config.google!.clientId!,
      scope: GOOGLE_SCOPE,
      callback: (tokenResponse: { access_token?: string }) => {
        if (!tokenResponse.access_token) {
          reject(new Error('Google did not return an access token'));
          return;
        }
        resolve(tokenResponse.access_token);
      },
      error_callback: (err: { error: string }) => {
        reject(new Error(err?.error || 'Google authentication was cancelled'));
      },
    });

    try {
      client.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Unable to request Google access token'));
    }
  });
}

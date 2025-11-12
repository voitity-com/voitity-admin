const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Unable to fetch Google profile');
  }

  return (await response.json()) as GoogleProfile;
}

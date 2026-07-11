import { config } from '@/config';
import type { Profile } from '@/lib/profiles/api-client';

export function getPublicProfileUrl(profile: Pick<Profile, 'alias'>): null | string {
  const alias = profile.alias?.trim().replace(/^@/, '');

  if (!alias) {
    return null;
  }

  const baseUrl = (config.publicProfile?.baseUrl || 'http://localhost:3001').replace(/\/+$/, '');

  return `${baseUrl}/${encodeURIComponent(alias)}`;
}

export function isPublishedProfile(profile: Pick<Profile, 'active' | 'publication' | 'status'>): boolean {
  return Boolean(profile.publication?.is_published) || (Boolean(profile.active) && profile.status === 'published');
}

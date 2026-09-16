const STORAGE_KEY = 'bigmelo:last-visited-profile';

export function getLastVisitedProfileId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveLastVisitedProfileId(profileId: number | string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, String(profileId));
  } catch {
    // Profile navigation must continue when browser storage is unavailable.
  }
}

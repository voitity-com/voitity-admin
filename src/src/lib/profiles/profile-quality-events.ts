export const profileQualityRefreshEvent = 'profile-quality:refresh';

export function notifyProfileQualityChanged(profileId?: number | string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(profileQualityRefreshEvent, {
      detail: { profileId: profileId ? String(profileId) : null },
    })
  );
}

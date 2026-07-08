'use client';

import type { User } from '@/types/user';

import { getAuthSession, persistAuthSession, type AuthSession } from './session-store';

const STORAGE_KEY = 'custom-admin-impersonation';

export const ADMIN_IMPERSONATION_CHANGED_EVENT = 'custom-admin-impersonation-changed';

export interface AdminImpersonationSession {
  adminSession: AuthSession;
  impersonatedUser: User;
  startedAt: string;
}

export function startAdminImpersonation(accessToken: string, impersonatedUser: User): AdminImpersonationSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const currentSession = getAuthSession();

  if (!currentSession) {
    return null;
  }

  const existingSession = getAdminImpersonationSession();
  const nextSession: AdminImpersonationSession = {
    adminSession: existingSession?.adminSession ?? currentSession,
    impersonatedUser,
    startedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  persistAuthSession(accessToken, impersonatedUser);
  emitAdminImpersonationChanged();

  return nextSession;
}

export function getAdminImpersonationSession(): AdminImpersonationSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminImpersonationSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    emitAdminImpersonationChanged();
    return null;
  }
}

export function restoreAdminImpersonationSession(): AuthSession | null {
  const impersonationSession = getAdminImpersonationSession();

  if (!impersonationSession) {
    return null;
  }

  persistAuthSession(impersonationSession.adminSession.accessToken, impersonationSession.adminSession.user);
  clearAdminImpersonationSession();

  return impersonationSession.adminSession;
}

export function clearAdminImpersonationSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  emitAdminImpersonationChanged();
}

function emitAdminImpersonationChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(ADMIN_IMPERSONATION_CHANGED_EVENT));
}

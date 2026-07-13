'use client';

import { paths } from '@/paths';

const STORAGE_KEY = 'bigmelo.checkoutIntent';

export type CheckoutIntentType = 'checkout' | 'trial';
export type CheckoutCycle = 'month' | 'year';

export interface CheckoutIntent {
  cycle?: CheckoutCycle;
  intent: CheckoutIntentType;
  plan?: string;
}

const validIntentTypes = new Set<CheckoutIntentType>(['checkout', 'trial']);
const validCycles = new Set<CheckoutCycle>(['month', 'year']);

export function getCheckoutIntentFromSearch(search: URLSearchParams | string): CheckoutIntent | null {
  const searchParams = typeof search === 'string' ? new URLSearchParams(search) : search;
  const intent = searchParams.get('intent');

  if (!isCheckoutIntentType(intent)) {
    return null;
  }

  const plan = normalizePlan(searchParams.get('plan'));
  const cycle = normalizeCycle(searchParams.get('cycle'));

  return {
    ...(cycle ? { cycle } : {}),
    intent,
    ...(plan ? { plan } : {}),
  };
}

export function getStoredCheckoutIntent(): CheckoutIntent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutIntent>;

    if (!isCheckoutIntentType(parsed.intent)) {
      return null;
    }

    return {
      ...(isCheckoutCycle(parsed.cycle) ? { cycle: parsed.cycle } : {}),
      intent: parsed.intent,
      ...(typeof parsed.plan === 'string' && parsed.plan ? { plan: parsed.plan } : {}),
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveCheckoutIntent(intent: CheckoutIntent): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}

export function clearCheckoutIntent(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function persistCheckoutIntentFromSearch(search: URLSearchParams | string): CheckoutIntent | null {
  const intent = getCheckoutIntentFromSearch(search);

  if (intent) {
    saveCheckoutIntent(intent);
  }

  return intent;
}

export function buildAuthPathWithCheckoutIntent(path: string, search: URLSearchParams | string): string {
  const intent = getCheckoutIntentFromSearch(search) ?? getStoredCheckoutIntent();

  if (!intent) {
    return path;
  }

  return `${path}?${checkoutIntentToSearchParams(intent).toString()}`;
}

export function getCheckoutIntentDestination(search: URLSearchParams | string): string | null {
  const intent = getCheckoutIntentFromSearch(search) ?? getStoredCheckoutIntent();

  if (!intent) {
    return null;
  }

  return `${paths.dashboard.settings.billing}?${checkoutIntentToSearchParams(intent).toString()}`;
}

export function checkoutIntentToSearchParams(intent: CheckoutIntent): URLSearchParams {
  const searchParams = new URLSearchParams();

  searchParams.set('intent', intent.intent);

  if (intent.plan) {
    searchParams.set('plan', intent.plan);
  }

  if (intent.cycle) {
    searchParams.set('cycle', intent.cycle);
  }

  return searchParams;
}

function normalizePlan(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const plan = value.trim().toLowerCase();

  return plan ? plan.replace(/[^a-z0-9_-]/g, '') : undefined;
}

function normalizeCycle(value: string | null): CheckoutCycle | undefined {
  if (value === 'monthly') {
    return 'month';
  }

  if (value === 'annual' || value === 'annually' || value === 'yearly') {
    return 'year';
  }

  return isCheckoutCycle(value) ? value : undefined;
}

function isCheckoutIntentType(value: unknown): value is CheckoutIntentType {
  return typeof value === 'string' && validIntentTypes.has(value as CheckoutIntentType);
}

function isCheckoutCycle(value: unknown): value is CheckoutCycle {
  return typeof value === 'string' && validCycles.has(value as CheckoutCycle);
}

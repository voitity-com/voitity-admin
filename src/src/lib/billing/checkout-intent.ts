'use client';

import { paths } from '@/paths';

const STORAGE_KEY = 'bigmelo.checkoutIntent';

export type CheckoutIntentType = 'checkout' | 'trial';
export type CheckoutCycle = 'month' | 'year';
export type CheckoutLocale = 'en' | 'es';

export interface CheckoutIntent {
  attribution?: CheckoutAttribution;
  cycle?: CheckoutCycle;
  intent: CheckoutIntentType;
  locale?: CheckoutLocale;
  plan?: string;
}

export interface CheckoutAttribution {
  utm_campaign?: string;
  utm_content?: string;
  utm_medium?: string;
  utm_source?: string;
  utm_term?: string;
}

const validIntentTypes = new Set<CheckoutIntentType>(['checkout', 'trial']);
const validCycles = new Set<CheckoutCycle>(['month', 'year']);
const attributionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

export function getCheckoutIntentFromSearch(search: URLSearchParams | string): CheckoutIntent | null {
  const searchParams = typeof search === 'string' ? new URLSearchParams(search) : search;
  const intent = searchParams.get('intent');

  if (!isCheckoutIntentType(intent)) {
    return null;
  }

  const plan = normalizePlan(searchParams.get('plan'));
  const cycle = normalizeCycle(searchParams.get('cycle'));
  const locale = normalizeLocale(searchParams.get('locale'));
  const attribution = getAttribution(searchParams);

  return {
    ...(Object.keys(attribution).length ? { attribution } : {}),
    ...(cycle ? { cycle } : {}),
    intent,
    ...(locale ? { locale } : {}),
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
      ...(isCheckoutAttribution(parsed.attribution) ? { attribution: parsed.attribution } : {}),
      ...(isCheckoutCycle(parsed.cycle) ? { cycle: parsed.cycle } : {}),
      intent: parsed.intent,
      ...(isCheckoutLocale(parsed.locale) ? { locale: parsed.locale } : {}),
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

  if (intent.locale) {
    searchParams.set('locale', intent.locale);
  }

  attributionKeys.forEach((key) => {
    const value = intent.attribution?.[key];

    if (value) {
      searchParams.set(key, value);
    }
  });

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

function normalizeLocale(value: string | null): CheckoutLocale | undefined {
  return isCheckoutLocale(value?.toLowerCase()) ? (value?.toLowerCase() as CheckoutLocale) : undefined;
}

function isCheckoutIntentType(value: unknown): value is CheckoutIntentType {
  return typeof value === 'string' && validIntentTypes.has(value as CheckoutIntentType);
}

function isCheckoutCycle(value: unknown): value is CheckoutCycle {
  return typeof value === 'string' && validCycles.has(value as CheckoutCycle);
}

function isCheckoutLocale(value: unknown): value is CheckoutLocale {
  return value === 'en' || value === 'es';
}

function getAttribution(searchParams: URLSearchParams): CheckoutAttribution {
  return attributionKeys.reduce<CheckoutAttribution>((result, key) => {
    const value = searchParams.get(key)?.trim().slice(0, 255);

    if (value) result[key as keyof CheckoutAttribution] = value;

    return result;
  }, {});
}

function isCheckoutAttribution(value: unknown): value is CheckoutAttribution {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.entries(value).every(
    ([key, item]) =>
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].includes(key) &&
      typeof item === 'string' &&
      item.length <= 255
  );
}

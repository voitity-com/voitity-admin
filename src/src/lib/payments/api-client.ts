import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface RequestOptions {
  body?: unknown;
  method?: 'GET' | 'POST';
}

interface WompiInitializeData {
  deviceData?: {
    deviceID?: string;
  };
  sessionId?: string;
}

interface WompiGlobal {
  initialize: (callback: (data?: WompiInitializeData, error?: unknown) => void) => void;
}

declare global {
  interface Window {
    $wompi?: WompiGlobal;
  }
}

const PENDING_PAYMENT_ORDER_STORAGE_KEY = 'bigmelo.pendingPaymentOrderId';
const LEGACY_PENDING_PAYMENT_ORDER_STORAGE_KEY = 'voitity.pendingPaymentOrderId';
const WOMPI_JS_URL = 'https://wompijs.wompi.com/libs/js/v1.js';
let wompiScriptPromise: Promise<void> | null = null;

export interface PaymentAmounts {
  amount_cop?: number;
  amount_in_cents?: number;
  currency?: string;
  display_amount_usd?: number;
  display_currency?: string;
  exchange_rate?: number;
}

export interface PaymentOrder {
  amounts?: PaymentAmounts;
  billing_reason?: string;
  checkout_url?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  id: number | string;
  paid_at?: string | null;
  payment_source_id?: number | string | null;
  plan?: string;
  provider?: string;
  provider_transaction_id?: string | null;
  reference?: string;
  recurring?: boolean;
  status?: string;
  subscription_id?: number | string | null;
  updated_at?: string | null;
  user_id?: number | string;
  wompi_status?: string | null;
}

export interface WompiCheckout {
  amount_in_cents?: number;
  checkout_url?: string;
  currency?: string;
  form_parameters?: Record<string, string>;
  integrity_signature?: string;
  public_key?: string;
  raw_response?: Record<string, unknown>;
  redirect_url?: string | null;
  reference?: string;
  source?: string;
  status?: string;
  widget_config?: Record<string, unknown>;
  widget_url?: string;
}

export interface WompiCheckoutResponse {
  checkout: WompiCheckout;
  payment_order: PaymentOrder;
}

export interface WompiAcceptanceToken {
  acceptance_token: string;
  permalink?: string | null;
}

export interface WompiPaymentSourceSetup {
  acceptance: WompiAcceptanceToken;
  api_url: string;
  environment?: string | null;
  personal_data_auth: WompiAcceptanceToken;
  public_key: string;
  source: string;
}

export interface WompiCardDetails {
  card_holder: string;
  cvc: string;
  exp_month: string;
  exp_year: string;
  number: string;
}

export interface WompiCardToken {
  brand?: string;
  card_holder?: string;
  exp_month?: string;
  exp_year?: string;
  id: string;
  last_four?: string;
  name?: string;
}

export interface WompiSessionData {
  device_id?: string;
  session_id?: string;
}

export interface SubscriptionTrialStartResponse {
  payment_order?: PaymentOrder;
  payment_source?: {
    id: number | string;
    provider?: string;
    provider_source_id?: string;
    reusable?: boolean;
    status?: string;
    type?: string;
    verified_at?: string | null;
  };
  subscription?: Record<string, unknown>;
}

export type SubscriptionPaymentSourceStartResponse = SubscriptionTrialStartResponse;

export class PaymentApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'PaymentApiError';
    this.status = status;
  }
}

export async function createWompiCheckout(payload: { plan: string }): Promise<WompiCheckoutResponse> {
  const response = await requestJson<unknown>('/api/payments/wompi/checkout', {
    body: payload,
    method: 'POST',
  });

  return normalizeWompiCheckoutResponse(response);
}

export async function getSubscriptionTrialPaymentSourceSetup(): Promise<WompiPaymentSourceSetup> {
  return getSubscriptionPaymentSourceSetup('/api/subscription/trial/payment-source-setup');
}

export async function getSubscriptionPaymentSourceSetup(
  path = '/api/subscription/payment-source-setup'
): Promise<WompiPaymentSourceSetup> {
  const response = await requestJson<unknown>(path, {
    method: 'GET',
  });

  return normalizeWompiPaymentSourceSetup(response);
}

export async function startSubscriptionTrial(payload: {
  payment_source: {
    accept_personal_auth: string;
    acceptance_token: string;
    customer_data?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    session_id?: string;
    token: string;
    type: 'CARD';
  };
  plan: string;
}): Promise<SubscriptionTrialStartResponse> {
  const response = await requestJson<unknown>('/api/subscription/trial', {
    body: payload,
    method: 'POST',
  });

  return normalizeSubscriptionTrialStartResponse(response);
}

export async function startSubscriptionWithPaymentSource(payload: {
  payment_source: {
    accept_personal_auth: string;
    acceptance_token: string;
    customer_data?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    session_id?: string;
    token: string;
    type: 'CARD';
  };
  plan: string;
}): Promise<SubscriptionPaymentSourceStartResponse> {
  const response = await requestJson<unknown>('/api/subscription/payment-source', {
    body: payload,
    method: 'POST',
  });

  return normalizeSubscriptionTrialStartResponse(response);
}

export async function tokenizeWompiCard(setup: WompiPaymentSourceSetup, card: WompiCardDetails): Promise<WompiCardToken> {
  const response = await fetch(`${setup.api_url.replace(/\/$/u, '')}/tokens/cards`, {
    body: JSON.stringify({
      card_holder: card.card_holder.trim(),
      cvc: card.cvc.trim(),
      exp_month: card.exp_month.trim().padStart(2, '0'),
      exp_year: normalizeExpirationYear(card.exp_year),
      number: card.number.replace(/\D/gu, ''),
    }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${setup.public_key}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new PaymentApiError(await getErrorMessage(response), response.status);
  }

  const json = (await response.json()) as unknown;

  return normalizeWompiCardToken(json);
}

export async function initializeWompiSession(setup: WompiPaymentSourceSetup): Promise<WompiSessionData> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    await loadWompiScript(setup.public_key);

    if (!window.$wompi) {
      return {};
    }

    return await new Promise<WompiSessionData>((resolve) => {
      const timeout = window.setTimeout(() => {
        resolve({});
      }, 3000);

      window.$wompi?.initialize((data, error) => {
        window.clearTimeout(timeout);

        if (error || !data) {
          resolve({});
          return;
        }

        resolve({
          device_id: data.deviceData?.deviceID,
          session_id: data.sessionId,
        });
      });
    });
  } catch {
    return {};
  }
}

export async function getPaymentOrder(paymentOrderId: number | string): Promise<PaymentOrder> {
  const response = await requestJson<unknown>(`/api/payments/${encodeURIComponent(String(paymentOrderId))}`, {
    method: 'GET',
  });

  return normalizePaymentOrderResponse(response);
}

export function savePendingPaymentOrderId(paymentOrderId: number | string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(PENDING_PAYMENT_ORDER_STORAGE_KEY, String(paymentOrderId));
  window.sessionStorage.removeItem(LEGACY_PENDING_PAYMENT_ORDER_STORAGE_KEY);
}

export function getPendingPaymentOrderId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    window.sessionStorage.getItem(PENDING_PAYMENT_ORDER_STORAGE_KEY) ??
    window.sessionStorage.getItem(LEGACY_PENDING_PAYMENT_ORDER_STORAGE_KEY)
  );
}

export function clearPendingPaymentOrderId(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PENDING_PAYMENT_ORDER_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_PENDING_PAYMENT_ORDER_STORAGE_KEY);
}

function normalizeWompiCheckoutResponse(response: unknown): WompiCheckoutResponse {
  const data = getResponseData(response);

  if (!isRecord(data)) {
    throw new Error('Invalid checkout response');
  }

  const paymentOrder = normalizePaymentOrder(data.payment_order ?? data.paymentOrder);
  const checkout = isRecord(data.checkout) ? (data.checkout as WompiCheckout) : {};

  if (!paymentOrder) {
    throw new Error('Invalid payment order response');
  }

  return { checkout, payment_order: paymentOrder };
}

function normalizeWompiPaymentSourceSetup(response: unknown): WompiPaymentSourceSetup {
  const data = getResponseData(response);

  if (!isRecord(data)) {
    throw new Error('Invalid payment source setup response');
  }

  const acceptance = isRecord(data.acceptance) ? data.acceptance : {};
  const personalDataAuth = isRecord(data.personal_data_auth) ? data.personal_data_auth : {};
  const acceptanceToken = getStringField(acceptance, ['acceptance_token', 'acceptanceToken']);
  const personalDataAuthToken = getStringField(personalDataAuth, ['acceptance_token', 'acceptanceToken']);
  const publicKey = getStringField(data, ['public_key', 'publicKey']);
  const apiUrl = getStringField(data, ['api_url', 'apiUrl']);
  const source = getStringField(data, ['source']) ?? 'wompi';

  if (!acceptanceToken || !personalDataAuthToken || !publicKey || !apiUrl) {
    throw new Error('Incomplete payment source setup response');
  }

  return {
    acceptance: {
      acceptance_token: acceptanceToken,
      permalink: getStringField(acceptance, ['permalink']),
    },
    api_url: apiUrl,
    environment: getStringField(data, ['environment']),
    personal_data_auth: {
      acceptance_token: personalDataAuthToken,
      permalink: getStringField(personalDataAuth, ['permalink']),
    },
    public_key: publicKey,
    source,
  };
}

function normalizeSubscriptionTrialStartResponse(response: unknown): SubscriptionTrialStartResponse {
  const data = getResponseData(response);

  return isRecord(data) ? (data as SubscriptionTrialStartResponse) : {};
}

function normalizeWompiCardToken(response: unknown): WompiCardToken {
  const data = getResponseData(response);

  if (!isRecord(data)) {
    throw new Error('Invalid Wompi card token response');
  }

  const tokenId = getStringField(data, ['id']);

  if (!tokenId) {
    throw new Error('Wompi card token was not returned');
  }

  return {
    brand: getStringField(data, ['brand']),
    card_holder: getStringField(data, ['card_holder', 'cardHolder']),
    exp_month: getStringField(data, ['exp_month', 'expMonth']),
    exp_year: getStringField(data, ['exp_year', 'expYear']),
    id: tokenId,
    last_four: getStringField(data, ['last_four', 'lastFour']),
    name: getStringField(data, ['name']),
  };
}

function normalizePaymentOrderResponse(response: unknown): PaymentOrder {
  const data = getResponseData(response);
  const paymentOrder = normalizePaymentOrder(data);

  if (!paymentOrder) {
    throw new Error('Invalid payment order response');
  }

  return paymentOrder;
}

function normalizePaymentOrder(value: unknown): PaymentOrder | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;

  if (typeof id !== 'number' && typeof id !== 'string') {
    return null;
  }

  return value as unknown as PaymentOrder;
}

function getResponseData(response: unknown): unknown {
  if (isApiEnvelope<unknown>(response)) {
    return response.data;
  }

  return response;
}

function isApiEnvelope<T>(response: unknown): response is ApiEnvelope<T> {
  return isRecord(response) && 'data' in response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringField(value: Record<string, unknown>, fields: string[]): string | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue;
    }
  }

  return undefined;
}

function normalizeExpirationYear(value: string): string {
  const digits = value.replace(/\D/gu, '');

  return digits.length > 2 ? digits.slice(-2) : digits.padStart(2, '0');
}

function loadWompiScript(publicKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.$wompi) {
    return Promise.resolve();
  }

  if (wompiScriptPromise) {
    return wompiScriptPromise;
  }

  wompiScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${WOMPI_JS_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Could not load Wompi JS')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.dataset.publicKey = publicKey;
    script.src = WOMPI_JS_URL;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Could not load Wompi JS')), { once: true });
    document.head.appendChild(script);
  });

  return wompiScriptPromise;
}

async function requestJson<T>(path: string, options: RequestOptions): Promise<T> {
  const baseUrl = config.api?.baseUrl;
  const token = getStoredApiToken();
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL env variable');
  }

  if (!token) {
    throw new Error('Missing API access token');
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
    },
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new PaymentApiError(await getErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { errors?: Record<string, string[]>; message?: string };

    if (json.message) {
      return json.message;
    }

    const firstError = Object.values(json.errors ?? {})[0]?.[0];

    if (firstError) {
      return firstError;
    }
  } catch {
    // Fall through to generic message.
  }

  return 'Payment request failed';
}

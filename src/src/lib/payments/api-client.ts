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

const PENDING_PAYMENT_ORDER_STORAGE_KEY = 'voitity.pendingPaymentOrderId';

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
  checkout_url?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  id: number | string;
  paid_at?: string | null;
  plan?: string;
  provider?: string;
  provider_transaction_id?: string | null;
  reference?: string;
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
}

export function getPendingPaymentOrderId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(PENDING_PAYMENT_ORDER_STORAGE_KEY);
}

export function clearPendingPaymentOrderId(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PENDING_PAYMENT_ORDER_STORAGE_KEY);
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

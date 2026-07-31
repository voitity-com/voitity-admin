import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';
import type { PaymentMethod, PaymentOrder } from '@/lib/payments/api-client';

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonObject | JsonPrimitive | JsonValue[];

// Recursive JSON object types require an index signature in TypeScript.
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Recursive JSON object types require an index signature in TypeScript.
export interface JsonObject {
  [key: string]: JsonValue;
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface RequestOptions {
  body?: unknown;
  method?: 'GET' | 'POST';
}

export type SubscriptionLimits = JsonObject;

export interface SubscriptionPlan {
  capabilities?: JsonObject;
  credits?: JsonObject;
  currency: string;
  id: string;
  interval: string;
  limits?: JsonObject;
  name: string;
  price_usd: null | number;
  purchasable?: boolean;
}

export interface SubscriptionPlans {
  display_currency?: string;
  exchange_rate?: number;
  plans: SubscriptionPlan[];
  processing_currency?: string;
  trial?: SubscriptionTrial;
}

export interface SubscriptionTrial {
  available: boolean;
  days: number;
  enabled: boolean;
  setup_amount_cop?: number;
  setup_amount_in_cents?: number;
  setup_amount_usd?: number;
}

export interface SubscriptionActionResponse {
  subscription?: JsonObject;
}

export interface SubscriptionBillingState {
  last_payment_order?: PaymentOrder | null;
  payment_method?: PaymentMethod | null;
  payment_recovery: {
    automatic_retries_remaining: number;
    can_retry_now: boolean;
    failed_at?: string | null;
    has_pending_payment: boolean;
    next_retry_at?: string | null;
    reason_code?: string | null;
    required: boolean;
    retry_count: number;
  };
  subscription?: JsonObject | null;
}

export interface SubscriptionRenewalRetryResult {
  outcome: string;
  payment_order?: PaymentOrder | null;
  subscription?: JsonObject | null;
}

export interface CreditWallet {
  available: number;
  debt: number;
  lifetime_consumed: number;
  lifetime_purchased: number;
  reserved: number;
  units_per_credit: number;
}

export interface CreditPackage {
  credits: number;
  price_usd: number;
}

export interface CreditCatalog {
  currency: string;
  enabled: boolean;
  maximum_purchase_credits: number;
  minimum_purchase_credits: number;
  packages: CreditPackage[];
  price_per_1000_usd: number;
  purchase_step_credits: number;
  rates: Record<string, number>;
  tariff_version?: string;
}

export interface CreditPaymentOrder {
  amounts?: {
    display_amount_usd?: number;
  };
  created_at?: string;
  credits: number;
  id: number | string;
  product_type: string;
  reference?: string;
  status: string;
}

export interface CreditPurchaseResult {
  payment_order: CreditPaymentOrder;
  wallet: CreditWallet;
}

export interface CreditPurchases {
  items: CreditPaymentOrder[];
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface UsageAnalytics {
  periods: {
    id: number | string;
    included: Record<string, number>;
    period_renews_at: string;
    period_started_at: string;
    plan: string;
    plan_used: Record<string, number>;
    purchased_credits_used: number;
  }[];
  range: {
    from: string;
    group_by: 'day' | 'month';
    timezone: string;
    to: string;
  };
  series: {
    bucket: string;
    credits: {
      consumed: number;
      purchased: number;
      reserved: number;
      reversed: number;
    };
    services: Record<string, { operations: number; purchased_credits: number }>;
  }[];
  summary: {
    credit_covered: Record<string, number>;
    credits: {
      consumed: number;
      purchased: number;
      reserved: number;
      reversed: number;
    };
    plan_used: Record<string, number>;
  };
  wallet: CreditWallet;
}

export class SubscriptionApiError extends Error {
  public code?: string;

  public errors?: Record<string, string[]>;

  public status: number;

  public constructor(message: string, status: number, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'SubscriptionApiError';
    this.code = code;
    this.errors = errors;
    this.status = status;
  }
}

export async function getSubscriptionLimits(): Promise<SubscriptionLimits> {
  const response = await requestJson<unknown>('/api/subscription/limits', { method: 'GET' });

  return normalizeSubscriptionLimitsResponse(response);
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlans> {
  const response = await requestJson<unknown>('/api/subscription/plans', { method: 'GET' });

  return normalizeSubscriptionPlansResponse(response);
}

export async function cancelSubscriptionTrial(): Promise<SubscriptionActionResponse> {
  const response = await requestJson<unknown>('/api/subscription/trial/cancel', { method: 'POST' });

  return normalizeSubscriptionActionResponse(response);
}

export async function cancelSubscriptionRenewal(): Promise<SubscriptionActionResponse> {
  const response = await requestJson<unknown>('/api/subscription/renewal/cancel', { method: 'POST' });

  return normalizeSubscriptionActionResponse(response);
}

export async function reactivateSubscriptionRenewal(): Promise<SubscriptionActionResponse> {
  const response = await requestJson<unknown>('/api/subscription/renewal/reactivate', { method: 'POST' });

  return normalizeSubscriptionActionResponse(response);
}

export async function getSubscriptionBillingState(): Promise<SubscriptionBillingState> {
  const response = await requestJson<unknown>('/api/subscription/billing-state', { method: 'GET' });

  return getTypedResponseData<SubscriptionBillingState>(response, 'Invalid subscription billing state response');
}

export async function retrySubscriptionRenewal(): Promise<SubscriptionRenewalRetryResult> {
  const response = await requestJson<unknown>('/api/subscription/renewal/retry', { method: 'POST' });

  return getTypedResponseData<SubscriptionRenewalRetryResult>(response, 'Invalid subscription renewal response');
}

export async function getCreditCatalog(): Promise<CreditCatalog> {
  const response = await requestJson<unknown>('/api/credits/catalog', { method: 'GET' });

  return getTypedResponseData<CreditCatalog>(response, 'Invalid credit catalog response');
}

export async function getCreditWallet(): Promise<CreditWallet> {
  const response = await requestJson<unknown>('/api/credits/wallet', { method: 'GET' });

  return getTypedResponseData<CreditWallet>(response, 'Invalid credit wallet response');
}

export async function getCreditPurchases(): Promise<CreditPurchases> {
  const response = await requestJson<unknown>('/api/credits/purchases', { method: 'GET' });

  return getTypedResponseData<CreditPurchases>(response, 'Invalid credit purchases response');
}

export async function purchaseCredits(payload: {
  credits: number;
  idempotency_key: string;
  payment_source_id: number | string;
  terms_accepted: true;
}): Promise<CreditPurchaseResult> {
  const response = await requestJson<unknown>('/api/credits/purchases', {
    body: payload,
    method: 'POST',
  });

  return getTypedResponseData<CreditPurchaseResult>(response, 'Invalid credit purchase response');
}

export async function getUsageAnalytics(params: {
  from: string;
  groupBy?: 'day' | 'month';
  to: string;
}): Promise<UsageAnalytics> {
  const search = new URLSearchParams({
    from: params.from,
    group_by: params.groupBy ?? 'month',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    to: params.to,
  });
  const response = await requestJson<unknown>(`/api/usage?${search.toString()}`, { method: 'GET' });

  return getTypedResponseData<UsageAnalytics>(response, 'Invalid usage analytics response');
}

function getTypedResponseData<T>(response: unknown, message: string): T {
  const data = getResponseData(response);

  if (!isRecord(data)) {
    throw new Error(message);
  }

  return data as T;
}

function normalizeSubscriptionLimitsResponse(response: unknown): SubscriptionLimits {
  const data = getResponseData(response);

  if (isRecord(data)) {
    const nestedLimits = getFirstRecordField(data, ['subscription_limits', 'subscriptionLimits']);

    return nestedLimits ?? data;
  }

  if (Array.isArray(data)) {
    return { items: data as JsonValue[] };
  }

  if (isJsonPrimitive(data)) {
    return { value: data };
  }

  return {};
}

function normalizeSubscriptionPlansResponse(response: unknown): SubscriptionPlans {
  const data = getResponseData(response);

  if (Array.isArray(data)) {
    return { plans: data.map(normalizeSubscriptionPlan).filter(isSubscriptionPlan) };
  }

  if (!isRecord(data)) {
    return { plans: [] };
  }

  const rawPlans = Array.isArray(data.plans) ? data.plans : [];

  return {
    display_currency: getStringField(data, ['display_currency', 'displayCurrency']),
    exchange_rate: getNumberField(data, ['exchange_rate', 'exchangeRate']),
    plans: rawPlans.map(normalizeSubscriptionPlan).filter(isSubscriptionPlan),
    processing_currency: getStringField(data, ['processing_currency', 'processingCurrency']),
    trial: normalizeSubscriptionTrial(data.trial),
  };
}

function normalizeSubscriptionActionResponse(response: unknown): SubscriptionActionResponse {
  const data = getResponseData(response);

  if (!isRecord(data)) {
    return {};
  }

  return {
    subscription: getFirstRecordField(data, ['subscription']),
  };
}

function normalizeSubscriptionPlan(value: unknown): SubscriptionPlan | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getStringField(value, ['id', 'plan', 'slug']);
  const name = getStringField(value, ['name', 'plan_name', 'planName']);

  if (!id || !name) {
    return null;
  }

  return {
    capabilities: isRecord(value.capabilities) ? value.capabilities : undefined,
    credits: isRecord(value.credits) ? value.credits : undefined,
    currency: getStringField(value, ['currency']) ?? 'USD',
    id,
    interval: getStringField(value, ['interval', 'billing_cycle', 'billingCycle']) ?? 'monthly',
    limits: isRecord(value.limits) ? value.limits : undefined,
    name,
    price_usd: getNullableNumberField(value, ['price_usd', 'priceUsd', 'price']),
    purchasable: typeof value.purchasable === 'boolean' ? value.purchasable : undefined,
  };
}

function isSubscriptionPlan(value: SubscriptionPlan | null): value is SubscriptionPlan {
  return value !== null;
}

function normalizeSubscriptionTrial(value: unknown): SubscriptionTrial | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    available: getBooleanField(value, ['available']) ?? false,
    days: getNumberField(value, ['days']) ?? 7,
    enabled: getBooleanField(value, ['enabled']) ?? false,
    setup_amount_cop: getNumberField(value, ['setup_amount_cop', 'setupAmountCop']),
    setup_amount_in_cents: getNumberField(value, ['setup_amount_in_cents', 'setupAmountInCents']),
    setup_amount_usd: getNumberField(value, ['setup_amount_usd', 'setupAmountUsd']),
  };
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

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return value === null || ['boolean', 'number', 'string'].includes(typeof value);
}

function getFirstRecordField(value: JsonObject, fields: string[]): JsonObject | undefined {
  for (const field of fields) {
    const recordValue = value[field];

    if (isRecord(recordValue)) {
      return recordValue;
    }
  }

  return undefined;
}

function getStringField(value: JsonObject, fields: string[]): string | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'string' && rawValue) {
      return rawValue;
    }
  }

  return undefined;
}

function getNumberField(value: JsonObject, fields: string[]): number | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return rawValue;
    }

    if (typeof rawValue === 'string') {
      const parsedValue = Number(rawValue);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return undefined;
}

function getBooleanField(value: JsonObject, fields: string[]): boolean | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'boolean') {
      return rawValue;
    }
  }

  return undefined;
}

function getNullableNumberField(value: JsonObject, fields: string[]): null | number {
  for (const field of fields) {
    const rawValue = value[field];

    if (rawValue === null) {
      return null;
    }

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return rawValue;
    }

    if (typeof rawValue === 'string') {
      const parsedValue = Number(rawValue);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return null;
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
    const error = await getApiError(response);

    throw new SubscriptionApiError(error.message, response.status, error.code, error.errors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getApiError(response: Response): Promise<{
  code?: string;
  errors?: Record<string, string[]>;
  message: string;
}> {
  try {
    const json = (await response.json()) as {
      code?: string;
      errors?: Record<string, string[]>;
      message?: string;
    };

    if (json.message) {
      return {
        code: json.code,
        errors: json.errors,
        message: json.message,
      };
    }

    const firstError = Object.values(json.errors ?? {})[0]?.[0];

    if (firstError) {
      return {
        code: json.code,
        errors: json.errors,
        message: firstError,
      };
    }
  } catch {
    // Fall through to generic message.
  }

  return { message: 'Subscription request failed' };
}

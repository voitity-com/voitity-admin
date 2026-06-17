import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

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
  method?: 'GET';
}

export type SubscriptionLimits = JsonObject;

export class SubscriptionApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'SubscriptionApiError';
    this.status = status;
  }
}

export async function getSubscriptionLimits(): Promise<SubscriptionLimits> {
  const response = await requestJson<unknown>('/api/subscription/limits', { method: 'GET' });

  return normalizeSubscriptionLimitsResponse(response);
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

async function requestJson<T>(path: string, options: RequestOptions): Promise<T> {
  const baseUrl = config.api?.baseUrl;
  const token = getStoredApiToken();

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL env variable');
  }

  if (!token) {
    throw new Error('Missing API access token');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new SubscriptionApiError(await getErrorMessage(response), response.status);
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

  return 'Subscription request failed';
}

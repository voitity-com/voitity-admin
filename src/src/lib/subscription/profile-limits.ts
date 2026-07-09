import type { JsonObject, JsonValue } from '@/lib/subscription/api-client';

const limitFields = ['limit', 'max', 'maximum', 'total', 'allowed', 'included'] as const;
const remainingFields = ['remaining', 'available', 'left'] as const;
const usedFields = ['used', 'current', 'count', 'usage', 'consumed'] as const;

export function isSingleProfilePlan(data: JsonObject): boolean {
  const profileLimit = getProfileCreationLimit(data);

  if (typeof profileLimit === 'number') {
    return profileLimit <= 1;
  }

  return false;
}

export function getProfileCreationLimit(data: JsonObject): number | undefined {
  const profileLimit = getProfileLimit(data);

  if (typeof profileLimit === 'number') {
    return profileLimit;
  }

  return isStarterSubscription(data) ? 1 : undefined;
}

export function canCreateProfileWithLimit(profileCount: number, profileLimit: number | undefined): boolean {
  return typeof profileLimit !== 'number' || profileCount < profileLimit;
}

function isStarterSubscription(data: JsonObject): boolean {
  const subscription = getRecordField(data, ['subscription']) ?? data;
  const values = [
    getStringField(subscription, ['plan', 'plan_id', 'planId', 'id']),
    getStringField(subscription, ['name', 'plan_name', 'planName']),
  ];

  return values.some((value) => normalizePlanValue(value).includes('starter'));
}

function getProfileLimit(data: JsonObject): number | undefined {
  const sources = [
    getRecordField(data, ['limits']),
    getRecordField(data, ['quota']),
    getRecordField(data, ['quotas']),
    data,
  ].filter((source): source is JsonObject => Boolean(source));

  for (const source of sources) {
    const limit = getProfileLimitFromSource(source);

    if (typeof limit === 'number') {
      return limit;
    }
  }

  return undefined;
}

function getProfileLimitFromSource(source: JsonObject): number | undefined {
  for (const [key, value] of Object.entries(source)) {
    if (!isProfileMetricKey(key)) {
      continue;
    }

    const limit = getMetricLimit(value);

    if (typeof limit === 'number') {
      return limit;
    }
  }

  return undefined;
}

function isProfileMetricKey(key: string): boolean {
  return ['profile', 'profiles'].includes(normalizePlanValue(key));
}

function getMetricLimit(value: JsonValue | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  if (!isRecord(value) || value.unlimited === true || hasNullField(value, limitFields)) {
    return undefined;
  }

  const explicitLimit = getNumberField(value, limitFields);
  const used = getNumberField(value, usedFields);
  const remaining = getNumberField(value, remainingFields);
  const inferredLimit =
    typeof used === 'number' && typeof remaining === 'number' ? used + remaining : undefined;
  const limit = explicitLimit ?? inferredLimit;

  return limit === -1 ? undefined : limit;
}

function getRecordField(value: JsonObject, fields: readonly string[]): JsonObject | undefined {
  for (const field of fields) {
    const recordValue = value[field];

    if (isRecord(recordValue)) {
      return recordValue;
    }
  }

  return undefined;
}

function getStringField(value: JsonObject, fields: readonly string[]): string | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'string' && rawValue) {
      return rawValue;
    }
  }

  return undefined;
}

function getNumberField(value: JsonObject, fields: readonly string[]): number | undefined {
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

function hasNullField(value: JsonObject, fields: readonly string[]): boolean {
  return fields.some((field) => value[field] === null);
}

function normalizePlanValue(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

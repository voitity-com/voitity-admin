import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface RequestOptions {
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'POST';
}

export type ProfileDomainStatus =
  | 'activating'
  | 'active'
  | 'disconnecting'
  | 'failed'
  | 'pending_certificate'
  | 'pending_dns'
  | 'pending_provisioning';

export interface ProfileDomainDnsRecord {
  name: string;
  purpose: string;
  type: string;
  value: string;
}

export interface ProfileDomainSettings {
  activatedAt: null | string;
  active: boolean;
  certificateStatus: null | string;
  createdAt: null | string;
  dnsRecords: ProfileDomainDnsRecord[];
  dnsStatus: null | string;
  error: null | { code: null | string; message: string };
  hostname: string;
  id: string;
  lastCheckedAt: null | string;
  publicUrl: string;
  requestedAt: null | string;
  retryable: boolean;
  status: ProfileDomainStatus;
  updatedAt: null | string;
}

export class ProfileDomainApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'ProfileDomainApiError';
    this.status = status;
  }
}

export async function getProfileDomain(profileId: number | string): Promise<null | ProfileDomainSettings> {
  const response = await requestJson<ApiEnvelope<{ domain: unknown }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/domain`,
    { method: 'GET' }
  );

  return response.data.domain === null ? null : normalizeDomain(response.data.domain);
}

export async function configureProfileDomain(
  profileId: number | string,
  hostname: string
): Promise<ProfileDomainSettings> {
  const response = await requestJson<ApiEnvelope<{ domain: unknown }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/domain`,
    { body: { hostname }, method: 'POST' }
  );

  return normalizeDomain(response.data.domain);
}

export async function verifyProfileDomain(profileId: number | string): Promise<ProfileDomainSettings> {
  const response = await requestJson<ApiEnvelope<{ domain: unknown }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/domain/verify`,
    { method: 'POST' }
  );

  return normalizeDomain(response.data.domain);
}

export async function disconnectProfileDomain(profileId: number | string): Promise<ProfileDomainSettings> {
  const response = await requestJson<ApiEnvelope<{ domain: unknown }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/domain`,
    { method: 'DELETE' }
  );

  return normalizeDomain(response.data.domain);
}

function normalizeDomain(value: unknown): ProfileDomainSettings {
  const domain = isRecord(value) ? value : {};
  const error = isRecord(domain.error) ? domain.error : null;

  return {
    activatedAt: optionalString(domain.activated_at),
    active: domain.active === true,
    certificateStatus: optionalString(domain.certificate_status),
    createdAt: optionalString(domain.created_at),
    dnsRecords: Array.isArray(domain.dns_records)
      ? domain.dns_records.map(normalizeDnsRecord).filter((record) => record.value !== '')
      : [],
    dnsStatus: optionalString(domain.dns_status),
    error: error ? { code: optionalString(error.code), message: stringValue(error.message) } : null,
    hostname: stringValue(domain.hostname),
    id: String(domain.id ?? ''),
    lastCheckedAt: optionalString(domain.last_checked_at),
    publicUrl: stringValue(domain.public_url),
    requestedAt: optionalString(domain.requested_at),
    retryable: domain.retryable === true,
    status: normalizeStatus(domain.status),
    updatedAt: optionalString(domain.updated_at),
  };
}

function normalizeDnsRecord(value: unknown): ProfileDomainDnsRecord {
  const record = isRecord(value) ? value : {};

  return {
    name: stringValue(record.name),
    purpose: stringValue(record.purpose),
    type: stringValue(record.type),
    value: stringValue(record.value),
  };
}

function normalizeStatus(value: unknown): ProfileDomainStatus {
  const statuses: ProfileDomainStatus[] = [
    'activating',
    'active',
    'disconnecting',
    'failed',
    'pending_certificate',
    'pending_dns',
    'pending_provisioning',
  ];

  return statuses.includes(value as ProfileDomainStatus) ? (value as ProfileDomainStatus) : 'pending_provisioning';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown): null | string {
  const normalized = stringValue(value).trim();
  return normalized || null;
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

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body,
    cache: options.method === 'GET' ? 'no-store' : undefined,
    headers,
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new ProfileDomainApiError(await errorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { errors?: Record<string, string[]>; message?: string };
    return payload.message ?? Object.values(payload.errors ?? {})[0]?.[0] ?? 'Domain request failed';
  } catch {
    return 'Domain request failed';
  }
}

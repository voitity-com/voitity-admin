import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

export type ActivationEventName =
  | 'trial_started'
  | 'profile_created'
  | 'avatar_added'
  | 'source_synchronized'
  | 'profile_published'
  | 'whatsapp_added'
  | 'product_created'
  | 'conversation_started'
  | 'link_copied';

export interface ActivationOverview {
  activation_rate: number;
  average_hours_to_publish: null | number;
  converted_to_paid: number;
  paid_conversion_rate: number;
  payment_failed: number;
  trial_cancelled: number;
  trials_started: number;
  users_activated: number;
}

export interface ActivationFunnelStage {
  conversion_previous: number;
  conversion_total: number;
  drop_off: number;
  event: ActivationEventName;
  users: number;
}

export interface ActivationCampaign {
  campaign: null | string;
  converted_to_paid: number;
  medium: null | string;
  profiles_published: number;
  source: null | string;
  trials_started: number;
  users_activated: number;
}

export interface ActivationReport {
  campaigns: ActivationCampaign[];
  funnel: ActivationFunnelStage[];
  overview: ActivationOverview;
  period: { from: string; to: string };
}

export interface ActivationReportUser {
  activated: boolean;
  attribution: {
    utm_campaign?: null | string;
    utm_content?: null | string;
    utm_medium?: null | string;
    utm_source?: null | string;
  };
  completed_events: ActivationEventName[];
  email: string;
  id: number | string;
  last_event?: ActivationEventName | null;
  name: string;
  next_step?: ActivationEventName | null;
  plan?: null | string;
  profile?: null | { alias: string; id: number | string; name: string; published: boolean };
  subscription_status?: null | string;
  trial_days_remaining?: null | number;
  trial_ends_at?: null | string;
  trial_started_at?: null | string;
}

export interface ActivationReportUsersPage {
  pagination: { current_page: number; last_page: number; per_page: number; total: number };
  users: ActivationReportUser[];
}

export interface ActivationReportFilters {
  campaign?: string;
  from: string;
  medium?: string;
  page?: number;
  perPage?: number;
  search?: string;
  source?: string;
  to: string;
}

export class ReportApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ReportApiError';
  }
}

export async function getActivationReport(filters: ActivationReportFilters): Promise<ActivationReport> {
  const response = await requestJson<{ data: ActivationReport }>(
    `/api/admin/reports/activation?${toSearchParams(filters, false).toString()}`
  );

  return response.data;
}

export async function listActivationReportUsers(
  filters: ActivationReportFilters
): Promise<ActivationReportUsersPage> {
  const response = await requestJson<{ data: ActivationReportUsersPage }>(
    `/api/admin/reports/activation/users?${toSearchParams(filters, true).toString()}`
  );

  return response.data;
}

function toSearchParams(filters: ActivationReportFilters, includeUsers: boolean): URLSearchParams {
  const search = new URLSearchParams({ from: filters.from, to: filters.to });

  for (const key of ['campaign', 'source', 'medium'] as const) {
    const value = filters[key]?.trim();
    if (value) search.set(key, value);
  }

  if (includeUsers) {
    if (filters.search?.trim()) search.set('search', filters.search.trim());
    search.set('page', String(filters.page ?? 1));
    search.set('per_page', String(filters.perPage ?? 20));
  }

  return search;
}

async function requestJson<T>(path: string): Promise<T> {
  const baseUrl = config.api?.baseUrl;
  const token = getStoredApiToken();

  if (!baseUrl) throw new Error('Missing VITE_API_BASE_URL env variable');
  if (!token) throw new Error('Missing API access token');

  const response = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let message = 'Report request failed';

    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      // Keep the fallback message.
    }

    throw new ReportApiError(message, response.status);
  }

  return (await response.json()) as T;
}

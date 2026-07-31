import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

export interface CreateSupportRequestPayload {
  description: string;
  profileId?: null | number | string;
}

export interface SupportRequestRecord {
  id: number | string;
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export class SupportApiError extends Error {
  public errors: Record<string, string[]>;
  public status: number;

  public constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'SupportApiError';
    this.errors = errors;
    this.status = status;
  }
}

export async function createSupportRequest(payload: CreateSupportRequestPayload): Promise<SupportRequestRecord> {
  const baseUrl = config.api?.baseUrl;
  const token = getStoredApiToken();

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL env variable');
  }

  if (!token) {
    throw new Error('Missing API access token');
  }

  const response = await fetch(`${baseUrl}/api/support-requests`, {
    body: JSON.stringify({
      description: payload.description,
      profile_id: payload.profileId ?? null,
    }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    const { errors, message } = await getErrorDetails(response);
    throw new SupportApiError(message, response.status, errors);
  }

  const result = (await response.json()) as ApiEnvelope<SupportRequestRecord> | SupportRequestRecord;

  return 'data' in result ? result.data : result;
}

async function getErrorDetails(response: Response): Promise<{ errors: Record<string, string[]>; message: string }> {
  try {
    const json = (await response.json()) as { errors?: Record<string, string[]>; message?: string };
    const errors = json.errors ?? {};
    const firstError = Object.values(errors)[0]?.[0];

    return {
      errors,
      message: firstError ?? json.message ?? 'Support request failed',
    };
  } catch {
    return { errors: {}, message: 'Support request failed' };
  }
}

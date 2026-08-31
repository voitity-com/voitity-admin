import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export interface ProfileAppearanceSettings {
  backgroundImageUrl: null | string;
  backgroundType: 'css' | 'image';
  hasBackgroundImage: boolean;
  templateKey: string;
  updatedAt: null | string;
}

export interface ProfileTemplateOption {
  backgroundColor: string;
  key: string;
  label: string;
}

export interface ProfileAppearanceConfiguration {
  appearance: ProfileAppearanceSettings;
  templates: ProfileTemplateOption[];
}

export class ProfileAppearanceApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'ProfileAppearanceApiError';
    this.status = status;
  }
}

export async function getProfileAppearance(profileId: number | string): Promise<ProfileAppearanceConfiguration> {
  return requestConfiguration(`/api/profile/${encodeURIComponent(String(profileId))}/appearance`, {
    method: 'GET',
  });
}

export async function updateProfileAppearance(
  profileId: number | string,
  input: { backgroundType: 'css' | 'image'; templateKey: string }
): Promise<ProfileAppearanceConfiguration> {
  return requestConfiguration(`/api/profile/${encodeURIComponent(String(profileId))}/appearance`, {
    body: JSON.stringify({ background_type: input.backgroundType, template_key: input.templateKey }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });
}

export async function uploadProfileBackgroundImage(
  profileId: number | string,
  image: File,
  templateKey: string
): Promise<ProfileAppearanceConfiguration> {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('template_key', templateKey);

  return requestConfiguration(`/api/profile/${encodeURIComponent(String(profileId))}/appearance/background-image`, {
    body: formData,
    method: 'POST',
  });
}

function normalizeConfiguration(value: unknown): ProfileAppearanceConfiguration {
  const data = isRecord(value) ? value : {};
  const appearance = isRecord(data.appearance) ? data.appearance : {};
  const templates = Array.isArray(data.templates) ? data.templates : [];

  return {
    appearance: {
      backgroundImageUrl: optionalString(appearance.background_image_url),
      backgroundType: appearance.background_type === 'image' ? 'image' : 'css',
      hasBackgroundImage: appearance.has_background_image === true,
      templateKey: stringValue(appearance.template_key) || 'profile01',
      updatedAt: optionalString(appearance.updated_at),
    },
    templates: templates.flatMap((templateValue): ProfileTemplateOption[] => {
      const template = isRecord(templateValue) ? templateValue : {};
      const key = stringValue(template.key);

      if (!key) {
        return [];
      }

      return [
        {
          backgroundColor: stringValue(template.background_color) || '#ffffff',
          key,
          label: stringValue(template.label) || key,
        },
      ];
    }),
  };
}

async function requestConfiguration(path: string, init: RequestInit): Promise<ProfileAppearanceConfiguration> {
  const baseUrl = config.api?.baseUrl;
  const token = getStoredApiToken();

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL env variable');
  }

  if (!token) {
    throw new Error('Missing API access token');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: init.method === 'GET' ? 'no-store' : undefined,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ProfileAppearanceApiError(await errorMessage(response), response.status);
  }

  const payload = (await response.json()) as ApiEnvelope<unknown>;
  return normalizeConfiguration(payload.data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalString(value: unknown): null | string {
  return stringValue(value) || null;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { errors?: Record<string, string[]>; message?: string };
    return payload.message ?? Object.values(payload.errors ?? {})[0]?.[0] ?? 'Profile appearance request failed';
  } catch {
    return 'Profile appearance request failed';
  }
}

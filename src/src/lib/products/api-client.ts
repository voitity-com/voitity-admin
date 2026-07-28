import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface RequestOptions {
  body?: BodyInit | Record<string, unknown>;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
}

export type ProfileProductDestinationType = 'external_url' | 'telegram' | 'whatsapp';
export type ProfileProductStatus = 'draft' | 'published';
export type ProfileProductImportRowStatus = 'duplicate_existing' | 'duplicate_file' | 'invalid' | 'valid';
export type ProfileProductImportAction = 'import' | 'replace' | 'skip';

export interface ProfileProduct {
  action_url: string;
  country_code?: null | string;
  created_at?: null | string;
  description: string;
  destination_type: ProfileProductDestinationType;
  destination_url?: null | string;
  external_id?: null | string;
  id: number;
  image_source: 'remote' | 'uploaded';
  image_url: string;
  message_preview: string;
  name: string;
  phone_number?: null | string;
  public_id: string;
  public_url: string;
  published_at?: null | string;
  slug: string;
  status: ProfileProductStatus;
  updated_at?: null | string;
}

export interface ProfileProductsPage {
  available_slots: number;
  max_products: number;
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  products: ProfileProduct[];
  products_enabled: boolean;
}

export interface ProfileProductInput {
  countryCode?: string;
  description: string;
  destinationType: ProfileProductDestinationType;
  destinationUrl?: string;
  image?: File;
  name: string;
  phoneNumber?: string;
  status: ProfileProductStatus;
}

export interface ProfileProductImportPayload {
  country_code?: null | string;
  description: string;
  destination_type: ProfileProductDestinationType;
  destination_url?: null | string;
  external_id?: null | string;
  image_url: string;
  name: string;
  phone_number?: null | string;
  status: ProfileProductStatus;
}

export interface ProfileProductImportRow {
  duplicate_product?: null | Pick<ProfileProduct, 'id' | 'image_url' | 'name' | 'status'>;
  duplicate_row_id?: null | number;
  duplicate_row_number?: null | number;
  errors?: null | Record<string, string[]>;
  id: number;
  payload: ProfileProductImportPayload;
  row_number: number;
  status: ProfileProductImportRowStatus;
}

export interface ProfileProductImportPreview {
  applied_at?: null | string;
  duplicate_rows: number;
  id: number;
  invalid_rows: number;
  original_filename: string;
  rows: ProfileProductImportRow[];
  status: 'applied' | 'previewed';
  summary: {
    available_slots: number;
    current_products: number;
    max_products: number;
  };
  total_rows: number;
  valid_rows: number;
}

export interface ProfileProductImportResult {
  created: number;
  product_count: number;
  replaced: number;
  skipped: number;
}

export class ProductApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'ProductApiError';
    this.status = status;
  }
}

export async function listProfileProducts(profileId: number | string): Promise<ProfileProductsPage> {
  const response = await requestJson<ApiEnvelope<ProfileProductsPage>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/products?per_page=100`,
    { method: 'GET' }
  );

  return response.data;
}

export async function createProfileProduct(
  profileId: number | string,
  input: ProfileProductInput
): Promise<ProfileProduct> {
  const response = await requestJson<ApiEnvelope<ProfileProduct>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/products`,
    {
      body: productFormData(input, true),
      method: 'POST',
    }
  );

  return response.data;
}

export async function updateProfileProduct(
  profileId: number | string,
  productId: number | string,
  input: ProfileProductInput
): Promise<ProfileProduct> {
  const response = await requestJson<ApiEnvelope<ProfileProduct>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/products/${encodeURIComponent(String(productId))}`,
    {
      body: productFormData(input, false),
      method: 'POST',
    }
  );

  return response.data;
}

export async function deleteProfileProduct(profileId: number | string, productId: number | string): Promise<void> {
  await requestJson(
    `/api/profile/${encodeURIComponent(String(profileId))}/products/${encodeURIComponent(String(productId))}`,
    {
      method: 'DELETE',
    }
  );
}

export async function setProfileProductsEnabled(profileId: number | string, enabled: boolean): Promise<boolean> {
  const response = await requestJson<ApiEnvelope<{ products_enabled: boolean }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/products/settings`,
    {
      body: { enabled },
      method: 'PATCH',
    }
  );

  return response.data.products_enabled;
}

export async function bulkUpdateProfileProductStatus(
  profileId: number | string,
  productIds: number[],
  status: ProfileProductStatus
): Promise<number> {
  const response = await requestJson<ApiEnvelope<{ updated: number }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/products/bulk/status`,
    {
      body: { product_ids: productIds, status },
      method: 'PATCH',
    }
  );

  return response.data.updated;
}

export async function bulkUpdateProfileProductDestination(
  profileId: number | string,
  productIds: number[],
  destination: {
    countryCode: string;
    destinationType: Exclude<ProfileProductDestinationType, 'external_url'>;
    phoneNumber: string;
  }
): Promise<number> {
  const response = await requestJson<ApiEnvelope<{ updated: number }>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/products/bulk/destination`,
    {
      body: {
        country_code: destination.countryCode,
        destination_type: destination.destinationType,
        phone_number: destination.phoneNumber,
        product_ids: productIds,
      },
      method: 'PATCH',
    }
  );

  return response.data.updated;
}

export async function previewProfileProductCsv(
  profileId: number | string,
  file: File
): Promise<ProfileProductImportPreview> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await requestJson<ApiEnvelope<ProfileProductImportPreview>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/products/imports/preview`,
    {
      body: formData,
      method: 'POST',
    }
  );

  return response.data;
}

export async function applyProfileProductCsv(
  profileId: number | string,
  importId: number | string,
  rows: { action: ProfileProductImportAction; id: number }[]
): Promise<ProfileProductImportResult> {
  const response = await requestJson<ApiEnvelope<ProfileProductImportResult>>(
    `/api/profile/${encodeURIComponent(String(profileId))}/products/imports/${encodeURIComponent(String(importId))}/apply`,
    {
      body: { rows },
      method: 'POST',
    }
  );

  return response.data;
}

export async function downloadProfileProductCsvTemplate(profileId: number | string): Promise<void> {
  const response = await request(`/api/profile/${encodeURIComponent(String(profileId))}/products/imports/template`, {
    method: 'GET',
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getDownloadFilename(response) ?? 'bigmelo-products-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function productFormData(input: ProfileProductInput, requireImage: boolean): FormData {
  const formData = new FormData();

  formData.append('name', input.name.trim());
  formData.append('description', input.description.trim());
  formData.append('destination_type', input.destinationType);
  formData.append('status', input.status);

  if (input.image) {
    formData.append('image', input.image);
  } else if (requireImage) {
    throw new Error('A product image is required.');
  }

  if (input.destinationType === 'external_url') {
    formData.append('destination_url', input.destinationUrl?.trim() ?? '');
  } else {
    formData.append('country_code', input.countryCode?.trim() ?? '');
    formData.append('phone_number', input.phoneNumber?.trim() ?? '');
  }

  return formData;
}

async function requestJson<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await request(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function request(path: string, options: RequestOptions): Promise<Response> {
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
  const isFormData = options.body instanceof FormData;
  let body: BodyInit | undefined;

  if (isFormData) {
    body = options.body as FormData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body,
    cache: options.method === 'GET' || !options.method ? 'no-store' : undefined,
    headers,
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new ProductApiError(await getErrorMessage(response), response.status);
  }

  return response;
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
    // Use the generic request message below.
  }

  return 'Product request failed';
}

function getDownloadFilename(response: Response): null | string {
  const match = response.headers.get('content-disposition')?.match(/filename="?(?<filename>[^"]+)"?/i);

  return match?.groups?.filename ?? null;
}

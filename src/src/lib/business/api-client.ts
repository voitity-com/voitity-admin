import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

export type BusinessStatus = 'active' | 'draft' | 'paused';
export type BusinessLeadStatus = 'contacted' | 'created' | 'no_response' | 'sale';
export type BusinessNodeType = 'action' | 'decision' | 'instruction';

export interface Business {
  activated_at?: null | string;
  created_at?: null | string;
  description?: null | string;
  id: number;
  leads_count?: number;
  name: string;
  sources_count?: number;
  status: BusinessStatus;
  updated_at?: null | string;
}

export interface BusinessPayload {
  description?: null | string;
  name: string;
}

export interface BusinessSource {
  created_at?: null | string;
  id: number;
  indexed_at?: null | string;
  name: string;
  original_filename?: null | string;
  status: 'failed' | 'indexed' | 'processing';
  token_count: number;
  type: string;
  updated_at?: null | string;
}

export interface BusinessFlowNode {
  config: Record<string, unknown>;
  key: string;
  title: string;
  type: BusinessNodeType;
  x: number;
  y: number;
}

export interface BusinessFlowEdge {
  config: Record<string, unknown>;
  key: string;
  label?: null | string;
  source: string;
  source_handle?: null | string;
  target: string;
}

export interface BusinessFlowGraph {
  edges: BusinessFlowEdge[];
  nodes: BusinessFlowNode[];
}

export interface BusinessFlowResponse {
  draft_version: (BusinessFlowGraph & { id: number; revision: number; version: number }) | null;
  id: number;
  published_version: null | { id: number; published_at?: null | string; version: number };
}

export interface BusinessLead {
  ai_solution_summary?: null | string;
  company?: null | string;
  created_at?: null | string;
  email?: null | string;
  full_name?: null | string;
  id: number;
  phone?: null | string;
  project_summary?: null | string;
  status: BusinessLeadStatus;
  website?: null | string;
  whatsapp?: null | string;
}

export interface BusinessSettings {
  lead_recipient_email?: null | string;
  locale: 'en' | 'es';
  reply_to_email?: null | string;
  sender_email?: null | string;
  sender_name?: null | string;
  widget_button_label: string;
  widget_enabled: boolean;
  widget_position: 'bottom-left' | 'bottom-right';
  widget_primary_color: string;
  widget_title: string;
  widget_welcome_message?: null | string;
}

export interface BusinessApiClient {
  created_at?: null | string;
  enabled: boolean;
  expires_at?: null | string;
  id: number;
  key_prefix: string;
  last_used_at?: null | string;
  name: string;
  origins: { id: number; origin: string }[];
}

export interface BusinessConfiguration {
  api_clients: BusinessApiClient[];
  settings: BusinessSettings;
}

export interface BusinessUsage {
  conversations: number;
  events_by_type: { event_type: string; events: number; tokens: number }[];
  leads: number;
  messages: number;
  no_leads: number;
  period: { from: string; to: string };
  sources: number;
  tokens: { input: number; output: number; total: number };
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
  meta?: { current_page: number; last_page: number; total: number };
}

interface RequestOptions {
  body?: unknown;
  formData?: FormData;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
}

export class BusinessApiError extends Error {
  public errors: Record<string, string[]>;
  public status: number;

  public constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'BusinessApiError';
    this.status = status;
    this.errors = errors;
  }
}

export async function listBusinesses(): Promise<Business[]> {
  return (await request<ApiEnvelope<Business[]>>('/api/businesses')).data;
}

export async function createBusiness(payload: BusinessPayload): Promise<Business> {
  return (await request<ApiEnvelope<Business>>('/api/businesses', { body: payload, method: 'POST' })).data;
}

export async function getBusiness(id: number | string): Promise<Business> {
  return (await request<ApiEnvelope<Business>>(`/api/businesses/${encodeURIComponent(String(id))}`)).data;
}

export async function updateBusiness(id: number | string, payload: Partial<BusinessPayload>): Promise<Business> {
  return (await request<ApiEnvelope<Business>>(`/api/businesses/${encodeURIComponent(String(id))}`, { body: payload, method: 'PATCH' })).data;
}

export async function setBusinessActive(id: number | string, active: boolean): Promise<Business> {
  const action = active ? 'activate' : 'deactivate';
  return (await request<ApiEnvelope<Business>>(`/api/businesses/${encodeURIComponent(String(id))}/${action}`, { method: 'POST' })).data;
}

export async function listBusinessSources(id: number | string): Promise<BusinessSource[]> {
  return (await request<ApiEnvelope<BusinessSource[]>>(`/api/businesses/${encodeURIComponent(String(id))}/sources`)).data;
}

export async function createBusinessSource(id: number | string, formData: FormData): Promise<BusinessSource> {
  return (await request<ApiEnvelope<BusinessSource>>(`/api/businesses/${encodeURIComponent(String(id))}/sources`, { formData, method: 'POST' })).data;
}

export async function deleteBusinessSource(id: number | string, sourceId: number | string): Promise<void> {
  await request(`/api/businesses/${encodeURIComponent(String(id))}/sources/${encodeURIComponent(String(sourceId))}`, { method: 'DELETE' });
}

export async function downloadBusinessSource(id: number | string, sourceId: number | string): Promise<{ blob: Blob; filename?: string }> {
  const response = await requestRaw(`/api/businesses/${encodeURIComponent(String(id))}/sources/${encodeURIComponent(String(sourceId))}/file`, { method: 'GET' });

  return { blob: await response.blob(), filename: getFilenameFromContentDisposition(response.headers.get('content-disposition')) };
}

export async function getBusinessFlow(id: number | string): Promise<BusinessFlowResponse> {
  return (await request<ApiEnvelope<BusinessFlowResponse>>(`/api/businesses/${encodeURIComponent(String(id))}/flow`)).data;
}

export async function saveBusinessFlow(id: number | string, graph: BusinessFlowGraph): Promise<BusinessFlowGraph> {
  return (await request<ApiEnvelope<BusinessFlowGraph>>(`/api/businesses/${encodeURIComponent(String(id))}/flow`, { body: graph, method: 'PUT' })).data;
}

export async function validateBusinessFlow(id: number | string, graph: BusinessFlowGraph): Promise<{ errors: string[]; valid: boolean }> {
  return (await request<ApiEnvelope<{ errors: string[]; valid: boolean }>>(`/api/businesses/${encodeURIComponent(String(id))}/flow/validate`, { body: graph, method: 'POST' })).data;
}

export async function publishBusinessFlow(id: number | string): Promise<void> {
  await request(`/api/businesses/${encodeURIComponent(String(id))}/flow/publish`, { method: 'POST' });
}

export async function listBusinessLeads(id: number | string): Promise<BusinessLead[]> {
  return (await request<ApiEnvelope<BusinessLead[]>>(`/api/businesses/${encodeURIComponent(String(id))}/leads`)).data;
}

export async function updateBusinessLeadStatus(id: number | string, leadId: number | string, status: BusinessLeadStatus): Promise<BusinessLead> {
  return (await request<ApiEnvelope<BusinessLead>>(`/api/businesses/${encodeURIComponent(String(id))}/leads/${encodeURIComponent(String(leadId))}`, { body: { status }, method: 'PATCH' })).data;
}

export async function getBusinessUsage(id: number | string, range?: { from: string; to: string }): Promise<BusinessUsage> {
  const query = range ? `?${new URLSearchParams(range).toString()}` : '';
  return (await request<ApiEnvelope<BusinessUsage>>(`/api/businesses/${encodeURIComponent(String(id))}/usage${query}`)).data;
}

export async function getBusinessConfiguration(id: number | string): Promise<BusinessConfiguration> {
  return (await request<ApiEnvelope<BusinessConfiguration>>(`/api/businesses/${encodeURIComponent(String(id))}/configuration`)).data;
}

export async function updateBusinessConfiguration(id: number | string, payload: Partial<BusinessSettings>): Promise<BusinessSettings> {
  return (await request<ApiEnvelope<BusinessSettings>>(`/api/businesses/${encodeURIComponent(String(id))}/configuration`, { body: payload, method: 'PATCH' })).data;
}

export async function createBusinessApiClient(id: number | string, payload: { name: string; origins: string[] }): Promise<{ client: BusinessApiClient; key: string }> {
  return (await request<ApiEnvelope<{ client: BusinessApiClient; key: string }>>(`/api/businesses/${encodeURIComponent(String(id))}/api-clients`, { body: payload, method: 'POST' })).data;
}

export async function revokeBusinessApiClient(id: number | string, clientId: number | string): Promise<void> {
  await request(`/api/businesses/${encodeURIComponent(String(id))}/api-clients/${encodeURIComponent(String(clientId))}`, { method: 'DELETE' });
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await requestRaw(path, options).then((response) => response.json())) as T;
}

async function requestRaw(path: string, options: RequestOptions = {}): Promise<Response> {
  const baseUrl = config.api?.baseUrl;
  const token = getStoredApiToken();
  if (!baseUrl) throw new Error('Missing VITE_API_BASE_URL env variable');
  if (!token) throw new Error('Missing API access token');

  const headers: Record<string, string> = { Accept: 'application/json', Authorization: `Bearer ${token}` };
  let body: BodyInit | undefined;
  if (options.formData) body = options.formData;
  else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const response = await fetch(`${baseUrl}${path}`, { body, cache: options.method === 'GET' || !options.method ? 'no-store' : undefined, headers, method: options.method ?? 'GET' });
  if (!response.ok) {
    let message = 'Business request failed';
    let errors: Record<string, string[]> = {};
    try {
      const json = (await response.json()) as { errors?: Record<string, string[]>; message?: string };
      message = json.message ?? Object.values(json.errors ?? {})[0]?.[0] ?? message;
      errors = json.errors ?? {};
    } catch {
      // Keep the fallback message.
    }
    throw new BusinessApiError(message, response.status, errors);
  }

  return response;
}

function getFilenameFromContentDisposition(value: null | string): string | undefined {
  if (!value) return undefined;
  const encoded = /filename\*=UTF-8''(?<filename>[^;]+)/i.exec(value)?.groups?.filename;
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch { return encoded; }
  }

  return /filename="?(?<filename>[^";]+)"?/i.exec(value)?.groups?.filename;
}

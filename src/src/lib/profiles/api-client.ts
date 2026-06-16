import { config } from '@/config';
import type { ProfileAvatar } from '@/lib/avatar/api-client';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';

export interface Profile {
  id: number | string;
  user_id?: number | string;
  alias?: null | string;
  avatar?: null | ProfileAvatar;
  name: string;
  description: string;
  genre: string;
  personality: string;
  active?: boolean;
  data?: null | Record<string, unknown>;
  created_at?: null | string;
  updated_at?: null | string;
}

export interface ProfilePayload {
  name: string;
  alias?: null | string;
  description: string;
  genre: string;
  personality: string;
  active?: boolean;
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface ProfilesListData {
  profiles: Profile[];
  total?: number;
}

interface RequestOptions {
  body?: unknown;
  formData?: FormData;
  method?: 'GET' | 'PATCH' | 'POST' | 'PUT';
}

export interface ProfileChat {
  id?: number | string;
  chat_id?: number | string;
  profile_id?: number | string;
  title?: null | string;
  name?: null | string;
  subject?: null | string;
  message?: null | string;
  last_message?: null | string;
  content?: null | string;
  text?: null | string;
  preview?: null | string;
  status?: null | string;
  api_messages_count?: null | number;
  created_at?: null | string;
  last_message_at?: null | string;
  openai_messages_count?: null | number;
  updated_at?: null | string;
  [key: string]: unknown;
}

export interface ProfileChatsPage {
  chats: ProfileChat[];
  lastPage?: null | number;
  page: number;
  perPage?: null | number;
  total?: null | number;
}

export interface ProfileChatMessage {
  id?: number | string;
  chat_id?: number | string;
  profile_id?: number | string;
  createdAt?: null | string;
  role?: null | string;
  sender?: null | string;
  source?: null | string;
  type?: null | string;
  content?: null | string;
  message?: null | string;
  text?: null | string;
  body?: null | string;
  created_at?: null | string;
  date?: null | string;
  sentAt?: null | string;
  sent_at?: null | string;
  timestamp?: null | string;
  updatedAt?: null | string;
  updated_at?: null | string;
  [key: string]: unknown;
}

export interface ProfileChatMessagesPage {
  lastPage?: null | number;
  messages: ProfileChatMessage[];
  page: number;
  perPage?: null | number;
  total?: null | number;
}

export interface Voice {
  id: number | string;
  name: string;
  description?: null | string;
  language_code?: null | string;
  profile_id?: number | string;
}

export interface VoiceSample {
  id: number | string;
  voice_id: number | string;
  file?: string;
}

export interface VoiceTestAudio {
  audio_content?: null | string;
  audio_format?: null | string;
  audio_url?: null | string;
  duration?: null | number;
  metadata?: Record<string, unknown>;
  profile_id: number | string;
  status?: null | string;
  text: string;
  voice_id: number | string;
}

export class ProfileApiError extends Error {
  public status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'ProfileApiError';
    this.status = status;
  }
}

export async function listProfiles(): Promise<Profile[]> {
  const response = await requestJson<ApiEnvelope<ProfilesListData> | ProfilesListData | Profile[]>('/api/profile', {
    method: 'GET',
  });

  if (Array.isArray(response)) {
    return response;
  }

  if ('data' in response) {
    return response.data.profiles ?? [];
  }

  return response.profiles ?? [];
}

export async function getProfile(id: number | string): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(`/api/profile/${encodeURIComponent(String(id))}`, {
    method: 'GET',
  });
  return unwrapProfile(response);
}

export async function createProfile(payload: ProfilePayload): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>('/api/profile', { body: payload, method: 'POST' });
  return unwrapProfile(response);
}

export async function updateProfile(id: number | string, payload: ProfilePayload): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(`/api/profile/${encodeURIComponent(String(id))}`, {
    body: payload,
    method: 'PATCH',
  });
  return unwrapProfile(response);
}

export async function updateProfileData(id: number | string, data: Record<string, unknown>): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(
    `/api/profile/${encodeURIComponent(String(id))}/data`,
    {
      body: { data },
      method: 'PUT',
    }
  );
  return unwrapProfile(response);
}

export async function listProfileChats(params: {
  page?: number;
  profileId: number | string;
}): Promise<ProfileChatsPage> {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    profile_id: String(params.profileId),
  });
  const response = await requestJson<unknown>(`/api/profile/chats?${searchParams.toString()}`, { method: 'GET' });

  return normalizeChatsResponse(response, params.page ?? 1);
}

export async function listProfileChatMessages(params: {
  chatId: number | string;
  page?: number;
  profileId: number | string;
}): Promise<ProfileChatMessagesPage> {
  const searchParams = new URLSearchParams({
    chat_id: String(params.chatId),
    page: String(params.page ?? 1),
    profile_id: String(params.profileId),
  });
  const response = await requestJson<unknown>(`/api/profile/chats/messages?${searchParams.toString()}`, {
    method: 'GET',
  });

  return normalizeChatMessagesResponse(response, params.page ?? 1);
}

export async function createVoice(payload: {
  description?: string;
  language_code: string;
  name: string;
  profile_id: number | string;
}): Promise<Voice> {
  const response = await requestJson<ApiEnvelope<Voice> | Voice>('/api/voice', { body: payload, method: 'POST' });
  return isApiEnvelope<Voice>(response) ? response.data : response;
}

export async function uploadVoiceSample(params: {
  file: File;
  language_code: string;
  voiceId: number | string;
}): Promise<VoiceSample> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('language_code', params.language_code);
  formData.append('active', 'true');

  const response = await requestJson<ApiEnvelope<VoiceSample> | VoiceSample>(
    `/api/voice/${encodeURIComponent(String(params.voiceId))}/sample`,
    { formData, method: 'POST' }
  );

  return isApiEnvelope<VoiceSample>(response) ? response.data : response;
}

export async function testVoiceAudio(payload: {
  profile_id: number | string;
  text: string;
}): Promise<VoiceTestAudio> {
  const response = await requestJson<ApiEnvelope<VoiceTestAudio> | VoiceTestAudio>('/api/voice/test', {
    body: payload,
    method: 'POST',
  });
  return isApiEnvelope<VoiceTestAudio>(response) ? response.data : response;
}

function unwrapProfile(response: ApiEnvelope<Profile> | Profile): Profile {
  return isApiEnvelope(response) ? response.data : response;
}

function isApiEnvelope<T>(response: unknown): response is ApiEnvelope<T> {
  return typeof response === 'object' && response !== null && 'message' in response && 'data' in response;
}

function normalizeChatsResponse(response: unknown, fallbackPage: number): ProfileChatsPage {
  const result = normalizePaginatedCollection(response, fallbackPage, {
    arrayFields: ['chats', 'profile_chats', 'profileChats', 'conversations', 'threads', 'items', 'results', 'records', 'data'],
    nestedFields: [
      'chats',
      'profile_chats',
      'profileChats',
      'profile',
      'conversation',
      'conversations',
      'threads',
      'items',
      'results',
      'records',
      'data',
    ],
  });

  return { ...result, chats: result.items as ProfileChat[] };
}

function normalizeChatMessagesResponse(response: unknown, fallbackPage: number): ProfileChatMessagesPage {
  const result = normalizePaginatedCollection(response, fallbackPage, {
    arrayFields: ['messages', 'chat_messages', 'chatMessages', 'items', 'results', 'records', 'data'],
    nestedFields: ['messages', 'chat_messages', 'chatMessages', 'chat', 'conversation', 'items', 'results', 'records', 'data'],
  });
  const messages = (result.items as ProfileChatMessage[]).sort(compareMessagesChronologically);

  return { ...result, messages };
}

function normalizePaginatedCollection(
  response: unknown,
  fallbackPage: number,
  options: { arrayFields: string[]; nestedFields: string[] }
): { items: unknown[]; lastPage?: null | number; page: number; perPage?: null | number; total?: null | number } {
  const candidate = getResponseData(response);
  const items = getCollectionSource(candidate, options) ?? getCollectionSource(response, options) ?? [];
  const paginationSource = getPaginationSource(candidate, options.nestedFields) ?? getPaginationSource(response, options.nestedFields);
  const page = getNumberField(paginationSource, ['current_page', 'currentPage', 'page']) ?? fallbackPage;
  const perPage =
    getNumberField(paginationSource, ['per_page', 'perPage', 'limit']) ??
    getNumberField(candidate, ['per_page', 'perPage', 'limit']);
  const total =
    getNumberField(paginationSource, ['total', 'count']) ?? getNumberField(candidate, ['total', 'count']);
  const lastPage =
    getNumberField(paginationSource, ['last_page', 'lastPage', 'pages']) ??
    getNumberField(candidate, ['last_page', 'lastPage', 'pages']);

  return { items, lastPage, page, perPage, total };
}

function getResponseData(response: unknown): unknown {
  if (!isRecord(response) || !('data' in response)) {
    return response;
  }

  return response.data;
}

function getCollectionSource(
  value: unknown,
  options: { arrayFields: string[]; nestedFields: string[] }
): unknown[] | undefined {
  const directArray = getUnknownArray(value);

  if (directArray) {
    return directArray;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const knownArray = getFirstArrayField(value, options.arrayFields);

  if (knownArray) {
    return knownArray;
  }

  const nestedSource = getFirstRecordField(value, options.nestedFields);

  if (nestedSource) {
    return getCollectionSource(nestedSource, options);
  }

  return undefined;
}

function getPaginationSource(value: unknown, nestedFields: string[]): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (isRecord(value.meta)) {
    return value.meta;
  }

  if (isRecord(value.pagination)) {
    return value.pagination;
  }

  const nestedSource = getFirstRecordField(value, nestedFields);

  if (nestedSource) {
    return nestedSource;
  }

  return value;
}

function getNumberField(value: unknown, fields: string[]): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'number') {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getUnknownArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? (value as unknown[]) : undefined;
}

function getFirstArrayField(value: Record<string, unknown>, fields: string[]): unknown[] | undefined {
  for (const field of fields) {
    const arrayValue = getUnknownArray(value[field]);

    if (arrayValue) {
      return arrayValue;
    }
  }

  return undefined;
}

function getFirstRecordField(value: Record<string, unknown>, fields: string[]): Record<string, unknown> | undefined {
  for (const field of fields) {
    const recordValue = value[field];

    if (isRecord(recordValue)) {
      return recordValue;
    }
  }

  return undefined;
}

function compareMessagesChronologically(a: ProfileChatMessage, b: ProfileChatMessage): number {
  return getMessageTimestamp(a) - getMessageTimestamp(b);
}

function getMessageTimestamp(message: ProfileChatMessage): number {
  const date =
    message.created_at ??
    message.createdAt ??
    message.sent_at ??
    message.sentAt ??
    message.timestamp ??
    message.date ??
    message.updated_at ??
    message.updatedAt;

  if (!date) {
    return 0;
  }

  const timestamp = new Date(date).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
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

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
    headers,
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    throw new ProfileApiError(await getErrorMessage(response), response.status);
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

  return 'Profile request failed';
}

import { config } from '@/config';
import { getStoredApiToken } from '@/lib/auth/custom/api-token';
import type { ProfileAvatar } from '@/lib/avatar/api-client';
import type { ProfileGenre } from '@/lib/profiles/profile-genre';

export interface Profile {
  id: number | string;
  user_id?: number | string;
  alias?: null | string;
  avatar?: null | ProfileAvatar;
  name: string;
  description: string;
  genre: string;
  personality: string;
  profession_key?: null | string;
  profession_template_version?: null | string;
  active?: boolean;
  voice?: boolean;
  voice_id?: null | number | string;
  voice_description?: null | string;
  voice_language_code?: null | string;
  voice_name?: null | string;
  data?: null | Record<string, unknown>;
  networks?: null | ProfileNetworks;
  created_at?: null | string;
  updated_at?: null | string;
}

export type ProfileNetworks = Record<string, string>;

export interface ProfilePayload {
  name: string;
  alias?: null | string;
  description: string;
  genre: ProfileGenre;
  personality: string;
  profession_key?: null | string;
  profession_template_version?: null | string;
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

export interface SocialNetworkDefinition {
  icon: string;
  key: string;
  name: string;
}

export interface ProfileProfessionSection {
  key: string;
  label: string;
  required?: boolean;
}

export interface ProfileProfession {
  description?: null | string;
  interview_questions?: string[];
  key: string;
  label: string;
  quality_rules?: Record<string, unknown>[];
  sections?: ProfileProfessionSection[];
  source_types?: string[];
}

export interface ProfileProfessionsCatalog {
  default: string;
  professions: ProfileProfession[];
  version?: null | string;
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

export interface ProfileFact {
  approved?: boolean;
  category: string;
  created_at?: null | string;
  id: number | string;
  indexed?: boolean;
  metadata?: null | Record<string, unknown>;
  profile_id?: number | string;
  profile_source_id?: null | number | string;
  profile_source_item_id?: null | number | string;
  text: string;
  updated_at?: null | string;
  visibility?: null | string;
}

export interface ProfileFactsPage {
  facts: ProfileFact[];
  lastPage?: null | number;
  page: number;
  perPage?: null | number;
  total?: null | number;
}

export interface ProfileSourceItem {
  approved?: boolean;
  confidence?: number;
  content: string;
  created_at?: null | string;
  facts?: ProfileFact[];
  id: number | string;
  indexed?: boolean;
  metadata?: null | Record<string, unknown>;
  profile_id?: number | string;
  profile_source_id?: number | string;
  source_url?: null | string;
  structured_data?: null | Record<string, unknown>;
  title?: null | string;
  type: string;
  updated_at?: null | string;
}

export interface ProfileSourceFile {
  available?: boolean;
  mime_type?: null | string;
  name?: null | string;
  size?: null | number;
}

export interface ProfileKnowledgeSource {
  approved_at?: null | string;
  created_at?: null | string;
  extracted_text?: null | string;
  file?: null | ProfileSourceFile;
  id: number | string;
  indexed_at?: null | string;
  items?: ProfileSourceItem[];
  last_synced_at?: null | string;
  metadata?: null | Record<string, unknown>;
  mime_type?: null | string;
  name: string;
  original_filename?: null | string;
  parser_version?: null | string;
  profile_id?: number | string;
  status?: null | string;
  storage_path?: null | string;
  type: string;
  updated_at?: null | string;
  user_id?: number | string;
}

export interface ProfileSourcesPage {
  lastPage?: null | number;
  page: number;
  perPage?: null | number;
  sources: ProfileKnowledgeSource[];
  total?: null | number;
}

export interface ProfileSourceFileDownload {
  blob: Blob;
  filename?: string;
}

export interface ProfileQualityCheck {
  actual?: number;
  key: string;
  label: string;
  passed: boolean;
  required?: number;
  type: string;
  weight: number;
}

export interface ProfileQuality {
  checks: ProfileQualityCheck[];
  completed_weight: number;
  counts: Record<string, number>;
  profession: {
    key: string;
    label: string;
    template_version?: null | string;
  };
  profile_id: number | string;
  score: number;
  total_weight: number;
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

export interface VoiceProviderRequest {
  id: number | string;
  voice_id: number | string;
  voice_sample_id: number | string;
  source?: null | string;
  status?: null | string;
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

export type ProfileAudioTranscriptionField = 'description' | 'personality';

export interface ProfileAudioTranscription {
  below_minimum?: boolean;
  characters?: number;
  confidence?: null | number;
  detected_language?: null | string;
  duration?: null | number;
  exceeds_limit?: boolean;
  field?: null | ProfileAudioTranscriptionField;
  limits?: null | {
    max: number;
    min: number;
  };
  source?: null | string;
  status?: null | string;
  text: string;
  word_count?: number;
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

export async function listProfileSocialNetworks(): Promise<SocialNetworkDefinition[]> {
  const response = await requestJson<
    | ApiEnvelope<{ networks?: Record<string, { icon?: null | string; name?: null | string }> }>
    | {
        networks?: Record<string, { icon?: null | string; name?: null | string }>;
      }
  >('/api/profile/social-networks', { method: 'GET' });
  const payload = isApiEnvelope<{ networks?: Record<string, { icon?: null | string; name?: null | string }> }>(response)
    ? response.data
    : response;

  return Object.entries(payload.networks ?? {}).map(([key, value]) => ({
    icon: value.icon ?? '',
    key,
    name: value.name ?? key,
  }));
}

export async function listProfileProfessions(): Promise<ProfileProfessionsCatalog> {
  const response = await requestJson<ApiEnvelope<ProfileProfessionsCatalog> | ProfileProfessionsCatalog>(
    '/api/profile/professions',
    { method: 'GET' }
  );

  return isApiEnvelope<ProfileProfessionsCatalog>(response) ? response.data : response;
}

export async function updateProfileNetworks(id: number | string, networks: ProfileNetworks): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(
    `/api/profile/${encodeURIComponent(String(id))}/data/networks`,
    {
      body: { networks },
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

export async function listProfileSources(params: {
  page?: number;
  profileId: number | string;
  type?: string;
}): Promise<ProfileSourcesPage> {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
  });

  if (params.type) {
    searchParams.set('type', params.type);
  }

  const response = await requestJson<ApiEnvelope<{ pagination?: Record<string, unknown>; sources?: ProfileKnowledgeSource[] }>>(
    `/api/profile/${encodeURIComponent(String(params.profileId))}/sources?${searchParams.toString()}`,
    { method: 'GET' }
  );
  const data = isApiEnvelope(response) ? response.data : response;
  const pagination = data.pagination ?? {};

  return {
    lastPage: getNumberField(pagination, ['last_page', 'lastPage']),
    page: getNumberField(pagination, ['current_page', 'currentPage', 'page']) ?? params.page ?? 1,
    perPage: getNumberField(pagination, ['per_page', 'perPage']),
    sources: data.sources ?? [],
    total: getNumberField(pagination, ['total']),
  };
}

export async function uploadProfileCvSource(params: {
  file?: File;
  name?: string;
  profileId: number | string;
  text?: string;
}): Promise<ProfileKnowledgeSource> {
  const formData = new FormData();

  if (params.file) {
    formData.append('file', params.file);
  }

  if (params.name) {
    formData.append('name', params.name);
  }

  if (params.text) {
    formData.append('text', params.text);
  }

  const response = await requestJson<ApiEnvelope<ProfileKnowledgeSource> | ProfileKnowledgeSource>(
    `/api/profile/${encodeURIComponent(String(params.profileId))}/sources/cv`,
    { formData, method: 'POST' }
  );

  return isApiEnvelope<ProfileKnowledgeSource>(response) ? response.data : response;
}

export async function approveProfileSource(
  profileId: number | string,
  sourceId: number | string
): Promise<ProfileKnowledgeSource> {
  const response = await requestJson<ApiEnvelope<ProfileKnowledgeSource> | ProfileKnowledgeSource>(
    `/api/profile/${encodeURIComponent(String(profileId))}/sources/${encodeURIComponent(String(sourceId))}/approve`,
    { method: 'POST' }
  );

  return isApiEnvelope<ProfileKnowledgeSource>(response) ? response.data : response;
}

export async function downloadProfileSourceFile(params: {
  profileId: number | string;
  sourceId: number | string;
}): Promise<ProfileSourceFileDownload> {
  const response = await requestRaw(
    `/api/profile/${encodeURIComponent(String(params.profileId))}/sources/${encodeURIComponent(String(params.sourceId))}/file`,
    { method: 'GET' }
  );

  return {
    blob: await response.blob(),
    filename: getFilenameFromContentDisposition(response.headers.get('content-disposition')),
  };
}

export async function listProfileFacts(params: {
  category?: string;
  page?: number;
  profileId: number | string;
}): Promise<ProfileFactsPage> {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
  });

  if (params.category) {
    searchParams.set('category', params.category);
  }

  const response = await requestJson<ApiEnvelope<{ facts?: ProfileFact[]; pagination?: Record<string, unknown> }>>(
    `/api/profile/${encodeURIComponent(String(params.profileId))}/facts?${searchParams.toString()}`,
    { method: 'GET' }
  );
  const data = isApiEnvelope(response) ? response.data : response;
  const pagination = data.pagination ?? {};

  return {
    facts: data.facts ?? [],
    lastPage: getNumberField(pagination, ['last_page', 'lastPage']),
    page: getNumberField(pagination, ['current_page', 'currentPage', 'page']) ?? params.page ?? 1,
    perPage: getNumberField(pagination, ['per_page', 'perPage']),
    total: getNumberField(pagination, ['total']),
  };
}

export async function updateProfileFact(
  profileId: number | string,
  factId: number | string,
  payload: Partial<Pick<ProfileFact, 'approved' | 'category' | 'indexed' | 'metadata' | 'text' | 'visibility'>>
): Promise<ProfileFact> {
  const response = await requestJson<ApiEnvelope<ProfileFact> | ProfileFact>(
    `/api/profile/${encodeURIComponent(String(profileId))}/facts/${encodeURIComponent(String(factId))}`,
    { body: payload, method: 'PATCH' }
  );

  return isApiEnvelope<ProfileFact>(response) ? response.data : response;
}

export async function getProfileQuality(profileId: number | string): Promise<ProfileQuality> {
  const response = await requestJson<ApiEnvelope<ProfileQuality> | ProfileQuality>(
    `/api/profile/${encodeURIComponent(String(profileId))}/quality`,
    { method: 'GET' }
  );

  return isApiEnvelope<ProfileQuality>(response) ? response.data : response;
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

export async function updateVoice(
  voiceId: number | string,
  payload: {
    description?: string;
    language_code?: string;
    name: string;
  }
): Promise<Voice> {
  const response = await requestJson<ApiEnvelope<Voice> | Voice>(`/api/voice/${encodeURIComponent(String(voiceId))}`, {
    body: payload,
    method: 'PATCH',
  });
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

export async function processVoiceSample(params: {
  sampleId: number | string;
  voiceId: number | string;
}): Promise<VoiceProviderRequest> {
  const response = await requestJson<ApiEnvelope<VoiceProviderRequest> | VoiceProviderRequest>(
    `/api/voice/${encodeURIComponent(String(params.voiceId))}/sample/${encodeURIComponent(String(params.sampleId))}/process`,
    { method: 'POST' }
  );

  return isApiEnvelope<VoiceProviderRequest>(response) ? response.data : response;
}

export async function testVoiceAudio(payload: { profile_id: number | string; text: string }): Promise<VoiceTestAudio> {
  const response = await requestJson<ApiEnvelope<VoiceTestAudio> | VoiceTestAudio>('/api/voice/test', {
    body: payload,
    method: 'POST',
  });
  return isApiEnvelope<VoiceTestAudio>(response) ? response.data : response;
}

export async function transcribeProfileAudio(
  profileId: number | string,
  params: {
    field?: ProfileAudioTranscriptionField;
    file: File;
    language?: string;
  }
): Promise<ProfileAudioTranscription> {
  const formData = new FormData();
  formData.append('audio', params.file);

  if (params.field) {
    formData.append('field', params.field);
  }

  if (params.language) {
    formData.append('language', params.language);
  }

  const response = await requestJson<ApiEnvelope<ProfileAudioTranscription> | ProfileAudioTranscription>(
    `/api/profile/${encodeURIComponent(String(profileId))}/transcriptions/audio`,
    { formData, method: 'POST' }
  );

  return isApiEnvelope<ProfileAudioTranscription>(response) ? response.data : response;
}

function unwrapProfile(response: ApiEnvelope<Profile> | Profile): Profile {
  return isApiEnvelope(response) ? response.data : response;
}

function isApiEnvelope<T>(response: unknown): response is ApiEnvelope<T> {
  return typeof response === 'object' && response !== null && 'message' in response && 'data' in response;
}

function normalizeChatsResponse(response: unknown, fallbackPage: number): ProfileChatsPage {
  const result = normalizePaginatedCollection(response, fallbackPage, {
    arrayFields: [
      'chats',
      'profile_chats',
      'profileChats',
      'conversations',
      'threads',
      'items',
      'results',
      'records',
      'data',
    ],
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
    nestedFields: [
      'messages',
      'chat_messages',
      'chatMessages',
      'chat',
      'conversation',
      'items',
      'results',
      'records',
      'data',
    ],
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
  const paginationSource =
    getPaginationSource(candidate, options.nestedFields) ?? getPaginationSource(response, options.nestedFields);
  const page = getNumberField(paginationSource, ['current_page', 'currentPage', 'page']) ?? fallbackPage;
  const perPage =
    getNumberField(paginationSource, ['per_page', 'perPage', 'limit']) ??
    getNumberField(candidate, ['per_page', 'perPage', 'limit']);
  const total = getNumberField(paginationSource, ['total', 'count']) ?? getNumberField(candidate, ['total', 'count']);
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
  const response = await requestRaw(path, options);

  return (await response.json()) as T;
}

async function requestRaw(path: string, options: RequestOptions): Promise<Response> {
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

  return response;
}

function getFilenameFromContentDisposition(value: null | string): string | undefined {
  if (!value) {
    return undefined;
  }

  const encodedFilename = /filename\*=UTF-8''(?<filename>[^;]+)/i.exec(value)?.groups?.filename;

  if (encodedFilename) {
    try {
      return decodeURIComponent(encodedFilename);
    } catch {
      return encodedFilename;
    }
  }

  return /filename="?(?<filename>[^";]+)"?/i.exec(value)?.groups?.filename;
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

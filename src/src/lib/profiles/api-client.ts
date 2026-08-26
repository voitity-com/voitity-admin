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
  locale?: null | string;
  personality: string;
  profession_key?: null | string;
  profession_template_version?: null | string;
  active?: boolean;
  status?: null | string;
  voice?: boolean;
  voice_autoplay_enabled?: boolean;
  voice_clone_status?: null | VoiceCloneStatus;
  voice_enabled?: boolean;
  voice_id?: null | number | string;
  voice_description?: null | string;
  voice_language_code?: null | string;
  voice_name?: null | string;
  publication?: null | ProfilePublication;
  conversation_messages?: null | ProfileConversationMessages;
  data?: null | Record<string, unknown>;
  networks?: null | ProfileNetworks;
  created_at?: null | string;
  updated_at?: null | string;
}

export type VoiceCloneStatus = 'completed' | 'failed' | 'pending' | 'processing';

export type ProfileNetworks = Record<string, string>;

export interface ProfilePublicationRequirement {
  key: string;
  passed: boolean;
}

export interface ProfilePublication {
  can_activate: boolean;
  is_published: boolean;
  missing: string[];
  requirements: ProfilePublicationRequirement[];
}

export interface ProfilePayload {
  name: string;
  alias: string;
  description: string;
  genre: ProfileGenre;
  locale: string;
  personality: string;
  profession_key?: null | string;
  profession_template_version?: null | string;
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
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
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
  processing_completed_at?: null | string;
  processing_stage?: null | string;
  processing_started_at?: null | string;
  profile_id?: number | string;
  last_error?: null | string;
  retry_count?: number;
  retryable?: boolean;
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

export interface ProfileInsightsSummary {
  instagram_external_clicks: number;
  instagram_shown: number;
  new_chats: number;
  onlyfans_external_clicks: number;
  onlyfans_images_shown: number;
  product_clicks: number;
  profile_answers: number;
  tiktok_external_clicks: number;
  tiktok_shown: number;
  total_messages: number;
  unique_visitors: number;
  visitor_messages: number;
  youtube_channel_clicks: number;
  youtube_external_clicks: number;
  youtube_opened: number;
  youtube_shown: number;
  youtube_video_clicks: number;
}

export interface ProfileInsightsProvider {
  ctr: number;
  channel_clicks: number;
  external_clicks: number;
  opened: number;
  provider: 'instagram' | 'onlyfans' | 'other' | 'tiktok' | 'youtube';
  shown: number;
  video_clicks: number;
}

export interface ProfileInsightsCategory {
  average_confidence?: number;
  count: number;
  key: string;
  percent: number;
}

export interface ProfileInsightsSeriesRow extends ProfileInsightsSummary {
  bucket: string;
}

export interface ProfileInsights {
  analysis_coverage: {
    classified: number;
    completed: number;
    failed: number;
    needs_review: number;
    pending: number;
    total_chats: number;
  };
  categories: ProfileInsightsCategory[];
  definitions_version: string;
  provider_funnel: ProfileInsightsProvider[];
  range: { from: string; group_by: 'day' | 'month'; timezone: string; to: string };
  series: ProfileInsightsSeriesRow[];
  summary: ProfileInsightsSummary;
  tabs: { products: ProfileInsightsProductAvailability };
  tracking_started_at?: null | string;
}

export interface ProfileInsightsProductAvailability {
  active_products: number;
  available: boolean;
  historical_products: number;
  mode: 'active' | 'active_and_history' | 'historical_only' | 'none';
}

export interface ProfileChatInsights {
  analysis_coverage: ProfileInsights['analysis_coverage'] & { unclassified: number };
  definitions_version: string;
  goal_actions: {
    chats: number;
    key: string;
    media_exit_chats: number;
    product_click_chats: number;
    product_click_rate: number;
    social_click_chats: number;
    whatsapp_click_chats: number;
  }[];
  goal_trend: { bucket: string; goals: { count: number; key: string }[] }[];
  goals: ProfileInsightsCategory[];
  range: ProfileInsights['range'];
  summary: {
    average_confidence: number;
    average_duration_minutes: number;
    average_messages_per_chat: number;
    closed_chats: number;
    open_chats: number;
    profile_answers: number;
    single_message_chats: number;
    total_chats: number;
    total_messages: number;
    visitor_messages: number;
  };
  tabs: ProfileInsights['tabs'];
  tracking_started_at?: null | string;
}

export interface ProfileProductInsight {
  button_clicks: number;
  chats_reached: number;
  clicks: number;
  ctr: number;
  destination_type?: null | string;
  goals: { chats: number; key: string }[];
  historical: boolean;
  image_clicks: number;
  image_url?: null | string;
  key: string;
  name: string;
  product_id?: null | number;
  public_id?: null | string;
  shown: number;
  status: 'deleted' | 'draft' | 'published';
  unique_click_visitors: number;
}

export interface ProfileProductInsights {
  available: ProfileInsightsProductAvailability;
  definitions_version: string;
  products: ProfileProductInsight[];
  range: ProfileInsights['range'];
  series: { bucket: string; clicks: number; shown: number }[];
  summary: { clicks: number; ctr: number; products: number; shown: number; unique_click_visitors: number };
  tabs: ProfileInsights['tabs'];
  tracking_started_at?: null | string;
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

export type ProfileConversationMessageType = 'fallback_no_answer' | 'initial';

export interface ProfileConversationMessage {
  audio_format?: null | string;
  audio_source?: null | string;
  audio_url?: null | string;
  customized?: boolean;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
  status?: null | string;
  text?: null | string;
  type: ProfileConversationMessageType;
  updated_at?: null | string;
  voice_id?: null | number | string;
}

export type ProfileConversationMessages = Record<ProfileConversationMessageType, ProfileConversationMessage>;

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
  public errors: Record<string, string[]>;
  public status: number;

  public constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ProfileApiError';
    this.errors = errors;
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

export async function activateProfile(id: number | string): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(
    `/api/profile/${encodeURIComponent(String(id))}/activate`,
    { method: 'POST' }
  );
  return unwrapProfile(response);
}

export async function deactivateProfile(id: number | string): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(
    `/api/profile/${encodeURIComponent(String(id))}/deactivate`,
    { method: 'POST' }
  );
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

export async function updateProfileVoiceSettings(
  id: number | string,
  payload: {
    voice_autoplay_enabled: boolean;
    voice_enabled: boolean;
  }
): Promise<Profile> {
  const response = await requestJson<ApiEnvelope<Profile> | Profile>(
    `/api/profile/${encodeURIComponent(String(id))}/voice-settings`,
    {
      body: payload,
      method: 'PATCH',
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

  const response = await requestJson<
    ApiEnvelope<{ pagination?: Record<string, unknown>; sources?: ProfileKnowledgeSource[] }>
  >(`/api/profile/${encodeURIComponent(String(params.profileId))}/sources?${searchParams.toString()}`, {
    method: 'GET',
  });
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

export async function retryProfileSource(
  profileId: number | string,
  sourceId: number | string
): Promise<ProfileKnowledgeSource> {
  const response = await requestJson<ApiEnvelope<ProfileKnowledgeSource> | ProfileKnowledgeSource>(
    `/api/profile/${encodeURIComponent(String(profileId))}/sources/${encodeURIComponent(String(sourceId))}/retry`,
    { method: 'POST' }
  );

  return isApiEnvelope<ProfileKnowledgeSource>(response) ? response.data : response;
}

export async function deleteProfileSource(profileId: number | string, sourceId: number | string): Promise<void> {
  await requestJson(
    `/api/profile/${encodeURIComponent(String(profileId))}/sources/${encodeURIComponent(String(sourceId))}`,
    { method: 'DELETE' }
  );
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

export async function getProfileInsights(params: {
  from: string;
  groupBy?: 'day' | 'month';
  profileId: number | string;
  timezone: string;
  to: string;
}): Promise<ProfileInsights> {
  const searchParams = new URLSearchParams({
    from: params.from,
    to: params.to,
    timezone: params.timezone,
  });

  if (params.groupBy) {
    searchParams.set('group_by', params.groupBy);
  }

  const response = await requestJson<ApiEnvelope<ProfileInsights> | ProfileInsights>(
    `/api/profile/${encodeURIComponent(String(params.profileId))}/insights/dashboard?${searchParams.toString()}`,
    { method: 'GET' }
  );

  return isApiEnvelope<ProfileInsights>(response) ? response.data : response;
}

export async function getProfileChatInsights(params: Parameters<typeof getProfileInsights>[0]): Promise<ProfileChatInsights> {
  return getProfileInsightsSection<ProfileChatInsights>('chats', params);
}

export async function getProfileProductInsights(params: Parameters<typeof getProfileInsights>[0]): Promise<ProfileProductInsights> {
  return getProfileInsightsSection<ProfileProductInsights>('products', params);
}

async function getProfileInsightsSection<T>(
  section: 'chats' | 'products',
  params: Parameters<typeof getProfileInsights>[0]
): Promise<T> {
  const searchParams = new URLSearchParams({ from: params.from, timezone: params.timezone, to: params.to });

  if (params.groupBy) searchParams.set('group_by', params.groupBy);

  const response = await requestJson<ApiEnvelope<T> | T>(
    `/api/profile/${encodeURIComponent(String(params.profileId))}/insights/${section}?${searchParams.toString()}`,
    { method: 'GET' }
  );

  return isApiEnvelope<T>(response) ? response.data : response;
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

export async function getProfileConversationMessages(profileId: number | string): Promise<ProfileConversationMessages> {
  const response = await requestJson<
    ApiEnvelope<{ messages?: ProfileConversationMessages }> | { messages?: ProfileConversationMessages }
  >(`/api/profile/${encodeURIComponent(String(profileId))}/conversation-messages`, { method: 'GET' });
  const data = isApiEnvelope<{ messages?: ProfileConversationMessages }>(response) ? response.data : response;

  return normalizeConversationMessages(data.messages);
}

export async function updateProfileConversationMessages(
  profileId: number | string,
  payload: Partial<Record<ProfileConversationMessageType, { text?: null | string }>>
): Promise<ProfileConversationMessages> {
  const response = await requestJson<
    ApiEnvelope<{ messages?: ProfileConversationMessages }> | { messages?: ProfileConversationMessages }
  >(`/api/profile/${encodeURIComponent(String(profileId))}/conversation-messages`, {
    body: payload,
    method: 'PUT',
  });
  const data = isApiEnvelope<{ messages?: ProfileConversationMessages }>(response) ? response.data : response;

  return normalizeConversationMessages(data.messages);
}

export async function generateProfileConversationMessageAudio(
  profileId: number | string,
  type: ProfileConversationMessageType
): Promise<ProfileConversationMessage> {
  const response = await requestJson<
    ApiEnvelope<{ message?: ProfileConversationMessage }> | { message?: ProfileConversationMessage }
  >(
    `/api/profile/${encodeURIComponent(String(profileId))}/conversation-messages/${encodeURIComponent(type)}/audio/generate`,
    { method: 'POST' }
  );
  const data = isApiEnvelope<{ message?: ProfileConversationMessage }>(response) ? response.data : response;

  return normalizeConversationMessage(data.message, type);
}

export async function uploadProfileConversationMessageAudio(params: {
  audio: Blob | File;
  filename?: string;
  profileId: number | string;
  type: ProfileConversationMessageType;
}): Promise<ProfileConversationMessage> {
  const formData = new FormData();
  formData.append('audio', params.audio, params.filename ?? 'conversation-message.webm');

  const response = await requestJson<
    ApiEnvelope<{ message?: ProfileConversationMessage }> | { message?: ProfileConversationMessage }
  >(
    `/api/profile/${encodeURIComponent(String(params.profileId))}/conversation-messages/${encodeURIComponent(params.type)}/audio`,
    { formData, method: 'POST' }
  );
  const data = isApiEnvelope<{ message?: ProfileConversationMessage }>(response) ? response.data : response;

  return normalizeConversationMessage(data.message, params.type);
}

export async function clearProfileConversationMessageAudio(
  profileId: number | string,
  type: ProfileConversationMessageType
): Promise<ProfileConversationMessage> {
  const response = await requestJson<
    ApiEnvelope<{ message?: ProfileConversationMessage }> | { message?: ProfileConversationMessage }
  >(`/api/profile/${encodeURIComponent(String(profileId))}/conversation-messages/${encodeURIComponent(type)}/audio`, {
    method: 'DELETE',
  });
  const data = isApiEnvelope<{ message?: ProfileConversationMessage }>(response) ? response.data : response;

  return normalizeConversationMessage(data.message, type);
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

function normalizeConversationMessages(
  messages?: null | Partial<ProfileConversationMessages>
): ProfileConversationMessages {
  return {
    fallback_no_answer: normalizeConversationMessage(messages?.fallback_no_answer, 'fallback_no_answer'),
    initial: normalizeConversationMessage(messages?.initial, 'initial'),
  };
}

function normalizeConversationMessage(
  message: null | ProfileConversationMessage | undefined,
  type: ProfileConversationMessageType
): ProfileConversationMessage {
  return {
    audio_format: message?.audio_format ?? null,
    audio_source: message?.audio_source ?? null,
    audio_url: normalizeAssetUrl(message?.audio_url) ?? null,
    customized: Boolean(message?.customized),
    enabled: Boolean(message?.enabled),
    metadata: message?.metadata ?? {},
    status: message?.status ?? 'ready',
    text: message?.text ?? null,
    type,
    updated_at: message?.updated_at ?? null,
    voice_id: message?.voice_id ?? null,
  };
}

function normalizeAssetUrl(value?: null | string): null | string {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (
    !trimmedValue ||
    /^https?:\/\//i.test(trimmedValue) ||
    trimmedValue.startsWith('blob:') ||
    trimmedValue.startsWith('data:')
  ) {
    return trimmedValue;
  }

  const baseUrl = config.api?.baseUrl?.replace(/\/+$/, '');

  if (!baseUrl) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith('/')) {
    return `${baseUrl}${trimmedValue}`;
  }

  return `${baseUrl}/${trimmedValue}`;
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
    cache: options.method === 'GET' || !options.method ? 'no-store' : undefined,
    headers,
    method: options.method ?? 'GET',
  });

  if (!response.ok) {
    const { errors, message } = await getErrorDetails(response);
    throw new ProfileApiError(message, response.status, errors);
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

async function getErrorDetails(response: Response): Promise<{ errors: Record<string, string[]>; message: string }> {
  try {
    const json = (await response.json()) as { errors?: Record<string, string[]>; message?: string };
    const errors = json.errors ?? {};

    if (json.message) {
      return { errors, message: json.message };
    }

    const firstError = Object.values(errors)[0]?.[0];

    if (firstError) {
      return { errors, message: firstError };
    }
  } catch {
    // Fall through to generic message.
  }

  return { errors: {}, message: 'Profile request failed' };
}

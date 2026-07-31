import type { TFunction } from 'i18next';

import type { JsonObject, JsonValue, SubscriptionLimits, UsageAnalytics } from '@/lib/subscription/api-client';

export const usageServiceKeys = [
  'chat_message_received',
  'incoming_audio_message',
  'voice_tts_characters',
  'voice_cloned',
  'avatar_image_created',
  'avatar_video_created',
] as const;

export type UsageServiceKey = (typeof usageServiceKeys)[number];

export interface PlanLimitMetric {
  included: number;
  key: string;
  label: string;
  progress: number;
  remaining: number;
  used: number;
}

export interface PlanUsageModel {
  atRisk: PlanLimitMetric[];
  highest?: PlanLimitMetric;
  metrics: PlanLimitMetric[];
  periodEnd?: string;
  periodStart?: string;
  planName: string;
  status: string;
}

export interface CreditServiceTotal {
  credits: number;
  key: UsageServiceKey;
  label: string;
  operations: number;
}

const metricConfigs = [
  { key: 'profiles', label: 'dashboard.settings.billing.fields.profiles' },
  { key: 'avatar_images', label: 'dashboard.settings.billing.fields.avatarImages' },
  { key: 'avatar_video_seconds', label: 'dashboard.settings.billing.fields.avatarVideoSeconds' },
  { key: 'voice_clones', label: 'dashboard.settings.billing.fields.voiceClones' },
  { key: 'tts_characters', label: 'dashboard.settings.billing.fields.ttsCharacters' },
  { key: 'chat_messages', label: 'dashboard.settings.billing.fields.chatMessages' },
  { key: 'incoming_audio_messages', label: 'dashboard.settings.billing.fields.incomingAudioMessages' },
  { key: 'incoming_audio_seconds', label: 'dashboard.settings.billing.fields.incomingAudioSeconds' },
] as const;

export function buildPlanUsageModel(data: SubscriptionLimits, t: TFunction): PlanUsageModel | null {
  const subscription = recordValue(data.subscription);
  const rawLimits = recordValue(data.limits);

  if (!subscription || !rawLimits) {
    return null;
  }

  const metrics = metricConfigs
    .map(({ key, label }): PlanLimitMetric | null => {
      const value = recordValue(rawLimits[key]);

      if (!value) {
        return null;
      }

      const included = numberValue(value.included);
      const used = numberValue(value.used);
      const remaining = numberValue(value.remaining);

      if (included === null || used === null || remaining === null) {
        return null;
      }

      return {
        included,
        key,
        label: t(label),
        progress: included > 0 ? Math.min(100, Math.max(0, (used / included) * 100)) : 0,
        remaining,
        used,
      };
    })
    .filter((metric): metric is PlanLimitMetric => metric !== null)
    .sort((left, right) => right.progress - left.progress);

  return {
    atRisk: metrics.filter((metric) => metric.progress >= 80),
    highest: metrics[0],
    metrics,
    periodEnd: stringValue(subscription.renews_at),
    periodStart: stringValue(subscription.started_at),
    planName: stringValue(subscription.plan_name) ?? stringValue(subscription.plan) ?? '-',
    status:
      booleanValue(subscription.active) === false
        ? t('dashboard.settings.usage.dashboard.inactive')
        : t('dashboard.settings.usage.dashboard.active'),
  };
}

export function getCreditServiceTotals(data: UsageAnalytics, t: TFunction): CreditServiceTotal[] {
  return usageServiceKeys
    .map((key) => {
      const values = data.series.map((bucket) => bucket.services[key]);

      return {
        credits: values.reduce((total, value) => total + (value?.purchased_credits ?? 0), 0),
        key,
        label: t(`dashboard.settings.usage.analytics.services.${key}`),
        operations: values.reduce((total, value) => total + (value?.operations ?? 0), 0),
      };
    })
    .filter((service) => service.credits > 0 || service.operations > 0)
    .sort((left, right) => right.credits - left.credits);
}

export function getCreditSeries(data: UsageAnalytics): {
  bucket: string;
  consumed: number;
  purchased: number;
  reserved: number;
  reversed: number;
}[] {
  return data.series.map((item) => ({
    bucket: item.bucket,
    consumed: item.credits.consumed,
    purchased: item.credits.purchased,
    reserved: item.credits.reserved,
    reversed: item.credits.reversed,
  }));
}

export function formatUsageNumber(value: number, language: string, maximumFractionDigits = 3): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits }).format(value);
}

export function formatUsageDate(value: string | undefined, language: string): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function recordValue(value: JsonValue | undefined): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function numberValue(value: JsonValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: JsonValue | undefined): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function stringValue(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

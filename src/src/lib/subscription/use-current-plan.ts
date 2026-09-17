'use client';

import * as React from 'react';

import { logger } from '@/lib/default-logger';
import type { JsonObject, JsonValue } from '@/lib/subscription/api-client';
import { getSubscriptionLimits } from '@/lib/subscription/api-client';

export interface CurrentPlanAccess {
  capabilities: JsonObject;
  isFreePlan: boolean;
  isLoading: boolean;
  planId?: string;
}

export function useCurrentPlan(): CurrentPlanAccess {
  const [state, setState] = React.useState<CurrentPlanAccess>({
    capabilities: {},
    isFreePlan: false,
    isLoading: true,
  });

  React.useEffect(() => {
    let active = true;

    getSubscriptionLimits()
      .then((limits) => {
        if (!active) return;

        const subscription = asObject(limits.subscription);
        const capabilities = asObject(limits.capabilities);
        const planId = asString(subscription.plan ?? subscription.plan_id ?? subscription.planId);

        setState({ capabilities, isFreePlan: planId === 'free', isLoading: false, planId });
      })
      .catch((error: unknown) => {
        logger.error(error);

        if (active) {
          setState({ capabilities: {}, isFreePlan: false, isLoading: false });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

export function getPlanCapabilityNumber(capabilities: JsonObject, path: string[]): number | undefined {
  let value: JsonValue | undefined = capabilities;

  for (const key of path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    value = value[key];
  }

  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asObject(value: JsonValue | undefined): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

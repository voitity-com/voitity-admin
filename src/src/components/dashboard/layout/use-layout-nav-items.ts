import * as React from 'react';

import type { NavItemConfig } from '@/types/nav';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import { isSingleProfilePlan } from '@/lib/subscription/profile-limits';
import { logger } from '@/lib/default-logger';
import { filterNavItemsByRole } from '@/lib/filter-nav-items-by-role';
import { getAdminFeatures } from '@/lib/features/api-client';
import { useUser } from '@/hooks/use-user';

import { layoutConfig } from './config';

export function useLayoutNavItems(): NavItemConfig[] {
  const { user } = useUser();
  const [hasSingleProfilePlan, setHasSingleProfilePlan] = React.useState(false);
  const [businessEnabled, setBusinessEnabled] = React.useState(false);
  const userId = typeof user?.id === 'string' ? user.id : undefined;

  React.useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setHasSingleProfilePlan(false);
      return undefined;
    }

    getSubscriptionLimits()
      .then((limits) => {
        if (isMounted) {
          setHasSingleProfilePlan(isSingleProfilePlan(limits));
        }
      })
      .catch((err) => {
        if (!(err instanceof SubscriptionApiError && err.status === 404)) {
          logger.error(err);
        }

        if (isMounted) {
          setHasSingleProfilePlan(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  React.useEffect(() => {
    let isMounted = true;
    const load = (): void => {
      if (user?.role !== 'admin') {
        setBusinessEnabled(false);
        return;
      }
      getAdminFeatures()
        .then((features) => {
          if (isMounted) setBusinessEnabled(Boolean(features.find((feature) => feature.key === 'business')?.enabled));
        })
        .catch((err) => {
          logger.error(err);
          if (isMounted) setBusinessEnabled(false);
        });
    };
    load();
    window.addEventListener('admin-features-updated', load);

    return () => {
      isMounted = false;
      window.removeEventListener('admin-features-updated', load);
    };
  }, [user?.role]);

  return React.useMemo(() => {
    const items = removeDisabledBusiness(filterNavItemsByRole(layoutConfig.navItems, user?.role), businessEnabled);

    return hasSingleProfilePlan ? withSingularProfileLabel(items) : items;
  }, [businessEnabled, hasSingleProfilePlan, user?.role]);
}

function removeDisabledBusiness(items: NavItemConfig[], enabled: boolean): NavItemConfig[] {
  return items.reduce<NavItemConfig[]>((result, item) => {
    if (item.key === 'business' && !enabled) return result;
    const childItems = item.items ? removeDisabledBusiness(item.items, enabled) : undefined;
    result.push(childItems ? { ...item, items: childItems } : item);
    return result;
  }, []);
}

function withSingularProfileLabel(items: NavItemConfig[]): NavItemConfig[] {
  return items.map((item) => {
    const childItems = item.items ? withSingularProfileLabel(item.items) : undefined;

    if (item.key === 'profiles') {
      return {
        ...item,
        ...(childItems ? { items: childItems } : {}),
        title: 'Profile',
        titleKey: 'dashboard.nav.items.profile',
      };
    }

    return childItems ? { ...item, items: childItems } : item;
  });
}

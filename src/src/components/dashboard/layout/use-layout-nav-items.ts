import * as React from 'react';

import type { NavItemConfig } from '@/types/nav';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import { isSingleProfilePlan } from '@/lib/subscription/profile-limits';
import { logger } from '@/lib/default-logger';
import { filterNavItemsByRole } from '@/lib/filter-nav-items-by-role';
import { useUser } from '@/hooks/use-user';

import { layoutConfig } from './config';

export function useLayoutNavItems(): NavItemConfig[] {
  const { user } = useUser();
  const [hasSingleProfilePlan, setHasSingleProfilePlan] = React.useState(false);
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

  return React.useMemo(() => {
    const items = filterNavItemsByRole(layoutConfig.navItems, user?.role);

    return hasSingleProfilePlan ? withSingularProfileLabel(items) : items;
  }, [hasSingleProfilePlan, user?.role]);
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

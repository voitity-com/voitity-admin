import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

// NOTE: We did not use React Components for Icons, because
//  you may one to get the config from the server.

// NOTE: First level elements are groups.

export interface LayoutConfig {
  navItems: NavItemConfig[];
}

export const layoutConfig = {
  navItems: [
    {
      key: 'dashboards',
      title: 'Dashboards',
      titleKey: 'dashboard.nav.groups.dashboards',
      items: [
        {
          key: 'overview',
          title: 'Overview',
          titleKey: 'dashboard.nav.items.overview',
          href: paths.dashboard.overview,
          icon: 'house',
        },
        {
          key: 'analytics',
          title: 'Analytics',
          titleKey: 'dashboard.nav.items.analytics',
          href: paths.dashboard.analytics,
          icon: 'chart-pie',
        },
      ],
    },
    {
      key: 'general',
      title: 'General',
      titleKey: 'dashboard.nav.groups.general',
      items: [
        {
          key: 'settings',
          title: 'Settings',
          titleKey: 'dashboard.nav.items.settings',
          href: paths.dashboard.settings.account,
          icon: 'gear',
          matcher: { type: 'startsWith', href: '/dashboard/settings' },
        },
      ],
    },
  ],
} satisfies LayoutConfig;

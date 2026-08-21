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
      key: 'main',
      items: [
        {
          key: 'usage',
          title: 'Usage',
          titleKey: 'dashboard.nav.items.usage',
          href: paths.dashboard.analytics,
          icon: 'gauge',
          implemented: true,
          matcher: { type: 'startsWith', href: '/dashboard/analytics' },
        },
        {
          key: 'profiles',
          title: 'Profiles',
          titleKey: 'dashboard.nav.items.profiles',
          href: paths.dashboard.profiles,
          icon: 'users',
          implemented: true,
        },
        {
          key: 'business',
          title: 'Business',
          titleKey: 'dashboard.nav.items.business',
          href: paths.dashboard.businesses,
          icon: 'briefcase',
          implemented: true,
          roles: ['admin'],
        },
        {
          key: 'notifications',
          title: 'Notifications',
          titleKey: 'dashboard.nav.items.notifications',
          href: paths.dashboard.notifications,
          icon: 'bell',
          implemented: true,
        },
        {
          key: 'billing',
          title: 'Billing & plans',
          titleKey: 'dashboard.nav.items.billing',
          href: paths.dashboard.settings.billing,
          icon: 'credit-card',
          implemented: true,
          matcher: { type: 'startsWith', href: paths.dashboard.settings.billing },
        },
        {
          key: 'settings',
          title: 'Settings',
          titleKey: 'dashboard.nav.items.settings',
          href: paths.dashboard.settings.account,
          icon: 'gear',
          matcher: {
            type: 'startsWithExcept',
            href: '/dashboard/settings',
            excludeHrefs: [
              paths.dashboard.settings.billing,
              paths.dashboard.settings.billingPaymentResult,
              paths.dashboard.settings.usage,
            ],
          },
        },
        {
          key: 'help',
          title: 'Help',
          titleKey: 'dashboard.nav.items.help',
          href: paths.dashboard.help,
          icon: 'lifebuoy',
          implemented: true,
        },
        {
          key: 'users',
          title: 'Users',
          titleKey: 'dashboard.nav.items.users',
          href: paths.dashboard.users,
          icon: 'address-book',
          implemented: true,
          roles: ['admin'],
        },
        {
          key: 'newFeatures',
          title: 'New features',
          titleKey: 'dashboard.nav.items.newFeatures',
          href: paths.dashboard.newFeatures,
          icon: 'sliders-horizontal',
          implemented: true,
          roles: ['admin'],
        },
      ],
    },
  ],
} satisfies LayoutConfig;

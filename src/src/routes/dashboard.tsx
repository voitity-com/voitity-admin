import * as React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import { Layout as ChatLayout } from '@/components/dashboard/chat/layout';
import { Layout as JobCompanyLayout } from '@/components/dashboard/jobs/company-layout';
import { Layout as DashboardLayout } from '@/components/dashboard/layout/layout';
import { Layout as MailLayout } from '@/components/dashboard/mail/layout';
import { ProfileLayout } from '@/components/dashboard/profiles/profile-layout';
import { BusinessLayout } from '@/components/dashboard/business/business-layout';
import { BusinessFeatureGuard } from '@/components/auth/business-feature-guard';
import { AdminRoleGuard } from '@/components/auth/admin-role-guard';
import { Layout as SettingsLayout } from '@/components/dashboard/settings/layout';
import { Layout as SocialProfileLayout } from '@/components/dashboard/social/profile-layout';

export const route: RouteObject = {
  path: 'dashboard',
  element: (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ),
  children: [
    {
      index: true,
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/default-redirect');
        return { Component: Page };
      },
    },
    {
      path: 'academy',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/academy/browse');
            return { Component: Page };
          },
        },
        {
          path: 'courses/:courseId',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/academy/courses/details');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'analytics',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/analytics');
        return { Component: Page };
      },
    },
    {
      path: 'reports',
      element: (
        <AdminRoleGuard>
          <Outlet />
        </AdminRoleGuard>
      ),
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/reports');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'notifications',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/notifications');
        return { Component: Page };
      },
    },
    {
      path: 'help',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/help');
        return { Component: Page };
      },
    },
    {
      path: 'new-features',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/new-features');
        return { Component: Page };
      },
    },
    {
      path: 'blank',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/blank');
        return { Component: Page };
      },
    },
    {
      path: 'blog',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/blog/list');
            return { Component: Page };
          },
        },
        {
          path: 'create',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/blog/create');
            return { Component: Page };
          },
        },
        {
          path: ':postId',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/blog/details');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'calendar',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/calendar');
        return { Component: Page };
      },
    },
    {
      path: 'chat',
      element: (
        <ChatLayout>
          <Outlet />
        </ChatLayout>
      ),
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/chat/blank');
            return { Component: Page };
          },
        },
        {
          path: 'compose',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/chat/compose');
            return { Component: Page };
          },
        },
        {
          path: ':threadType/:threadId',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/chat/thread');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'crypto',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/crypto');
        return { Component: Page };
      },
    },
    {
      path: 'customers',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/customers/list');
            return { Component: Page };
          },
        },
        {
          path: 'create',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/customers/create');
            return { Component: Page };
          },
        },
        {
          path: ':customerId',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/customers/details');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'e-commerce',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/e-commerce');
        return { Component: Page };
      },
    },
    {
      path: 'file-storage',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/file-storage');
        return { Component: Page };
      },
    },
    {
      path: 'invoices',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/invoices/list');
            return { Component: Page };
          },
        },
        {
          path: 'create',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/invoices/create');
            return { Component: Page };
          },
        },
        {
          path: ':invoiceId',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/invoices/details');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'jobs',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/jobs/browse');
            return { Component: Page };
          },
        },
        {
          path: 'create',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/jobs/create');
            return { Component: Page };
          },
        },
        {
          path: 'companies/:companyId',
          element: (
            <JobCompanyLayout>
              <Outlet />
            </JobCompanyLayout>
          ),
          children: [
            {
              index: true,
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/jobs/company/details');
                return { Component: Page };
              },
            },
            {
              path: 'activity',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/jobs/company/activity');
                return { Component: Page };
              },
            },
            {
              path: 'assets',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/jobs/company/assets');
                return { Component: Page };
              },
            },
            {
              path: 'reviews',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/jobs/company/reviews');
                return { Component: Page };
              },
            },
            {
              path: 'team',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/jobs/company/team');
                return { Component: Page };
              },
            },
          ],
        },
      ],
    },
    {
      path: 'logistics',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/logistics/metrics');
            return { Component: Page };
          },
        },
        {
          path: 'fleet',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/logistics/fleet');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'mail',
      element: (
        <MailLayout>
          <Outlet />
        </MailLayout>
      ),
      children: [
        {
          path: ':labelId',
          children: [
            {
              index: true,
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/mail/threads');
                return { Component: Page };
              },
            },
            {
              path: ':threadId',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/mail/thread');
                return { Component: Page };
              },
            },
          ],
        },
      ],
    },
    {
      path: 'orders',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/orders/list');
            return { Component: Page };
          },
        },
        {
          path: 'create',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/orders/create');
            return { Component: Page };
          },
        },
        {
          path: ':orderId',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/orders/details');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'products',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/products/list');
            return { Component: Page };
          },
        },
        {
          path: 'create',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/products/create');
            return { Component: Page };
          },
        },
        {
          path: ':productId',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/products/details');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'businesses',
      element: (
        <BusinessFeatureGuard>
          <Outlet />
        </BusinessFeatureGuard>
      ),
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/businesses');
            return { Component: Page };
          },
        },
        {
          path: ':businessId',
          element: (
            <BusinessLayout>
              <Outlet />
            </BusinessLayout>
          ),
          children: [
            { index: true, element: <Navigate replace to="general" /> },
            {
              path: 'general',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/business-details/general');
                return { Component: Page };
              },
            },
            {
              path: 'sources',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/business-details/sources');
                return { Component: Page };
              },
            },
            {
              path: 'flow',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/business-details/flow');
                return { Component: Page };
              },
            },
            {
              path: 'leads',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/business-details/leads');
                return { Component: Page };
              },
            },
            {
              path: 'usage',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/business-details/usage');
                return { Component: Page };
              },
            },
            {
              path: 'configuration',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/business-details/configuration');
                return { Component: Page };
              },
            },
            {
              path: 'docs',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/business-details/docs');
                return { Component: Page };
              },
            },
          ],
        },
      ],
    },
    {
      path: 'profiles',
      children: [
        {
          index: true,
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/profiles');
            return { Component: Page };
          },
        },
        {
          path: ':profileId',
          element: (
            <ProfileLayout>
              <Outlet />
            </ProfileLayout>
          ),
          children: [
            {
              index: true,
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/profile');
                return { Component: Page };
              },
            },
            {
              path: 'template',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/template');
                return { Component: Page };
              },
            },
            {
              path: 'profile',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/profile');
                return { Component: Page };
              },
            },
            {
              path: 'data',
              element: <Navigate replace to="../sources" />,
            },
            {
              path: 'social-networks',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/social-networks');
                return { Component: Page };
              },
            },
            {
              path: 'sources',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/sources');
                return { Component: Page };
              },
            },
            {
              path: 'quality',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/quality');
                return { Component: Page };
              },
            },
            {
              path: 'avatar',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/avatar');
                return { Component: Page };
              },
            },
            {
              path: 'chats',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/chats');
                return { Component: Page };
              },
            },
            {
              path: 'chats/:chatId',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/chat-messages');
                return { Component: Page };
              },
            },
            {
              path: 'voice',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/voice');
                return { Component: Page };
              },
            },
            {
              path: 'messages',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/messages');
                return { Component: Page };
              },
            },
            {
              path: 'integrations',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/integrations');
                return { Component: Page };
              },
            },
            {
              path: 'products',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/products');
                return { Component: Page };
              },
            },
            {
              path: 'settings',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/profile-details/settings');
                return { Component: Page };
              },
            },
            {
              path: 'insights',
              children: [
                {
                  index: true,
                  lazy: async () => {
                    const { Page } = await import('@/pages/dashboard/profile-details/insights');
                    return { Component: Page };
                  },
                },
                ...['dashboard', 'chats', 'products', 'v1', 'v2', 'v3', 'v4', 'v5'].map((path) => ({
                  path,
                  lazy: async () => {
                    const { Page } = await import('@/pages/dashboard/profile-details/insights');
                    return { Component: Page };
                  },
                })),
              ],
            },
          ],
        },
      ],
    },
    {
      path: 'settings',
      element: (
        <SettingsLayout>
          <Outlet />
        </SettingsLayout>
      ),
      children: [
        {
          path: 'account',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/account');
            return { Component: Page };
          },
        },
        {
          path: 'billing',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/billing');
            return { Component: Page };
          },
        },
        {
          path: 'billing/payment-result',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/billing-payment-result');
            return { Component: Page };
          },
        },
        {
          path: 'payment-methods',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/payment-methods');
            return { Component: Page };
          },
        },
        {
          path: 'usage',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/usage');
            return { Component: Page };
          },
        },
        {
          path: 'notifications',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/notifications');
            return { Component: Page };
          },
        },
        {
          path: 'security',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/security');
            return { Component: Page };
          },
        },
        {
          path: 'team',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/team');
            return { Component: Page };
          },
        },
        {
          path: 'integrations',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/settings/integrations');
            return { Component: Page };
          },
        },
      ],
    },
    {
      path: 'social',
      children: [
        {
          path: 'feed',
          lazy: async () => {
            const { Page } = await import('@/pages/dashboard/social/feed');
            return { Component: Page };
          },
        },
        {
          path: 'profile',
          element: (
            <SocialProfileLayout>
              <Outlet />
            </SocialProfileLayout>
          ),
          children: [
            {
              index: true,
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/social/timeline');
                return { Component: Page };
              },
            },
            {
              path: 'connections',
              lazy: async () => {
                const { Page } = await import('@/pages/dashboard/social/connections');
                return { Component: Page };
              },
            },
          ],
        },
      ],
    },
    {
      path: 'tasks',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/tasks');
        return { Component: Page };
      },
    },
    {
      path: 'users',
      lazy: async () => {
        const { Page } = await import('@/pages/dashboard/users');
        return { Component: Page };
      },
    },
  ],
};

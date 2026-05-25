import * as React from 'react';
import type { RouteObject } from 'react-router-dom';
import { Outlet } from 'react-router-dom';

import { AuthStrategy } from '@/lib/auth/strategy';
import { StrategyGuard } from '@/components/auth/strategy-guard';
import { Page as ResetPasswordPage } from '@/pages/auth/custom/reset-password';
import { Page as SignInPage } from '@/pages/auth/custom/sign-in';
import { Page as SignUpPage } from '@/pages/auth/custom/sign-up';

export const route: RouteObject = {
  path: 'custom',
  element: (
    <StrategyGuard expected={AuthStrategy.CUSTOM}>
      <Outlet />
    </StrategyGuard>
  ),
  children: [
    {
      path: 'reset-password',
      element: <ResetPasswordPage />,
    },
    {
      path: 'sign-in',
      element: <SignInPage />,
    },
    {
      path: 'sign-up',
      element: <SignUpPage />,
    },
  ],
};

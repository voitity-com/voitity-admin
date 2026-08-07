import * as React from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { DynamicLayout } from '@/components/dashboard/layout/dynamic-layout';

import { NoPlanTutorialDialog } from './no-plan-tutorial-dialog';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps): React.JSX.Element {
  return (
    <AuthGuard>
      <React.Fragment>
        <DynamicLayout>{children}</DynamicLayout>
        <NoPlanTutorialDialog />
      </React.Fragment>
    </AuthGuard>
  );
}

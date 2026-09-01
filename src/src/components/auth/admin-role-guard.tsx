import * as React from 'react';
import { Navigate } from 'react-router-dom';

import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';

export function AdminRoleGuard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user } = useUser();

  if (user?.role !== 'admin') {
    return <Navigate replace to={paths.notAuthorized} />;
  }

  return <React.Fragment>{children}</React.Fragment>;
}

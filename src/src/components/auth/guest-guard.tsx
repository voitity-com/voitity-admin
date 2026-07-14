'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import { useLocation, useNavigate } from 'react-router-dom';

import { paths } from '@/paths';
import { getCheckoutIntentDestination, persistCheckoutIntentFromSearch } from '@/lib/billing/checkout-intent';
import { logger } from '@/lib/default-logger';
import { useUser } from '@/hooks/use-user';

export interface GuestGuardProps {
  children: React.ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps): React.JSX.Element | null {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, error, isLoading } = useUser();
  const [isChecking, setIsChecking] = React.useState<boolean>(true);

  const checkPermissions = async (): Promise<void> => {
    if (isLoading) {
      return;
    }

    if (error) {
      setIsChecking(false);
      return;
    }

    if (user) {
      logger.debug('[GuestGuard]: User is logged in, redirecting to intended destination');
      navigate(getCheckoutIntentDestination(location.search) ?? paths.dashboard.overview, { replace: true });
      return;
    }

    persistCheckoutIntentFromSearch(location.search);
    setIsChecking(false);
  };

  React.useEffect(() => {
    checkPermissions().catch(() => {
      // noop
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected
  }, [user, error, isLoading, location.search]);

  if (isChecking) {
    return null;
  }

  if (error) {
    return <Alert color="error">{error}</Alert>;
  }

  return <React.Fragment>{children}</React.Fragment>;
}

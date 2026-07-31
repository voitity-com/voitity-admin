'use client';

import * as React from 'react';
import { GTMProvider, useGTMDispatch } from '@elgorditosalsero/react-gtm-hook';
import { useSearchParams } from 'react-router-dom';

import { config } from '@/config';
import { usePathname } from '@/hooks/use-pathname';

interface PageViewTrackerProps {
  children: React.ReactNode;
}

function PageViewTracker({ children }: PageViewTrackerProps): React.JSX.Element {
  const dispatch = useGTMDispatch();
  const pathname = usePathname();
  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    dispatch({ event: 'page_view', page: pathname });
  }, [dispatch, pathname, searchParams]);

  return <React.Fragment>{children}</React.Fragment>;
}

interface AnalyticsProps {
  children: React.ReactNode;
}

/**
 * This loads GTM and tracks the page views.
 *
 * If GTM ID is not configured, this will no track any event.
 */
export function Analytics({ children }: AnalyticsProps): React.JSX.Element {
  const pathname = usePathname();
  const isSensitivePaymentPath =
    pathname === '/checkout' ||
    pathname.startsWith('/dashboard/settings/billing') ||
    pathname.startsWith('/dashboard/settings/payment-methods');

  if (!config.gtm?.id || isSensitivePaymentPath) {
    return <React.Fragment>{children}</React.Fragment>;
  }

  return (
    <GTMProvider state={{ id: config.gtm.id }}>
      <PageViewTracker>{children}</PageViewTracker>
    </GTMProvider>
  );
}

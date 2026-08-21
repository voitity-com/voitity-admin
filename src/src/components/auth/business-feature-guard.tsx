import * as React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { Navigate } from 'react-router-dom';

import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { getAdminFeatures } from '@/lib/features/api-client';
import { useUser } from '@/hooks/use-user';

export function BusinessFeatureGuard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user } = useUser();
  const [enabled, setEnabled] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    if (user?.role !== 'admin') {
      setEnabled(false);
      return undefined;
    }
    getAdminFeatures()
      .then((features) => {
        if (active) setEnabled(Boolean(features.find((feature) => feature.key === 'business')?.enabled));
      })
      .catch((error) => {
        logger.error(error);
        if (active) setEnabled(false);
      });

    return () => {
      active = false;
    };
  }, [user?.role]);

  if (user?.role !== 'admin') return <Navigate replace to={paths.notAuthorized} />;
  if (enabled === false) return <Navigate replace to={paths.notFound} />;
  if (enabled === null) {
    return (
      <Box sx={{ display: 'grid', minHeight: 320, placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <React.Fragment>{children}</React.Fragment>;
}

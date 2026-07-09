import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { paths } from '@/paths';
import { usePathname } from '@/hooks/use-pathname';
import { SideNav } from '@/components/dashboard/settings/side-nav';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps): React.JSX.Element {
  const pathname = usePathname();
  const shouldHideSideNav = pathname.startsWith(paths.dashboard.settings.billing);

  return (
    <Box
      sx={{
        maxWidth: 'var(--Content-maxWidth)',
        m: 'var(--Content-margin)',
        p: 'var(--Content-padding)',
        width: 'var(--Content-width)',
      }}
    >
      {shouldHideSideNav ? (
        children
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ position: 'relative' }}>
          <SideNav />
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>{children}</Box>
        </Stack>
      )}
    </Box>
  );
}

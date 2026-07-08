'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';

import { filterNavItemsByRole } from '@/lib/filter-nav-items-by-role';
import { useSettings } from '@/hooks/use-settings';
import { useUser } from '@/hooks/use-user';

import { AdminImpersonationBar } from '../admin-impersonation-bar';
import { layoutConfig } from '../config';
import { MainNav } from './main-nav';

export interface HorizontalLayoutProps {
  children?: React.ReactNode;
}

export function HorizontalLayout({ children }: HorizontalLayoutProps): React.JSX.Element {
  const { settings } = useSettings();
  const { user } = useUser();
  const navItems = React.useMemo(() => filterNavItemsByRole(layoutConfig.navItems, user?.role), [user?.role]);

  return (
    <React.Fragment>
      <GlobalStyles
        styles={{ body: { '--MainNav-zIndex': 1000, '--MobileNav-width': '320px', '--MobileNav-zIndex': 1100 } }}
      />
      <Box
        sx={{
          bgcolor: 'var(--mui-palette-background-default)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: '100%',
        }}
      >
        <MainNav color={settings.navColor} items={navItems} />
        <AdminImpersonationBar />
        <Box
          component="main"
          sx={{
            '--Content-margin': '0 auto',
            '--Content-maxWidth': 'var(--maxWidth-xl)',
            '--Content-paddingX': '24px',
            '--Content-paddingY': { xs: '24px', lg: '64px' },
            '--Content-padding': 'var(--Content-paddingY) var(--Content-paddingX)',
            '--Content-width': '100%',
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>
    </React.Fragment>
  );
}

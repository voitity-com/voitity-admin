import * as React from 'react';
import Box from '@mui/material/Box';

import { ProfilePublicationDock } from './profile-publication-dock';
import { ProfilePublicationOnboarding } from './profile-publication-onboarding';
import { ProfileQualityDock } from './profile-quality-dock';
import { ProfileSideNav } from './profile-side-nav';
import { ProfileWidgetLauncher } from './profile-widget-launcher';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export function ProfileLayout({ children }: ProfileLayoutProps): React.JSX.Element {
  return (
    <Box
      sx={{
        maxWidth: 'var(--Content-maxWidth)',
        m: 'var(--Content-margin)',
        p: 'var(--Content-padding)',
        pb: { xs: '116px', sm: '104px' },
        pt: { xs: 1.5, md: 2 },
        width: 'var(--Content-width)',
      }}
    >
      <Box
        sx={{
          columnGap: { md: 4 },
          display: 'grid',
          gridTemplateAreas: {
            md: '"publication publication" "navigation content"',
            xs: '"navigation" "publication" "content"',
          },
          gridTemplateColumns: { md: '240px minmax(0, 1fr)', xs: 'minmax(0, 1fr)' },
        }}
      >
        <Box sx={{ gridArea: 'publication' }}>
          <ProfilePublicationDock />
        </Box>
        <Box sx={{ gridArea: 'navigation', height: { md: 'auto', xs: 52 } }}>
          <ProfileSideNav />
        </Box>
        <Box sx={{ gridArea: 'content', minWidth: 0 }}>{children}</Box>
      </Box>
      <ProfileQualityDock />
      <ProfileWidgetLauncher />
      <ProfilePublicationOnboarding />
    </Box>
  );
}

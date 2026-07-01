'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { Database as DatabaseIcon } from '@phosphor-icons/react/dist/ssr/Database';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { usePathname } from '@/hooks/use-pathname';
import { RouterLink } from '@/components/core/link';

const icons = {
  avatar: ImageIcon,
  chats: ChatsCircleIcon,
  data: DatabaseIcon,
  profile: UserCircleIcon,
  socialNetworks: ShareNetworkIcon,
  voice: MicrophoneIcon,
} as Record<string, Icon>;

export function ProfileSideNav(): React.JSX.Element {
  const pathname = usePathname();
  const { profileId = '' } = useParams();
  const { t } = useTranslation();

  const items = React.useMemo(
    () => [
      {
        key: 'profile',
        title: t('dashboard.profiles.detail.nav.profile'),
        href: paths.dashboard.profileDetails.profile(profileId),
        icon: 'profile',
      },
      {
        key: 'data',
        title: t('dashboard.profiles.detail.nav.data'),
        href: paths.dashboard.profileDetails.data(profileId),
        icon: 'data',
      },
      {
        key: 'socialNetworks',
        title: t('dashboard.profiles.detail.nav.socialNetworks'),
        href: paths.dashboard.profileDetails.socialNetworks(profileId),
        icon: 'socialNetworks',
      },
      {
        key: 'avatar',
        title: t('dashboard.profiles.detail.nav.avatar'),
        href: paths.dashboard.profileDetails.avatar(profileId),
        icon: 'avatar',
      },
      {
        key: 'chats',
        title: t('dashboard.profiles.detail.nav.chats'),
        href: paths.dashboard.profileDetails.chats(profileId),
        icon: 'chats',
      },
      {
        key: 'voice',
        title: t('dashboard.profiles.detail.nav.voice'),
        href: paths.dashboard.profileDetails.voice(profileId),
        icon: 'voice',
      },
    ],
    [profileId, t]
  );

  return (
    <Stack
      spacing={3}
      sx={{
        flex: '0 0 auto',
        position: { md: 'sticky' },
        top: '64px',
        width: { xs: '100%', md: '240px' },
      }}
    >
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {items.map((item) => (
          <NavItem {...item} key={item.key} pathname={pathname} />
        ))}
      </Stack>
    </Stack>
  );
}

interface NavItemProps {
  href: string;
  icon: string;
  pathname: string;
  title: string;
}

function NavItem({ href, icon, pathname, title }: NavItemProps): React.JSX.Element {
  const active = isNavItemActive({ href, pathname });
  const Icon = icons[icon];

  return (
    <Box component="li" sx={{ userSelect: 'none' }}>
      <Box
        component={RouterLink}
        href={href}
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          color: 'var(--mui-palette-text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          gap: 1,
          p: '6px 16px',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          ...(active && { bgcolor: 'var(--mui-palette-action-selected)', color: 'var(--mui-palette-text-primary)' }),
          '&:hover': {
            ...(!active && { bgcolor: 'var(--mui-palette-action-hover)', color: 'var(--mui-palette-text-primary)' }),
          },
        }}
      >
        <Box sx={{ alignItems: 'center', display: 'flex', flex: '0 0 auto', justifyContent: 'center' }}>
          <Icon
            fill={active ? 'var(--mui-palette-text-primary)' : 'var(--mui-palette-text-secondary)'}
            fontSize="var(--icon-fontSize-md)"
            weight={active ? 'fill' : undefined}
          />
        </Box>
        <Typography component="span" sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: 500, lineHeight: '28px' }}>
          {title}
        </Typography>
      </Box>
    </Box>
  );
}

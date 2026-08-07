'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { ChatText as ChatTextIcon } from '@phosphor-icons/react/dist/ssr/ChatText';
import { Database as DatabaseIcon } from '@phosphor-icons/react/dist/ssr/Database';
import { File as FileIcon } from '@phosphor-icons/react/dist/ssr/File';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { Gear as GearIcon } from '@phosphor-icons/react/dist/ssr/Gear';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import type { FeatureFlag } from '@/lib/features/api-client';
import { getProfileFeatures, isFeatureEffective } from '@/lib/features/api-client';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { usePathname } from '@/hooks/use-pathname';
import { RouterLink } from '@/components/core/link';

const icons = {
  avatar: ImageIcon,
  chats: ChatsCircleIcon,
  data: DatabaseIcon,
  integrations: PlugsConnectedIcon,
  insights: ChartLineUpIcon,
  messages: ChatTextIcon,
  products: PackageIcon,
  profile: UserCircleIcon,
  quality: GaugeIcon,
  settings: GearIcon,
  socialNetworks: ShareNetworkIcon,
  sources: FileIcon,
  voice: MicrophoneIcon,
} as Record<string, Icon>;

export function ProfileSideNav(): React.JSX.Element {
  const pathname = usePathname();
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [features, setFeatures] = React.useState<FeatureFlag[]>([]);

  const loadFeatures = React.useCallback(async (): Promise<void> => {
    if (!profileId) {
      setFeatures([]);
      return;
    }

    try {
      setFeatures(await getProfileFeatures(profileId));
    } catch (err) {
      logger.error(err);
      setFeatures([]);
    }
  }, [profileId]);

  React.useEffect(() => {
    loadFeatures().catch((err) => {
      logger.error(err);
    });
  }, [loadFeatures]);

  React.useEffect(() => {
    const handleFeaturesUpdated = (event: Event): void => {
      const detail = (event as CustomEvent<{ profileId?: number | string }>).detail;

      if (detail?.profileId && String(detail.profileId) !== String(profileId)) {
        return;
      }

      loadFeatures().catch((err) => {
        logger.error(err);
      });
    };

    window.addEventListener('profile-features-updated', handleFeaturesUpdated);

    return () => {
      window.removeEventListener('profile-features-updated', handleFeaturesUpdated);
    };
  }, [loadFeatures, profileId]);

  const showIntegrations = React.useMemo(
    () => features.some((feature) => feature.group === 'integrations' && feature.effective),
    [features]
  );
  const showProducts = React.useMemo(() => isFeatureEffective(features, 'products'), [features]);

  const items = React.useMemo<NavEntry[]>(
    () => [
      {
        key: 'profile',
        title: t('dashboard.profiles.detail.nav.profile'),
        href: paths.dashboard.profileDetails.profile(profileId),
        icon: 'profile',
      },
      {
        key: 'avatar',
        title: t('dashboard.profiles.detail.nav.avatar'),
        href: paths.dashboard.profileDetails.avatar(profileId),
        icon: 'avatar',
      },
      {
        key: 'voice',
        title: t('dashboard.profiles.detail.nav.voice'),
        href: paths.dashboard.profileDetails.voice(profileId),
        icon: 'voice',
      },
      {
        key: 'dataGroup',
        title: t('dashboard.profiles.detail.nav.data'),
        icon: 'data',
        children: [
          {
            key: 'sources',
            title: t('dashboard.profiles.detail.nav.sources'),
            href: paths.dashboard.profileDetails.sources(profileId),
            icon: 'sources',
          },
          {
            key: 'data',
            title: t('dashboard.profiles.detail.nav.profileData'),
            href: paths.dashboard.profileDetails.data(profileId),
            icon: 'data',
          },
          {
            key: 'socialNetworks',
            title: t('dashboard.profiles.detail.nav.socialNetworks'),
            href: paths.dashboard.profileDetails.socialNetworks(profileId),
            icon: 'socialNetworks',
          },
        ],
      },
      ...(showIntegrations
        ? [
            {
              key: 'integrations',
              title: t('dashboard.profiles.detail.nav.integrations'),
              href: paths.dashboard.profileDetails.integrations(profileId),
              icon: 'integrations',
            },
          ]
        : []),
      ...(showProducts
        ? [
            {
              key: 'products',
              title: t('dashboard.profiles.detail.nav.products'),
              href: paths.dashboard.profileDetails.products(profileId),
              icon: 'products',
            },
          ]
        : []),
      {
        key: 'messages',
        title: t('dashboard.profiles.detail.nav.messages'),
        href: paths.dashboard.profileDetails.messages(profileId),
        icon: 'messages',
      },
      {
        key: 'chats',
        title: t('dashboard.profiles.detail.nav.chats'),
        href: paths.dashboard.profileDetails.chats(profileId),
        icon: 'chats',
      },
      {
        key: 'quality',
        title: t('dashboard.profiles.detail.nav.quality'),
        href: paths.dashboard.profileDetails.quality(profileId),
        icon: 'quality',
      },
      {
        key: 'insights',
        title: t('dashboard.profiles.detail.nav.insights'),
        href: paths.dashboard.profileDetails.insights.dashboard(profileId),
        icon: 'insights',
      },
      {
        key: 'settings',
        title: t('dashboard.profiles.detail.nav.settings'),
        href: paths.dashboard.profileDetails.settings(profileId),
        icon: 'settings',
      },
    ],
    [profileId, showIntegrations, showProducts, t]
  );
  const activeNavContext = getActiveNavContext(items, pathname);
  const activeItem = activeNavContext.item;

  return (
    <Stack
      id="profile-detail-side-nav"
      spacing={1}
      sx={{
        flex: '0 0 auto',
        position: { xs: 'sticky', md: 'sticky' },
        top: { xs: '64px', md: '64px' },
        zIndex: { xs: 10, md: 'auto' },
        width: { xs: '100%', md: '240px' },
      }}
    >
      <MobileProfileNav
        activeItem={activeItem}
        activeParentTitle={activeNavContext.parentTitle}
        includeActiveId={!isDesktop}
        items={items}
        pathname={pathname}
      />
      <Stack component="ul" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, listStyle: 'none', m: 0, p: 0 }}>
        {items.map((item) =>
          isNavGroup(item) ? (
            <NavGroup {...item} includeItemIds={isDesktop} key={item.key} pathname={pathname} />
          ) : (
            <NavItem {...item} includeId={isDesktop} itemKey={item.key} key={item.key} pathname={pathname} />
          )
        )}
      </Stack>
    </Stack>
  );
}

interface NavGroupProps {
  children: NavItemConfig[];
  includeItemIds?: boolean;
  icon: string;
  pathname: string;
  title: string;
}

interface NavItemProps {
  href: string;
  icon: string;
  includeId?: boolean;
  itemKey?: string;
  pathname: string;
  title: string;
  nested?: boolean;
}

interface NavItemConfig {
  href: string;
  icon: string;
  key: string;
  title: string;
}

interface NavGroupConfig {
  children: NavItemConfig[];
  icon: string;
  key: string;
  title: string;
}

type NavEntry = NavGroupConfig | NavItemConfig;

function isNavGroup(item: NavEntry): item is NavGroupConfig {
  return 'children' in item;
}

function getActiveNavContext(items: NavEntry[], pathname: string): { item: NavItemConfig; parentTitle?: string } {
  for (const entry of items) {
    if (isNavGroup(entry)) {
      const activeChild = entry.children.find((item) => isNavItemActive({ href: item.href, pathname }));

      if (activeChild) {
        return { item: activeChild, parentTitle: entry.title };
      }

      continue;
    }

    if (isNavItemActive({ href: entry.href, pathname })) {
      return { item: entry };
    }
  }

  return { item: flattenNavItems(items)[0] };
}

function flattenNavItems(items: NavEntry[]): NavItemConfig[] {
  return items.flatMap((item) => (isNavGroup(item) ? item.children : [item]));
}

function MobileProfileNav({
  activeItem,
  activeParentTitle,
  includeActiveId,
  items,
  pathname,
}: {
  activeItem: NavItemConfig;
  activeParentTitle?: string;
  includeActiveId: boolean;
  items: NavEntry[];
  pathname: string;
}): React.JSX.Element {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const ActiveIcon = icons[activeItem.icon];

  const handleOpen = React.useCallback((event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = React.useCallback((): void => {
    setAnchorEl(null);
  }, []);

  return (
    <Box
      id={includeActiveId ? `profile-detail-nav-${activeItem.key}` : undefined}
      sx={{
        bgcolor: 'var(--mui-palette-background-paper)',
        display: { xs: 'block', md: 'none' },
        pb: 1,
      }}
    >
      <Button
        aria-controls={open ? 'profile-detail-mobile-nav-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="menu"
        endIcon={<CaretDownIcon fontSize="var(--icon-fontSize-sm)" />}
        fullWidth
        onClick={handleOpen}
        startIcon={<ActiveIcon fontSize="var(--icon-fontSize-md)" weight="fill" />}
        sx={{
          bgcolor: 'var(--mui-palette-background-paper)',
          borderColor: 'var(--mui-palette-divider)',
          color: 'var(--mui-palette-text-primary)',
          height: 44,
          justifyContent: 'space-between',
          px: 1.5,
          textTransform: 'none',
          '& .MuiButton-endIcon': { ml: 'auto' },
          '& .MuiButton-startIcon': { mr: 1 },
        }}
        variant="outlined"
      >
        <Box
          component="span"
          sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textAlign: 'left', textOverflow: 'ellipsis' }}
        >
          {activeParentTitle ? `${activeParentTitle} / ${activeItem.title}` : activeItem.title}
        </Box>
      </Button>
      <Menu
        PaperProps={{
          sx: {
            maxHeight: 'min(380px, 68vh)',
            mt: 0.75,
            width: anchorEl?.clientWidth ?? '100%',
          },
        }}
        anchorEl={anchorEl}
        id="profile-detail-mobile-nav-menu"
        onClose={handleClose}
        open={open}
      >
        {items.flatMap((item, index) => {
          if (!isNavGroup(item)) {
            return [<MobileNavItem item={item} key={item.key} onClose={handleClose} pathname={pathname} />];
          }

          return [
            <MobileNavGroupHeader item={item} key={`${item.key}-header`} pathname={pathname} />,
            <Box
              key={`${item.key}-items`}
              sx={{
                borderLeft: '1px solid var(--mui-palette-divider)',
                mb: 0.75,
                ml: 2.75,
                pl: 0.75,
              }}
            >
              {item.children.map((child) => (
                <MobileNavItem item={child} key={child.key} nested onClose={handleClose} pathname={pathname} />
              ))}
            </Box>,
            ...(index < items.length - 1 ? [<Divider key={`${item.key}-divider`} sx={{ my: 0.5 }} />] : []),
          ];
        })}
      </Menu>
    </Box>
  );
}

function MobileNavGroupHeader({ item, pathname }: { item: NavGroupConfig; pathname: string }): React.JSX.Element {
  const active = item.children.some((child) => isNavItemActive({ href: child.href, pathname }));
  const Icon = icons[item.icon];

  return (
    <ListSubheader
      disableSticky
      sx={{
        bgcolor: 'transparent',
        color: active ? 'var(--mui-palette-text-primary)' : 'var(--mui-palette-text-secondary)',
        lineHeight: 'normal',
        px: 1.5,
        py: 0.75,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Icon
          fill={active ? 'var(--mui-palette-text-primary)' : 'var(--mui-palette-text-secondary)'}
          fontSize="var(--icon-fontSize-sm)"
          weight={active ? 'fill' : undefined}
        />
        <Typography
          component="span"
          sx={{ color: 'inherit', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}
        >
          {item.title}
        </Typography>
      </Stack>
    </ListSubheader>
  );
}

function MobileNavItem({
  item,
  nested = false,
  onClose,
  pathname,
}: {
  item: NavItemConfig;
  nested?: boolean;
  onClose: () => void;
  pathname: string;
}): React.JSX.Element {
  const active = isNavItemActive({ href: item.href, pathname });
  const Icon = icons[item.icon];

  return (
    <MenuItem
      component={RouterLink}
      href={item.href}
      onClick={onClose}
      selected={active}
      sx={{
        borderRadius: 1,
        minHeight: nested ? 40 : 44,
        mx: 0.75,
        my: 0.25,
        pl: nested ? 1 : 1.5,
        pr: 1.5,
      }}
    >
      <ListItemIcon sx={{ minWidth: nested ? 32 : 36 }}>
        <Icon
          fill={active ? 'var(--mui-palette-text-primary)' : 'var(--mui-palette-text-secondary)'}
          fontSize={nested ? 'var(--icon-fontSize-sm)' : 'var(--icon-fontSize-md)'}
          weight={active ? 'fill' : undefined}
        />
      </ListItemIcon>
      <ListItemText primary={item.title} primaryTypographyProps={{ noWrap: true }} />
    </MenuItem>
  );
}

function NavGroup({ children, icon, includeItemIds = true, pathname, title }: NavGroupProps): React.JSX.Element {
  const active = children.some((item) => isNavItemActive({ href: item.href, pathname }));
  const Icon = icons[icon];

  return (
    <Box component="li" sx={{ userSelect: 'none' }}>
      <Box
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          color: active ? 'var(--mui-palette-text-primary)' : 'var(--mui-palette-text-secondary)',
          display: 'flex',
          gap: 1,
          p: '6px 16px',
          ...(active && { bgcolor: 'var(--mui-palette-action-hover)' }),
        }}
      >
        <Box sx={{ alignItems: 'center', display: 'flex', flex: '0 0 auto', justifyContent: 'center' }}>
          <Icon
            fill={active ? 'var(--mui-palette-text-primary)' : 'var(--mui-palette-text-secondary)'}
            fontSize="var(--icon-fontSize-md)"
            weight={active ? 'fill' : undefined}
          />
        </Box>
        <Typography
          component="span"
          sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: 600, lineHeight: '28px' }}
        >
          {title}
        </Typography>
      </Box>
      <Stack
        component="ul"
        spacing={0.5}
        sx={{
          borderLeft: '1px solid var(--mui-palette-divider)',
          listStyle: 'none',
          ml: '28px',
          mt: 0.75,
          pl: 1,
        }}
      >
        {children.map((item) => (
          <NavItem {...item} includeId={includeItemIds} itemKey={item.key} key={item.key} nested pathname={pathname} />
        ))}
      </Stack>
    </Box>
  );
}

function NavItem({
  href,
  icon,
  includeId = true,
  itemKey,
  nested = false,
  pathname,
  title,
}: NavItemProps): React.JSX.Element {
  const active = isNavItemActive({ href, pathname });
  const Icon = icons[icon];
  const navItemId = includeId && itemKey ? `profile-detail-nav-${itemKey}` : undefined;

  return (
    <Box component="li" id={navItemId} sx={{ borderRadius: 1, userSelect: 'none' }}>
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
          p: nested ? '5px 12px' : '6px 16px',
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
            fontSize={nested ? 'var(--icon-fontSize-sm)' : 'var(--icon-fontSize-md)'}
            weight={active ? 'fill' : undefined}
          />
        </Box>
        <Typography
          component="span"
          sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: 500, lineHeight: '28px' }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
}

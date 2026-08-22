'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { BookOpen as BookOpenIcon } from '@phosphor-icons/react/dist/ssr/BookOpen';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { Database as DatabaseIcon } from '@phosphor-icons/react/dist/ssr/Database';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { FlowArrow as FlowArrowIcon } from '@phosphor-icons/react/dist/ssr/FlowArrow';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { Gear as GearIcon } from '@phosphor-icons/react/dist/ssr/Gear';
import { IdentificationCard as IdentificationCardIcon } from '@phosphor-icons/react/dist/ssr/IdentificationCard';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { usePathname } from '@/hooks/use-pathname';
import { RouterLink } from '@/components/core/link';

interface BusinessNavItem {
  href: string;
  icon: Icon;
  key: string;
  title: string;
  unreadCount?: number;
}

export function BusinessSideNav({ unreadLeadsCount = 0 }: { unreadLeadsCount?: number }): React.JSX.Element {
  const { businessId = '' } = useParams();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const items = React.useMemo<BusinessNavItem[]>(() => [
    { href: paths.dashboard.businessDetails.general(businessId), icon: IdentificationCardIcon, key: 'general', title: t('dashboard.business.nav.general') },
    { href: paths.dashboard.businessDetails.sources(businessId), icon: DatabaseIcon, key: 'sources', title: t('dashboard.business.nav.sources') },
    { href: paths.dashboard.businessDetails.flow(businessId), icon: FlowArrowIcon, key: 'flow', title: t('dashboard.business.nav.flow') },
    { href: paths.dashboard.businessDetails.leads(businessId), icon: FileTextIcon, key: 'leads', title: t('dashboard.business.nav.leads'), unreadCount: unreadLeadsCount },
    { href: paths.dashboard.businessDetails.usage(businessId), icon: GaugeIcon, key: 'usage', title: t('dashboard.business.nav.usage') },
    { href: paths.dashboard.businessDetails.configuration(businessId), icon: GearIcon, key: 'configuration', title: t('dashboard.business.nav.configuration') },
    { href: paths.dashboard.businessDetails.docs(businessId), icon: BookOpenIcon, key: 'docs', title: t('dashboard.business.nav.docs') },
  ], [businessId, t, unreadLeadsCount]);
  const activeItem = items.find((item) => isNavItemActive({ href: item.href, pathname })) ?? items[0];
  const ActiveIcon = activeItem.icon;

  return (
    <Stack
      id="business-detail-side-nav"
      spacing={1}
      sx={{
        flex: '0 0 auto',
        position: { xs: 'sticky', md: 'sticky' },
        top: { xs: '64px', md: '64px' },
        width: { xs: '100%', md: '240px' },
        zIndex: { xs: 10, md: 'auto' },
      }}
    >
      <Box sx={{ bgcolor: 'var(--mui-palette-background-paper)', display: { xs: 'block', md: 'none' }, pb: 1 }}>
        <Button
          aria-controls={anchorEl ? 'business-detail-mobile-nav-menu' : undefined}
          aria-expanded={anchorEl ? 'true' : undefined}
          aria-haspopup="menu"
          endIcon={<CaretDownIcon fontSize="var(--icon-fontSize-sm)" />}
          fullWidth
          onClick={(event) => { setAnchorEl(event.currentTarget); }}
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
          <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, minWidth: 0, overflow: 'hidden', textAlign: 'left' }}>
            <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeItem.title}</Box>
            <UnreadBadge count={activeItem.unreadCount ?? 0} label={t('dashboard.business.leads.unreadCount', { count: activeItem.unreadCount ?? 0 })} />
          </Stack>
        </Button>
        <Menu
          PaperProps={{ sx: { maxHeight: 'min(380px, 68vh)', mt: 0.75, width: anchorEl?.clientWidth ?? '100%' } }}
          anchorEl={anchorEl}
          id="business-detail-mobile-nav-menu"
          onClose={() => { setAnchorEl(null); }}
          open={Boolean(anchorEl)}
        >
          {items.map((item) => {
            const active = isNavItemActive({ href: item.href, pathname });
            const Icon = item.icon;

            return (
              <MenuItem
                component={RouterLink}
                href={item.href}
                key={item.key}
                onClick={() => { setAnchorEl(null); }}
                selected={active}
                sx={{ borderRadius: 1, minHeight: 44, mx: 0.75, my: 0.25, px: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon
                    fill={active ? 'var(--mui-palette-text-primary)' : 'var(--mui-palette-text-secondary)'}
                    fontSize="var(--icon-fontSize-md)"
                    weight={active ? 'fill' : undefined}
                  />
                </ListItemIcon>
                <ListItemText primary={item.title} primaryTypographyProps={{ noWrap: true }} />
                <UnreadBadge count={item.unreadCount ?? 0} label={t('dashboard.business.leads.unreadCount', { count: item.unreadCount ?? 0 })} />
              </MenuItem>
            );
          })}
        </Menu>
      </Box>

      <Stack component="ul" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, listStyle: 'none', m: 0, p: 0 }}>
        {items.map((item) => {
          const active = isNavItemActive({ href: item.href, pathname });
          const Icon = item.icon;

          return (
            <Box component="li" key={item.key} sx={{ borderRadius: 1, userSelect: 'none' }}>
              <Box
                component={RouterLink}
                href={item.href}
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
                  '&:hover': { ...(!active && { bgcolor: 'var(--mui-palette-action-hover)', color: 'var(--mui-palette-text-primary)' }) },
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
                  {item.title}
                </Typography>
                <UnreadBadge count={item.unreadCount ?? 0} label={t('dashboard.business.leads.unreadCount', { count: item.unreadCount ?? 0 })} />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

function UnreadBadge({ count, label }: { count: number; label: string }): React.JSX.Element | null {
  if (count <= 0) return null;

  return (
    <Box
      aria-label={label}
      component="span"
      sx={{
        alignItems: 'center',
        bgcolor: 'error.main',
        borderRadius: 999,
        color: 'error.contrastText',
        display: 'inline-flex',
        flex: '0 0 auto',
        fontSize: '0.6875rem',
        fontWeight: 700,
        height: 20,
        justifyContent: 'center',
        lineHeight: 1,
        minWidth: 20,
        px: count > 9 ? 0.625 : 0,
      }}
    >
      {count > 99 ? '99+' : count}
    </Box>
  );
}

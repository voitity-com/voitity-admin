'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { LockKey as LockKeyIcon } from '@phosphor-icons/react/dist/ssr/LockKey';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';

import { config } from '@/config';
import { paths } from '@/paths';
import { AuthStrategy } from '@/lib/auth/strategy';
import { useUser } from '@/hooks/use-user';
import { RouterLink } from '@/components/core/link';

import { Auth0SignOut } from './auth0-sign-out';
import { CognitoSignOut } from './cognito-sign-out';
import { CustomSignOut } from './custom-sign-out';
import { FirebaseSignOut } from './firebase-sign-out';
import { SupabaseSignOut } from './supabase-sign-out';

export interface UserPopoverProps {
  anchorEl: null | Element;
  onClose?: () => void;
  open: boolean;
}

export function UserPopover({ anchorEl, onClose, open }: UserPopoverProps): React.JSX.Element {
  const { user } = useUser();
  const name = getUserName(user);
  const email = typeof user?.email === 'string' ? user.email : '';

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      onClose={onClose}
      open={Boolean(open)}
      slotProps={{ paper: { sx: { width: '280px' } } }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    >
      <Box sx={{ p: 2 }}>
        <Typography>{name}</Typography>
        <Typography color="text.secondary" variant="body2">
          {email}
        </Typography>
      </Box>
      <Divider />
      <List sx={{ p: 1 }}>
        <MenuItem component={RouterLink} href={paths.dashboard.settings.account} onClick={onClose}>
          <ListItemIcon>
            <UserIcon />
          </ListItemIcon>
          Account
        </MenuItem>
        <MenuItem component={RouterLink} href={paths.dashboard.settings.security} onClick={onClose}>
          <ListItemIcon>
            <LockKeyIcon />
          </ListItemIcon>
          Security
        </MenuItem>
        <MenuItem component={RouterLink} href={paths.dashboard.settings.billing} onClick={onClose}>
          <ListItemIcon>
            <CreditCardIcon />
          </ListItemIcon>
          Billing
        </MenuItem>
      </List>
      <Divider />
      <Box sx={{ p: 1 }}>
        {config.auth.strategy === AuthStrategy.CUSTOM ? <CustomSignOut /> : null}
        {config.auth.strategy === AuthStrategy.AUTH0 ? <Auth0SignOut /> : null}
        {config.auth.strategy === AuthStrategy.COGNITO ? <CognitoSignOut /> : null}
        {config.auth.strategy === AuthStrategy.FIREBASE ? <FirebaseSignOut /> : null}
        {config.auth.strategy === AuthStrategy.SUPABASE ? <SupabaseSignOut /> : null}
      </Box>
    </Popover>
  );
}

function getUserName(user: null | { email?: string; firstName?: unknown; lastName?: unknown; name?: string }): string {
  if (user?.name) {
    return user.name;
  }

  const firstName = typeof user?.firstName === 'string' ? user.firstName : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return fullName || user?.email || 'User';
}

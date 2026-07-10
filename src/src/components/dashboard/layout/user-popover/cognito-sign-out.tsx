'use client';

import * as React from 'react';
import { signOut } from '@aws-amplify/auth';
import MenuItem from '@mui/material/MenuItem';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

export function CognitoSignOut(): React.JSX.Element {
  const { t } = useTranslation();

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    try {
      await signOut();
      // UserProvider will handle Router refresh
      // After refresh, GuestGuard will handle the redirect
    } catch (err) {
      logger.error('Sign out error', err);
      toast.error(t('dashboard.userPopover.errors.signOut'));
    }
  }, [t]);

  return (
    <MenuItem component="div" onClick={handleSignOut} sx={{ justifyContent: 'center' }}>
      {t('dashboard.userPopover.actions.signOut')}
    </MenuItem>
  );
}

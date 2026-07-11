'use client';

import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import { useTranslation } from 'react-i18next';

import { authClient } from '@/lib/auth/custom/client';
import { logger } from '@/lib/default-logger';
import { useUser } from '@/hooks/use-user';
import { toast } from '@/components/core/toaster';

export function CustomSignOut(): React.JSX.Element {
  const { checkSession } = useUser();
  const { t } = useTranslation();

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    toast.dismiss();

    try {
      const { error } = await authClient.signOut();

      if (error) {
        logger.error('Sign out error', error);
        toast.error(t('dashboard.userPopover.errors.signOut'));
        return;
      }

      // Refresh the auth state
      await checkSession?.();
      // After refresh, GuestGuard will handle the redirect
    } catch (err) {
      logger.error('Sign out error', err);
      toast.error(t('dashboard.userPopover.errors.signOut'));
    }
  }, [checkSession, t]);

  return (
    <MenuItem component="div" onClick={handleSignOut} sx={{ justifyContent: 'center' }}>
      {t('dashboard.userPopover.actions.signOut')}
    </MenuItem>
  );
}

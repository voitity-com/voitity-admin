'use client';

import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import type { Auth } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';

import { getFirebaseAuth } from '@/lib/auth/firebase/client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

export function FirebaseSignOut(): React.JSX.Element {
  const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());
  const { t } = useTranslation();

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    try {
      await signOut(firebaseAuth);
      // UserProvider will handle Router refresh
      // After refresh, GuestGuard will handle the redirect
    } catch (err) {
      logger.error('Sign out error', err);
      toast.error(t('dashboard.userPopover.errors.signOut'));
    }
  }, [firebaseAuth, t]);

  return (
    <MenuItem component="div" onClick={handleSignOut} sx={{ justifyContent: 'center' }}>
      {t('dashboard.userPopover.actions.signOut')}
    </MenuItem>
  );
}

'use client';

import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { toast } from '@/components/core/toaster';

export function SupabaseSignOut(): React.JSX.Element {
  const [supabaseClient] = React.useState<SupabaseClient>(createSupabaseClient());
  const { t } = useTranslation();

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        logger.error('Sign out error', error);
        toast.error(t('dashboard.userPopover.errors.signOut'));
      } else {
        // UserProvider will handle Router refresh
        // After refresh, GuestGuard will handle the redirect
      }
    } catch (err) {
      logger.error('Sign out error', err);
      toast.error(t('dashboard.userPopover.errors.signOut'));
    }
  }, [supabaseClient, t]);

  return (
    <MenuItem component="div" onClick={handleSignOut} sx={{ justifyContent: 'center' }}>
      {t('dashboard.userPopover.actions.signOut')}
    </MenuItem>
  );
}

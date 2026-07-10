import * as React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import MenuItem from '@mui/material/MenuItem';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

export function Auth0SignOut(): React.JSX.Element {
  const { logout } = useAuth0();
  const { t } = useTranslation();

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    try {
      await logout();
      // This will redirect to the Auth0 and then redirect back to the app
    } catch (err) {
      logger.error('Sign out error', err);
      toast.error(t('dashboard.userPopover.errors.signOut'));
    }
  }, [logout, t]);

  return (
    <MenuItem onClick={handleSignOut} sx={{ justifyContent: 'center' }}>
      {t('dashboard.userPopover.actions.signOut')}
    </MenuItem>
  );
}

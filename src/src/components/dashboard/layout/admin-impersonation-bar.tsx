'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowCounterClockwise as ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { User } from '@/types/user';
import { paths } from '@/paths';
import { stopAdminImpersonation } from '@/lib/admin-users/api-client';
import {
  ADMIN_IMPERSONATION_CHANGED_EVENT,
  getAdminImpersonationSession,
  restoreAdminImpersonationSession,
  type AdminImpersonationSession,
} from '@/lib/auth/custom/admin-impersonation-store';
import { logger } from '@/lib/default-logger';
import { useUser } from '@/hooks/use-user';
import { toast } from '@/components/core/toaster';

export function AdminImpersonationBar(): React.JSX.Element | null {
  const { checkSession } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [session, setSession] = React.useState<AdminImpersonationSession | null>(() => getAdminImpersonationSession());
  const [isReturning, setIsReturning] = React.useState<boolean>(false);

  React.useEffect(() => {
    const sync = (): void => {
      setSession(getAdminImpersonationSession());
    };

    window.addEventListener(ADMIN_IMPERSONATION_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener(ADMIN_IMPERSONATION_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const handleReturnAsAdmin = React.useCallback(async (): Promise<void> => {
    if (!session || isReturning) {
      return;
    }

    setIsReturning(true);

    try {
      await stopAdminImpersonation();
    } catch (err) {
      logger.error(err);
      toast.error(t('dashboard.impersonation.toasts.stopFailed'));
    } finally {
      restoreAdminImpersonationSession();
      await checkSession?.();
      setIsReturning(false);
      toast.success(t('dashboard.impersonation.toasts.returned'));
      navigate(paths.dashboard.users);
    }
  }, [checkSession, isReturning, navigate, session, t]);

  if (!session) {
    return null;
  }

  const impersonatedName = getUserName(session.impersonatedUser);
  const adminName = getUserName(session.adminSession.user);

  return (
    <Box
      sx={{
        bgcolor: 'warning.light',
        borderBottom: '1px solid',
        borderColor: 'warning.main',
        color: 'warning.contrastText',
        px: { xs: 2, lg: 3 },
        py: 1,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700 }} variant="body2">
            {t('dashboard.impersonation.title', { user: impersonatedName })}
          </Typography>
          <Typography sx={{ color: 'inherit', opacity: 0.85 }} variant="caption">
            {t('dashboard.impersonation.subtitle', { admin: adminName })}
          </Typography>
        </Box>
        <Button
          color="inherit"
          disabled={isReturning}
          onClick={handleReturnAsAdmin}
          size="small"
          startIcon={<ArrowCounterClockwiseIcon />}
          sx={{
            bgcolor: 'common.white',
            color: 'warning.dark',
            '&:hover': { bgcolor: 'warning.50' },
          }}
          variant="contained"
        >
          {isReturning ? t('dashboard.impersonation.actions.returning') : t('dashboard.impersonation.actions.return')}
        </Button>
      </Stack>
    </Box>
  );
}

function getUserName(user: User | null | undefined): string {
  if (user?.name) {
    return user.name;
  }

  const firstName = typeof user?.firstName === 'string' ? user.firstName : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return fullName || user?.email || 'User';
}

'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LockKey as LockKeyIcon } from '@phosphor-icons/react/dist/ssr/LockKey';
import { useTranslation } from 'react-i18next';

import { paths } from '@/paths';
import { RouterLink } from '@/components/core/link';

export interface FreePlanFeatureLockProps {
  actions?: React.ReactNode;
  children: React.ReactNode;
  locked: boolean;
}

export function FreePlanFeatureLock({ actions, children, locked }: FreePlanFeatureLockProps): React.JSX.Element {
  const { t } = useTranslation();
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const content = contentRef.current;

    if (!content) return;

    if (locked) {
      content.setAttribute('inert', '');
      content.setAttribute('aria-hidden', 'true');
    } else {
      content.removeAttribute('inert');
      content.removeAttribute('aria-hidden');
    }
  }, [locked]);

  return (
    <Box sx={{ minHeight: locked ? 320 : undefined, position: 'relative' }}>
      <Box ref={contentRef}>{children}</Box>
      {locked ? (
        <Box
          data-testid="free-plan-feature-lock"
          sx={{
            alignItems: 'flex-start',
            bgcolor: 'rgba(255,255,255,0.78)',
            display: 'flex',
            inset: 0,
            justifyContent: 'center',
            p: { sm: 4, xs: 2 },
            position: 'absolute',
            zIndex: 10,
          }}
        >
          <Paper elevation={8} sx={{ maxWidth: 440, mt: { sm: 6, xs: 2 }, p: 3, textAlign: 'center', width: '100%' }}>
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  alignItems: 'center',
                  bgcolor: 'warning.50',
                  borderRadius: '50%',
                  color: 'warning.main',
                  display: 'flex',
                  height: 48,
                  justifyContent: 'center',
                  width: 48,
                }}
              >
                <LockKeyIcon fontSize="var(--icon-fontSize-lg)" />
              </Box>
              <Stack spacing={0.75}>
                <Typography variant="h6">{t('dashboard.profiles.freePlanLock.title')}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('dashboard.profiles.freePlanLock.description')}
                </Typography>
              </Stack>
              <Button component={RouterLink} href={paths.dashboard.settings.billing} variant="contained">
                {t('dashboard.profiles.freePlanLock.upgrade')}
              </Button>
              {actions ? <Box sx={{ width: '100%' }}>{actions}</Box> : null}
            </Stack>
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
}

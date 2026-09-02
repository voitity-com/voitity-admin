'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import type { ProfileQuality } from '@/lib/profiles/api-client';
import { getProfileQuality } from '@/lib/profiles/api-client';
import { profileQualityRefreshEvent } from '@/lib/profiles/profile-quality-events';
import { usePathname } from '@/hooks/use-pathname';
import { RouterLink } from '@/components/core/link';

export function ProfileQualityDock(): React.JSX.Element | null {
  const pathname = usePathname();
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [quality, setQuality] = React.useState<null | ProfileQuality>(null);
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const qualityHref = profileId ? paths.dashboard.profileDetails.quality(profileId) : '';
  const isQualityPage = pathname === qualityHref;

  const loadQuality = React.useCallback(async (): Promise<void> => {
    if (!profileId || isQualityPage) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      setQuality(await getProfileQuality(profileId));
    } catch (err) {
      logger.error(err);
      setError(t('dashboard.profiles.detail.quality.dock.error'));
    } finally {
      setIsLoading(false);
    }
  }, [isQualityPage, profileId, t]);

  React.useEffect(() => {
    loadQuality().catch((err) => {
      logger.error(err);
    });
  }, [loadQuality, pathname]);

  React.useEffect(() => {
    if (!profileId || isQualityPage) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadQuality().catch((err) => {
        logger.error(err);
      });
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isQualityPage, loadQuality, profileId]);

  React.useEffect(() => {
    const handleRefresh = (event?: Event): void => {
      const eventProfileId = getRefreshEventProfileId(event);

      if (eventProfileId && eventProfileId !== String(profileId)) {
        return;
      }

      loadQuality().catch((err) => {
        logger.error(err);
      });
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    };

    window.addEventListener(profileQualityRefreshEvent, handleRefresh);
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener(profileQualityRefreshEvent, handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadQuality, profileId]);

  if (!profileId || isQualityPage) {
    return null;
  }

  const pendingChecks = quality?.checks.filter((check) => !check.passed) ?? [];
  const score = quality?.score ?? 0;
  const statusColor = getScoreColor(score);

  return (
    <Paper
      elevation={16}
      id="profile-quality-dock"
      sx={{
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 2,
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        display: { xs: 'none', sm: 'block' },
        left: { lg: 'calc(var(--SideNav-width, 0px) + 24px)', sm: 24, xs: 12 },
        overflow: 'hidden',
        position: 'fixed',
        right: { sm: 'auto', xs: 92 },
        width: { sm: 'min(620px, calc(100vw - 160px))' },
        zIndex: (theme) => theme.zIndex.drawer + 2,
      }}
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          p: 1.25,
        }}
      >
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: 'background.level1',
                borderRadius: 1,
                display: 'flex',
                flex: '0 0 auto',
                height: 36,
                justifyContent: 'center',
                width: 36,
              }}
            >
              {isLoading ? (
                <CircularProgress size={18} />
              ) : error ? (
                <WarningCircleIcon
                  color="var(--mui-palette-error-main)"
                  fontSize="var(--icon-fontSize-md)"
                  weight="fill"
                />
              ) : (
                <GaugeIcon
                  color={`var(--mui-palette-${statusColor}-main)`}
                  fontSize="var(--icon-fontSize-md)"
                  weight="fill"
                />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap variant="subtitle2">
                {t('dashboard.profiles.detail.quality.dock.title')}
              </Typography>
              <Typography color={error ? 'error.main' : 'text.secondary'} component="div" noWrap variant="caption">
                {getStatusLabel({ error, isLoading, pendingChecks, t })}
              </Typography>
            </Box>
            {!isLoading && !error ? (
              <Chip
                color={statusColor}
                label={t('dashboard.profiles.detail.quality.scoreLabel', { score })}
                size="small"
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, ml: 'auto' }}
                variant="outlined"
              />
            ) : null}
          </Stack>
          <LinearProgress
            color={error ? 'error' : statusColor}
            sx={{ borderRadius: 999, height: 6 }}
            value={error ? 100 : score}
            variant={isLoading ? 'indeterminate' : 'determinate'}
          />
        </Stack>

        <IconButton
          aria-label={t('dashboard.profiles.detail.quality.dock.viewDetails')}
          component={RouterLink}
          href={qualityHref}
          sx={{
            alignSelf: 'center',
            display: { xs: 'inline-flex', sm: 'none' },
            height: 40,
            justifySelf: 'end',
            width: 40,
          }}
        >
          <ArrowRightIcon />
        </IconButton>
        <Button
          component={RouterLink}
          endIcon={<ArrowRightIcon />}
          href={qualityHref}
          size="small"
          sx={{
            display: { xs: 'none', sm: 'inline-flex' },
            justifySelf: { sm: 'stretch', md: 'end' },
            whiteSpace: 'nowrap',
          }}
          variant="outlined"
        >
          {t('dashboard.profiles.detail.quality.dock.viewDetails')}
        </Button>
      </Box>
    </Paper>
  );
}

function getRefreshEventProfileId(event?: Event): null | string {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail = event.detail as { profileId?: null | string } | null;

  return detail?.profileId ?? null;
}

function getScoreColor(score: number): 'error' | 'success' | 'warning' {
  if (score >= 80) {
    return 'success';
  }

  if (score >= 50) {
    return 'warning';
  }

  return 'error';
}

function getStatusLabel({
  error,
  isLoading,
  pendingChecks,
  t,
}: {
  error: string;
  isLoading: boolean;
  pendingChecks: ProfileQuality['checks'];
  t: (key: string, options?: Record<string, unknown>) => string;
}): string {
  if (isLoading) {
    return t('dashboard.profiles.detail.quality.dock.loading');
  }

  if (error) {
    return error;
  }

  if (pendingChecks.length === 0) {
    return t('dashboard.profiles.detail.quality.completeMessage');
  }

  return t('dashboard.profiles.detail.quality.dock.pending', { count: pendingChecks.length });
}

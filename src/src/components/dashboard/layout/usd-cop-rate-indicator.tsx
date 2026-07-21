'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CurrencyDollar as CurrencyDollarIcon } from '@phosphor-icons/react/dist/ssr/CurrencyDollar';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import { getUsdCopRate } from '@/lib/payments/api-client';
import type { UsdCopRate } from '@/lib/payments/api-client';

const FALLBACK_REFRESH_MS = 5 * 60 * 1000;
const MIN_REFRESH_MS = 60 * 1000;

export function UsdCopRateIndicator(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [rate, setRate] = React.useState<UsdCopRate | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const loadRate = async (): Promise<void> => {
      try {
        const nextRate = await getUsdCopRate();

        if (cancelled) {
          return;
        }

        setRate(nextRate);
        setError(false);

        const ttlSeconds = typeof nextRate.cache_ttl_seconds === 'number' ? nextRate.cache_ttl_seconds : 0;
        const refreshMs = Math.max(ttlSeconds * 1000, MIN_REFRESH_MS);
        timeoutId = window.setTimeout(loadRate, refreshMs);
      } catch (err) {
        logger.error(err);

        if (cancelled) {
          return;
        }

        setError(true);
        timeoutId = window.setTimeout(loadRate, FALLBACK_REFRESH_MS);
      }
    };

    void loadRate();

    return () => {
      cancelled = true;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const value = rate ? formatCopRate(rate.rate, i18n.language) : null;
  const label = value ? t('dashboard.trm.value', { rate: value }) : t('dashboard.trm.loading');
  const title = error && !rate ? t('dashboard.trm.unavailable') : t('dashboard.trm.title');

  return (
    <Tooltip title={title}>
      <Box
        sx={{
          borderRadius: 1,
          color: 'var(--NavItem-color)',
          px: 1.5,
          py: 1.25,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ alignItems: 'center', display: 'flex', flex: '0 0 auto' }}>
            <CurrencyDollarIcon color="var(--NavItem-icon-color)" fontSize="var(--icon-fontSize-md)" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="div"
              sx={{ color: 'var(--NavGroup-title-color)', fontSize: '0.6875rem', fontWeight: 700, lineHeight: 1.2 }}
            >
              {t('dashboard.trm.title')}
            </Typography>
            <Typography
              component="div"
              sx={{
                color: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: 600,
                lineHeight: 1.35,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {error && !rate ? t('dashboard.trm.unavailable') : label}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Tooltip>
  );
}

function formatCopRate(value: number, language: string): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { getSupportedLanguage } from '@/lib/i18n';
import { usePopover } from '@/hooks/use-popover';
import { languageFlags, LanguagePopover } from '@/components/dashboard/layout/language-popover';

export interface SplitLayoutProps {
  children: React.ReactNode;
}

export function SplitLayout({ children }: SplitLayoutProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 800px' }, minHeight: '100vh' }}>
      <Box
        sx={{
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'var(--mui-palette-background-level1)',
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          p: 3,
        }}
      >
        <Stack spacing={3.5} sx={{ maxWidth: '600px', width: '100%' }}>
          <Stack spacing={1.5}>
            <Typography component="h1" variant="h3">
              {t('auth.split.title')}
            </Typography>
            <Typography color="text.secondary" variant="body1">
              {t('auth.split.description')}
            </Typography>
          </Stack>

          <Box
            sx={{
              aspectRatio: '16 / 9',
              bgcolor: 'common.black',
              borderRadius: 2,
              boxShadow: 'var(--mui-shadows-8)',
              overflow: 'hidden',
            }}
          >
            <Box
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              component="iframe"
              loading="lazy"
              src="https://www.youtube-nocookie.com/embed/pBxiwqnSBqo?rel=0"
              sx={{ border: 0, height: '100%', width: '100%' }}
              title={String(t('auth.split.videoTitle'))}
            />
          </Box>
        </Stack>
      </Box>
      <Box sx={{ boxShadow: 'var(--mui-shadows-8)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box sx={{ position: 'absolute', right: 24, top: 24, zIndex: 1 }}>
          <LanguageSwitch />
        </Box>
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Box sx={{ maxWidth: '420px', width: '100%' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}

function LanguageSwitch(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const popover = usePopover<HTMLButtonElement>();
  const language = getSupportedLanguage(i18n.language);
  const flag = languageFlags[language];

  return (
    <React.Fragment>
      <Tooltip title={t('auth.language')}>
        <Button
          aria-label={`${t('auth.language')}: ${language.toUpperCase()}`}
          color="inherit"
          onClick={popover.handleOpen}
          ref={popover.anchorRef}
          size="small"
          sx={{ minWidth: 'auto', px: 1 }}
        >
          <Box sx={{ height: '22px', mr: 0.75, width: '22px' }}>
            <Box alt={language.toUpperCase()} component="img" src={flag} sx={{ height: 'auto', width: '100%' }} />
          </Box>
          <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1 }}>
            {language.toUpperCase()}
          </Box>
        </Button>
      </Tooltip>
      <LanguagePopover anchorEl={popover.anchorRef.current} onClose={popover.handleClose} open={popover.open} />
    </React.Fragment>
  );
}

'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { Database as DatabaseIcon } from '@phosphor-icons/react/dist/ssr/Database';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { useTranslation } from 'react-i18next';

export interface SplitLayoutProps {
  children: React.ReactNode;
}

const highlights = [
  { key: 'avatar', icon: ImageIcon },
  { key: 'voice', icon: MicrophoneIcon },
  { key: 'chat', icon: ChatsCircleIcon },
  { key: 'context', icon: DatabaseIcon },
] satisfies { key: string; icon: Icon }[];

const workflowItems = [
  { key: 'profiles', icon: ShieldCheckIcon },
  { key: 'conversations', icon: ChatsCircleIcon },
  { key: 'media', icon: MicrophoneIcon },
] satisfies { key: string; icon: Icon }[];

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
        <Stack spacing={4} sx={{ maxWidth: '560px' }}>
          <Stack spacing={2}>
            <Box>
              <Chip color="primary" label={t('auth.split.eyebrow')} size="small" variant="soft" />
            </Box>
            <Typography variant="h4">{t('auth.split.title')}</Typography>
            <Typography color="text.secondary" variant="body1">
              {t('auth.split.description')}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            }}
          >
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <Box
                  key={item.key}
                  sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid var(--mui-palette-divider)',
                    borderRadius: 1,
                    p: 2,
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        '--Avatar-size': '38px',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                      }}
                    >
                      <Icon fontSize="var(--icon-fontSize-md)" weight="duotone" />
                    </Avatar>
                    <Typography variant="subtitle2">{t(`auth.split.highlights.${item.key}`)}</Typography>
                  </Stack>
                </Box>
              );
            })}
          </Box>

          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid var(--mui-palette-divider)',
              borderRadius: 1,
              p: 2.5,
            }}
          >
            <Stack spacing={2}>
              {workflowItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Stack direction="row" key={item.key} spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        alignItems: 'center',
                        bgcolor: 'var(--mui-palette-background-level1)',
                        border: '1px solid var(--mui-palette-divider)',
                        borderRadius: 1,
                        color: 'primary.main',
                        display: 'flex',
                        height: 34,
                        justifyContent: 'center',
                        width: 34,
                      }}
                    >
                      <Icon fontSize="var(--icon-fontSize-md)" weight="duotone" />
                    </Box>
                    <Typography variant="body2">{t(`auth.split.workflow.${item.key}`)}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </Box>
      <Box sx={{ boxShadow: 'var(--mui-shadows-8)', display: 'flex', flexDirection: 'column' }}>
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

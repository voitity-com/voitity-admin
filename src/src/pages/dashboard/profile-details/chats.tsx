'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';

const metadata = { title: `Chats | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        <Card>
          <CardHeader
            subheader={t('dashboard.profiles.detail.chats.subheader')}
            title={t('dashboard.profiles.detail.chats.title')}
          />
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.profiles.detail.chats.empty')}
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </React.Fragment>
  );
}

'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';

const metadata = { title: `Avatar | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Card>
        <CardHeader title="Avatar" />
        <CardContent>
          <Typography color="text.secondary" variant="body2">
            Avatar update is not available yet.
          </Typography>
        </CardContent>
      </Card>
    </React.Fragment>
  );
}

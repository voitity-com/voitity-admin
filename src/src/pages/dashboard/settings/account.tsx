import * as React from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { AccountDetails } from '@/components/dashboard/settings/account-details';

const metadata = { title: `Account | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={4}>
        <div>
          <Typography variant="h4">{t('dashboard.settings.account.title')}</Typography>
        </div>
        <Stack spacing={4}>
          <AccountDetails />
        </Stack>
      </Stack>
    </React.Fragment>
  );
}

import * as React from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';
import { EmailNotifications } from '@/components/dashboard/settings/email-notifications';

export function Page(): React.JSX.Element {
  const { t } = useTranslation();
  const title = t('dashboard.settings.notifications.pageTitle');

  return (
    <React.Fragment>
      <Helmet>
        <title>{`${title} | ${config.site.name}`}</title>
      </Helmet>
      <Stack spacing={4}>
        <div>
          <Typography variant="h4">{title}</Typography>
        </div>
        <Stack spacing={4}>
          <EmailNotifications />
        </Stack>
      </Stack>
    </React.Fragment>
  );
}

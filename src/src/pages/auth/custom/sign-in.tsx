import * as React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';
import { SignInForm } from '@/components/auth/custom/sign-in-form';
import { GuestGuard } from '@/components/auth/guest-guard';
import { SplitLayout } from '@/components/auth/split-layout';

export function Page(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <Helmet>
        <title>{`${t('auth.signIn.metaTitle')} | ${config.site.name}`}</title>
      </Helmet>
      <GuestGuard>
        <SplitLayout>
          <SignInForm />
        </SplitLayout>
      </GuestGuard>
    </React.Fragment>
  );
}

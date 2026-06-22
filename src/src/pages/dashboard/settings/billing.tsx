import * as React from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { SubscriptionLimits, SubscriptionPlan, SubscriptionPlans } from '@/lib/subscription/api-client';
import { getSubscriptionLimits, getSubscriptionPlans, SubscriptionApiError } from '@/lib/subscription/api-client';
import { createWompiCheckout, savePendingPaymentOrderId } from '@/lib/payments/api-client';
import { logger } from '@/lib/default-logger';
import { SubscriptionBilling } from '@/components/dashboard/settings/subscription-limits';

const metadata = { title: `Billing | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;

interface BillingState {
  limits: SubscriptionLimits;
  plans: SubscriptionPlans;
}

export function Page(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [billing, setBilling] = React.useState<BillingState | null>(null);
  const [error, setError] = React.useState<string>('');
  const [isCheckoutPending, setIsCheckoutPending] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadBilling = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      let limits: SubscriptionLimits = {};
      let plans: SubscriptionPlans = { plans: [] };

      try {
        plans = await getSubscriptionPlans();
      } catch (plansError) {
        logger.error(plansError);
      }

      try {
        limits = await getSubscriptionLimits();
      } catch (limitsError) {
        if (!isMissingActiveSubscriptionError(limitsError)) {
          throw limitsError;
        }
      }

      setBilling({ limits, plans });
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.settings.billing.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadBilling().catch((err) => {
      logger.error(err);
    });
  }, [loadBilling]);

  const handleStartCheckout = React.useCallback(
    async (plan: SubscriptionPlan): Promise<void> => {
      setError('');
      setIsCheckoutPending(true);

      try {
        const checkout = await createWompiCheckout({ plan: plan.id });
        const checkoutUrl = checkout.checkout.checkout_url ?? checkout.payment_order.checkout_url;

        if (!checkoutUrl) {
          throw new Error(t('dashboard.settings.billing.errors.checkoutUrl'));
        }

        savePendingPaymentOrderId(checkout.payment_order.id);
        window.location.assign(checkoutUrl);
      } catch (err) {
        logger.error(err);
        setError(getErrorMessage(err, t('dashboard.settings.billing.errors.checkout')));
        setIsCheckoutPending(false);
      }
    },
    [t]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={4}>
        <div>
          <Typography variant="h4">{t('dashboard.settings.billing.pageTitle')}</Typography>
        </div>
        {error ? <Alert color="error">{error}</Alert> : null}
        {isLoading ? (
          <Card>
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          </Card>
        ) : billing ? (
          <SubscriptionBilling
            data={billing.limits}
            isCheckoutPending={isCheckoutPending}
            language={language}
            onStartCheckout={handleStartCheckout}
            plansData={billing.plans}
          />
        ) : null}
      </Stack>
    </React.Fragment>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isMissingActiveSubscriptionError(error: unknown): boolean {
  return error instanceof SubscriptionApiError && error.status === 404;
}

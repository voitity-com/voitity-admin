import * as React from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { SubscriptionLimits, SubscriptionPlan, SubscriptionPlans } from '@/lib/subscription/api-client';
import { clearCheckoutIntent, getCheckoutIntentFromSearch, getStoredCheckoutIntent } from '@/lib/billing/checkout-intent';
import {
  cancelSubscriptionRenewal,
  cancelSubscriptionTrial,
  getSubscriptionLimits,
  getSubscriptionPlans,
  reactivateSubscriptionRenewal,
  SubscriptionApiError,
} from '@/lib/subscription/api-client';
import {
  getSubscriptionPaymentSourceSetup,
  initializeWompiSession,
  PaymentApiError,
  startSubscriptionTrial,
  startSubscriptionWithPaymentSource,
  tokenizeWompiCard,
  type WompiPaymentSourceSetup,
} from '@/lib/payments/api-client';
import { getSupportedLanguage } from '@/lib/i18n';
import { logger } from '@/lib/default-logger';
import { SubscriptionBilling, type TrialPaymentMethod } from '@/components/dashboard/settings/subscription-limits';

const metadata = { title: `Billing | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;

interface BillingState {
  limits: SubscriptionLimits;
  plans: SubscriptionPlans;
}

export function Page(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [searchParams] = useSearchParams();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [billing, setBilling] = React.useState<BillingState | null>(null);
  const [error, setError] = React.useState<string>('');
  const [checkoutError, setCheckoutError] = React.useState<string>('');
  const [pendingAction, setPendingAction] = React.useState<'cancel-renewal' | 'cancel-trial' | 'reactivate-renewal' | null>(null);
  const [isCheckoutPending, setIsCheckoutPending] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isTrialPaymentSourceSetupLoading, setIsTrialPaymentSourceSetupLoading] = React.useState<boolean>(false);
  const [hasRequestedTrialPaymentSourceSetup, setHasRequestedTrialPaymentSourceSetup] = React.useState<boolean>(false);
  const [trialPaymentSourceSetup, setTrialPaymentSourceSetup] = React.useState<WompiPaymentSourceSetup | null>(null);
  const checkoutIntent = React.useMemo(
    () => getCheckoutIntentFromSearch(searchParams) ?? getStoredCheckoutIntent(),
    [searchParams]
  );

  React.useEffect(() => {
    const localeParam = searchParams.get('locale');

    if (!localeParam) {
      return;
    }

    const nextLanguage = getSupportedLanguage(localeParam);

    if (getSupportedLanguage(language) !== nextLanguage) {
      i18n.changeLanguage(nextLanguage).catch(() => {
        // Keep the current language if translations cannot be loaded.
      });
    }
  }, [i18n, language, searchParams]);

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

  const loadTrialPaymentSourceSetup = React.useCallback(async (): Promise<void> => {
    setHasRequestedTrialPaymentSourceSetup(true);
    setIsTrialPaymentSourceSetupLoading(true);

    try {
      setTrialPaymentSourceSetup(await getSubscriptionPaymentSourceSetup());
    } catch (err) {
      logger.error(err);
      setTrialPaymentSourceSetup(null);
      setError(getErrorMessage(err, t('dashboard.settings.billing.errors.paymentSourceSetup')));
    } finally {
      setIsTrialPaymentSourceSetupLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    if (!billing || hasActiveSubscriptionData(billing.limits)) {
      setTrialPaymentSourceSetup(null);
      setHasRequestedTrialPaymentSourceSetup(false);
      return;
    }

    if (!trialPaymentSourceSetup && !isTrialPaymentSourceSetupLoading && !hasRequestedTrialPaymentSourceSetup) {
      loadTrialPaymentSourceSetup().catch((err) => {
        logger.error(err);
      });
    }
  }, [
    billing,
    hasRequestedTrialPaymentSourceSetup,
    isTrialPaymentSourceSetupLoading,
    loadTrialPaymentSourceSetup,
    trialPaymentSourceSetup,
  ]);

  const handleStartCheckout = React.useCallback(
    async (plan: SubscriptionPlan, trialPaymentMethod?: TrialPaymentMethod): Promise<void> => {
      setError('');
      setCheckoutError('');
      setIsCheckoutPending(true);

      try {
        if (!trialPaymentSourceSetup) {
          throw new Error(t('dashboard.settings.billing.errors.paymentSourceSetup'));
        }

        if (!trialPaymentMethod) {
          throw new Error(t('dashboard.settings.billing.errors.paymentMethod'));
        }

        const [session, cardToken] = await Promise.all([
          initializeWompiSession(trialPaymentSourceSetup),
          tokenizeWompiCard(trialPaymentSourceSetup, trialPaymentMethod.card),
        ]);
        const paymentSourcePayload = {
          accept_personal_auth: trialPaymentSourceSetup.personal_data_auth.acceptance_token,
          acceptance_token: trialPaymentSourceSetup.acceptance.acceptance_token,
          customer_data: {
            device_id: session.device_id,
            full_name: trialPaymentMethod.card.card_holder,
          },
          metadata: {
            card: {
              brand: cardToken.brand,
              exp_month: cardToken.exp_month,
              exp_year: cardToken.exp_year,
              last_four: cardToken.last_four,
              name: cardToken.name,
            },
            wompi_environment: trialPaymentSourceSetup.environment,
          },
          session_id: session.session_id,
          token: cardToken.id,
          type: 'CARD' as const,
        };

        if (billing?.plans.trial?.available) {
          await startSubscriptionTrial({
            payment_source: paymentSourcePayload,
            plan: plan.id,
            terms_accepted: true,
          });

          toast.success(t('dashboard.settings.billing.toasts.trialStarted'));
        } else {
          const result = await startSubscriptionWithPaymentSource({
            payment_source: paymentSourcePayload,
            plan: plan.id,
            terms_accepted: true,
          });

          if (result.payment_order?.status === 'approved') {
            toast.success(t('dashboard.settings.billing.toasts.subscriptionStarted'));
          } else if (result.payment_order?.status === 'pending') {
            toast(t('dashboard.settings.billing.toasts.paymentPending'));
          } else {
            throw new Error(t('dashboard.settings.billing.errors.paymentDeclined'));
          }
        }

        await loadBilling();
        setCheckoutError('');
        setIsCheckoutPending(false);
      } catch (err) {
        logger.error(err);
        setCheckoutError(getCheckoutErrorMessage(err, t));
        setIsCheckoutPending(false);
      }
    },
    [billing?.plans.trial?.available, loadBilling, t, trialPaymentSourceSetup]
  );

  const handleCheckoutErrorClear = React.useCallback((): void => {
    setCheckoutError('');
  }, []);

  const runSubscriptionAction = React.useCallback(
    async (
      action: 'cancel-renewal' | 'cancel-trial' | 'reactivate-renewal',
      request: () => Promise<unknown>,
      successMessage: string
    ): Promise<void> => {
      setError('');
      setPendingAction(action);

      try {
        await request();
        toast.success(successMessage);
        await loadBilling();
      } catch (err) {
        logger.error(err);
        const message = getErrorMessage(err, t('dashboard.settings.billing.errors.action'));
        setError(message);
        toast.error(message);
      } finally {
        setPendingAction(null);
      }
    },
    [loadBilling, t]
  );

  const handleCancelTrial = React.useCallback(async (): Promise<void> => {
    await runSubscriptionAction(
      'cancel-trial',
      cancelSubscriptionTrial,
      t('dashboard.settings.billing.toasts.trialCancelled')
    );
  }, [runSubscriptionAction, t]);

  const handleCancelRenewal = React.useCallback(async (): Promise<void> => {
    await runSubscriptionAction(
      'cancel-renewal',
      cancelSubscriptionRenewal,
      t('dashboard.settings.billing.toasts.renewalCancelled')
    );
  }, [runSubscriptionAction, t]);

  const handleReactivateRenewal = React.useCallback(async (): Promise<void> => {
    await runSubscriptionAction(
      'reactivate-renewal',
      reactivateSubscriptionRenewal,
      t('dashboard.settings.billing.toasts.renewalReactivated')
    );
  }, [runSubscriptionAction, t]);

  const handleCheckoutIntentHandled = React.useCallback((): void => {
    clearCheckoutIntent();
  }, []);

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
            checkoutError={checkoutError}
            checkoutIntent={checkoutIntent}
            data={billing.limits}
            isCheckoutPending={isCheckoutPending}
            isTrialPaymentSourceSetupLoading={isTrialPaymentSourceSetupLoading}
            language={language}
            onCancelRenewal={handleCancelRenewal}
            onCancelTrial={handleCancelTrial}
            onCheckoutErrorClear={handleCheckoutErrorClear}
            onCheckoutIntentHandled={handleCheckoutIntentHandled}
            onReactivateRenewal={handleReactivateRenewal}
            onStartCheckout={handleStartCheckout}
            pendingAction={pendingAction}
            plansData={billing.plans}
            trialPaymentSourceSetup={trialPaymentSourceSetup}
          />
        ) : null}
      </Stack>
    </React.Fragment>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getCheckoutErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof PaymentApiError && error.message === 'Payment request failed') {
    return t('dashboard.settings.billing.errors.cardValidation');
  }

  return getErrorMessage(error, t('dashboard.settings.billing.errors.checkout'));
}

function isMissingActiveSubscriptionError(error: unknown): boolean {
  return error instanceof SubscriptionApiError && error.status === 404;
}

function hasActiveSubscriptionData(data: SubscriptionLimits): boolean {
  const subscription = isRecord(data.subscription) ? data.subscription : undefined;

  if (!subscription) {
    return false;
  }

  if (subscription.active === false) {
    return false;
  }

  return Boolean(subscription.id || subscription.plan || subscription.plan_id || subscription.planId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

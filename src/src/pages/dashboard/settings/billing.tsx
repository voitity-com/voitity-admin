import * as React from 'react';
import Alert from '@mui/material/Alert';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import {
  clearCheckoutIntent,
  getCheckoutIntentFromSearch,
  getStoredCheckoutIntent,
} from '@/lib/billing/checkout-intent';
import { logger } from '@/lib/default-logger';
import { getSupportedLanguage } from '@/lib/i18n';
import {
  addPaymentMethod,
  getPaymentMethodSetup,
  getPaymentOrder,
  getSubscriptionPaymentSourceSetup,
  initializeWompiSession,
  listPaymentMethods,
  PaymentApiError,
  startSubscriptionTrial,
  startSubscriptionWithPaymentSource,
  tokenizeWompiCard,
  type PaymentMethod,
  type PaymentMethodPayload,
  type WompiPaymentSourceSetup,
} from '@/lib/payments/api-client';
import type {
  CreditCatalog,
  CreditPurchaseResult,
  CreditPurchases,
  CreditWallet,
  SubscriptionBillingState,
  SubscriptionLimits,
  SubscriptionPlan,
  SubscriptionPlans,
} from '@/lib/subscription/api-client';
import {
  cancelSubscriptionRenewal,
  cancelSubscriptionTrial,
  getCreditCatalog,
  getCreditPurchases,
  getCreditWallet,
  getSubscriptionBillingState,
  getSubscriptionLimits,
  getSubscriptionPlans,
  purchaseCredits,
  reactivateSubscriptionRenewal,
  retrySubscriptionRenewal,
  SubscriptionApiError,
} from '@/lib/subscription/api-client';
import { CreditWalletCard } from '@/components/dashboard/settings/credit-wallet-card';
import { PaymentMethodFormDialog } from '@/components/dashboard/settings/payment-method-form-dialog';
import { SubscriptionBilling, type TrialPaymentMethod } from '@/components/dashboard/settings/subscription-limits';

const metadata = { title: `Billing | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;

interface BillingState {
  creditCatalog: CreditCatalog;
  creditPurchases: CreditPurchases;
  creditWallet: CreditWallet;
  billingState: SubscriptionBillingState;
  limits: SubscriptionLimits;
  paymentMethods: PaymentMethod[];
  plans: SubscriptionPlans;
}

type PaymentMethodDialogOrigin = 'billing' | 'credits';

export function Page(): React.JSX.Element {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const translationRef = React.useRef(t);
  const [searchParams, setSearchParams] = useSearchParams();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [billing, setBilling] = React.useState<BillingState | null>(null);
  const [error, setError] = React.useState<string>('');
  const [checkoutError, setCheckoutError] = React.useState<string>('');
  const [pendingAction, setPendingAction] = React.useState<
    'cancel-renewal' | 'cancel-trial' | 'reactivate-renewal' | 'retry-renewal' | null
  >(null);
  const [isCheckoutPending, setIsCheckoutPending] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isPurchasingCredits, setIsPurchasingCredits] = React.useState<boolean>(false);
  const [pendingCreditPurchaseId, setPendingCreditPurchaseId] = React.useState<number | string | null>(null);
  const [isTrialPaymentSourceSetupLoading, setIsTrialPaymentSourceSetupLoading] = React.useState<boolean>(false);
  const [hasRequestedTrialPaymentSourceSetup, setHasRequestedTrialPaymentSourceSetup] = React.useState<boolean>(false);
  const [trialPaymentSourceSetup, setTrialPaymentSourceSetup] = React.useState<WompiPaymentSourceSetup | null>(null);
  const [isPaymentMethodOpen, setIsPaymentMethodOpen] = React.useState(false);
  const [isPaymentMethodSetupLoading, setIsPaymentMethodSetupLoading] = React.useState(false);
  const [paymentMethodSetup, setPaymentMethodSetup] = React.useState<WompiPaymentSourceSetup | null>(null);
  const [paymentMethodSetupError, setPaymentMethodSetupError] = React.useState('');
  const [paymentMethodDialogOrigin, setPaymentMethodDialogOrigin] = React.useState<PaymentMethodDialogOrigin | null>(
    null
  );
  const [creditPurchaseDialogResume, setCreditPurchaseDialogResume] = React.useState<{
    key: number;
    paymentMethodId?: number | string;
  }>({ key: 0 });
  const purchasedCreditsRef = React.useRef<HTMLDivElement>(null);
  const checkoutIntent = React.useMemo(
    () => getCheckoutIntentFromSearch(searchParams) ?? getStoredCheckoutIntent(),
    [searchParams]
  );

  React.useEffect(() => {
    if (!billing || !checkoutIntent || !hasActiveSubscriptionData(billing.limits)) return;

    clearCheckoutIntent();
    const nextSearchParams = new URLSearchParams(searchParams);
    ['intent', 'plan', 'cycle', 'locale', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(
      (key) => nextSearchParams.delete(key)
    );
    setSearchParams(nextSearchParams, { replace: true });
  }, [billing, checkoutIntent, searchParams, setSearchParams]);

  React.useEffect(() => {
    translationRef.current = t;
  }, [t]);

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

  const loadBilling = React.useCallback(async (showLoading = true): Promise<void> => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError('');

    try {
      let limits: SubscriptionLimits = {};
      let plans: SubscriptionPlans = { plans: [] };
      const [billingState, creditCatalog, creditWallet, creditPurchases, paymentMethods] = await Promise.all([
        getSubscriptionBillingState(),
        getCreditCatalog(),
        getCreditWallet(),
        getCreditPurchases(),
        listPaymentMethods(),
      ]);

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

      setBilling({ billingState, creditCatalog, creditPurchases, creditWallet, limits, paymentMethods, plans });
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, translationRef.current('dashboard.settings.billing.errors.generic')));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    loadBilling().catch((err) => {
      logger.error(err);
    });
  }, [loadBilling]);

  React.useEffect(() => {
    if (pendingCreditPurchaseId === null) {
      return;
    }

    let active = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (): Promise<void> => {
      attempt += 1;

      try {
        const order = await getPaymentOrder(pendingCreditPurchaseId);

        if (!active) {
          return;
        }

        if (order.status === 'approved') {
          toast.success(translationRef.current('dashboard.settings.billing.creditsStore.toasts.approved'));
          setPendingCreditPurchaseId(null);
          void loadBilling(false);

          return;
        }

        if (order.status && order.status !== 'pending') {
          const message =
            order.status === 'declined'
              ? translationRef.current('dashboard.settings.billing.creditsStore.errors.paymentDeclined')
              : translationRef.current('dashboard.settings.billing.creditsStore.errors.purchase');
          toast.error(message);
          setPendingCreditPurchaseId(null);
          void loadBilling(false);

          return;
        }
      } catch (pollError) {
        logger.error(pollError);
      }

      if (active) {
        timer = setTimeout(
          () => {
            void poll();
          },
          attempt <= 30 ? 2000 : 10000
        );
      }
    };

    timer = setTimeout(() => {
      void poll();
    }, 1500);

    return () => {
      active = false;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [loadBilling, pendingCreditPurchaseId]);

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
        if (!trialPaymentMethod) {
          throw new Error(t('dashboard.settings.billing.errors.paymentMethod'));
        }

        let paymentSourcePayload;

        if (!trialPaymentMethod.paymentSourceId) {
          if (!trialPaymentSourceSetup || !trialPaymentMethod.card) {
            throw new Error(t('dashboard.settings.billing.errors.paymentSourceSetup'));
          }

          const [session, cardToken] = await Promise.all([
            initializeWompiSession(trialPaymentSourceSetup),
            tokenizeWompiCard(trialPaymentSourceSetup, trialPaymentMethod.card),
          ]);
          paymentSourcePayload = {
            accept_personal_auth: trialPaymentSourceSetup.personal_data_auth.acceptance_token,
            acceptance_token: trialPaymentSourceSetup.acceptance.acceptance_token,
            customer_data: {
              device_id: session.device_id,
              full_name: trialPaymentMethod.card.card_holder,
            },
            metadata: {
              card: {
                brand: cardToken.brand,
                exp_month: Number(cardToken.exp_month ?? trialPaymentMethod.card.exp_month),
                exp_year: normalizeCardYear(cardToken.exp_year ?? trialPaymentMethod.card.exp_year),
                last_four: cardToken.last_four,
              },
              wompi_environment: trialPaymentSourceSetup.environment,
            },
            session_id: session.session_id,
            token: cardToken.id,
            type: 'CARD' as const,
          };
        }

        const paymentMethodSelection = trialPaymentMethod.paymentSourceId
          ? { payment_source_id: trialPaymentMethod.paymentSourceId }
          : { payment_source: paymentSourcePayload };

        if (billing?.plans.trial?.available) {
          await startSubscriptionTrial({
            ...paymentMethodSelection,
            ...(checkoutIntent?.attribution ? { attribution: checkoutIntent.attribution } : {}),
            plan: plan.id,
            terms_accepted: true,
          });

          toast.success(t('dashboard.settings.billing.toasts.trialStarted'));
          clearCheckoutIntent();
          navigate(`${paths.dashboard.profiles}?create=1`, { replace: true });
          return;
        } else {
          const result = await startSubscriptionWithPaymentSource({
            ...paymentMethodSelection,
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
        await loadBilling();
        setCheckoutError(getCheckoutErrorMessage(err, t));
        setIsCheckoutPending(false);
      }
    },
    [billing?.plans.trial?.available, checkoutIntent?.attribution, loadBilling, navigate, t, trialPaymentSourceSetup]
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

  const openPaymentMethodDialog = React.useCallback(
    async (origin: PaymentMethodDialogOrigin): Promise<void> => {
      setPaymentMethodDialogOrigin(origin);
      setIsPaymentMethodOpen(true);
      setIsPaymentMethodSetupLoading(true);
      setPaymentMethodSetupError('');

      try {
        setPaymentMethodSetup(await getPaymentMethodSetup());
      } catch (setupFailure) {
        logger.error(setupFailure);
        setPaymentMethodSetup(null);
        setPaymentMethodSetupError(getErrorMessage(setupFailure, t('dashboard.settings.paymentMethods.errors.setup')));
      } finally {
        setIsPaymentMethodSetupLoading(false);
      }
    },
    [t]
  );

  const handleAddPaymentMethod = React.useCallback(
    async (payload: PaymentMethodPayload): Promise<void> => {
      const origin = paymentMethodDialogOrigin;
      const method = await addPaymentMethod({ ...payload, make_default: true });
      setIsPaymentMethodOpen(false);
      toast.success(t('dashboard.settings.paymentMethods.toasts.added'));
      await loadBilling(false);

      if (origin === 'credits') {
        setCreditPurchaseDialogResume((current) => ({
          key: current.key + 1,
          paymentMethodId: method.id,
        }));
      }

      setPaymentMethodDialogOrigin(null);
    },
    [loadBilling, paymentMethodDialogOrigin, t]
  );

  const handlePaymentMethodDialogClose = React.useCallback((): void => {
    setIsPaymentMethodOpen(false);

    if (paymentMethodDialogOrigin === 'credits') {
      setCreditPurchaseDialogResume((current) => ({ key: current.key + 1 }));
    }

    setPaymentMethodDialogOrigin(null);
  }, [paymentMethodDialogOrigin]);

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

  const handleRetryRenewal = React.useCallback(async (): Promise<void> => {
    setError('');
    setPendingAction('retry-renewal');

    try {
      const result = await retrySubscriptionRenewal();

      if (result.outcome === 'approved') {
        toast.success(t('dashboard.settings.billing.toasts.renewalPaid'));
      } else {
        toast(t('dashboard.settings.billing.toasts.renewalPending'));
      }

      await loadBilling();
    } catch (retryError) {
      logger.error(retryError);
      const message =
        retryError instanceof SubscriptionApiError && retryError.code === 'PAYMENT_METHOD_REQUIRED'
          ? t('dashboard.settings.billing.paymentRecovery.paymentMethodRequired')
          : getErrorMessage(retryError, t('dashboard.settings.billing.paymentRecovery.retryFailed'));
      setError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }, [loadBilling, t]);

  const handleCheckoutIntentHandled = React.useCallback((): void => {
    clearCheckoutIntent();
  }, []);

  const handlePurchaseCredits = React.useCallback(
    async (credits: number, paymentMethodId: number | string): Promise<CreditPurchaseResult> => {
      setError('');
      setIsPurchasingCredits(true);

      try {
        const idempotencyKey =
          typeof globalThis.crypto?.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `credits-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const result = await purchaseCredits({
          credits,
          idempotency_key: idempotencyKey,
          payment_source_id: paymentMethodId,
          terms_accepted: true,
        });

        setBilling((current) => mergeCreditPurchaseResult(current, result));

        if (result.payment_order.status === 'approved') {
          toast.success(t('dashboard.settings.billing.creditsStore.toasts.approved'));
          void loadBilling(false);
        } else {
          toast(t('dashboard.settings.billing.creditsStore.toasts.pending'));
          setPendingCreditPurchaseId(result.payment_order.id);
        }

        return result;
      } catch (err) {
        logger.error(err);
        void loadBilling(false);
        const message =
          err instanceof SubscriptionApiError && err.code === 'PAYMENT_METHOD_REQUIRED'
            ? t('dashboard.settings.billing.creditsStore.dialog.paymentMethodRequired')
            : err instanceof SubscriptionApiError && err.code === 'CREDIT_PAYMENT_DECLINED'
              ? t('dashboard.settings.billing.creditsStore.errors.paymentDeclined')
              : err instanceof SubscriptionApiError && err.code === 'CREDIT_PAYMENT_FAILED'
                ? t('dashboard.settings.billing.creditsStore.errors.purchase')
                : getErrorMessage(err, t('dashboard.settings.billing.creditsStore.errors.purchase'));

        toast.error(message);
        throw err;
      } finally {
        setIsPurchasingCredits(false);
      }
    },
    [loadBilling, t]
  );

  const handlePurchasedCreditsClick = React.useCallback((): void => {
    const section = purchasedCreditsRef.current;

    if (!section) {
      return;
    }

    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
  }, []);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={4}>
        <Stack
          alignItems={{ sm: 'flex-start', xs: 'stretch' }}
          direction={{ sm: 'row', xs: 'column' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="h4">{t('dashboard.settings.billing.pageTitle')}</Typography>
          {billing ? (
            <ButtonBase
              aria-label={`${t('dashboard.settings.billing.creditsStore.title')}. ${t(
                'dashboard.settings.billing.creditsStore.available'
              )}: ${formatCreditBalance(billing.creditWallet.available, language)}`}
              data-testid="purchased-credits-summary"
              onClick={handlePurchasedCreditsClick}
              sx={{
                alignSelf: { sm: 'auto', xs: 'flex-end' },
                borderRadius: 1,
                px: 1.5,
                py: 1,
                textAlign: 'left',
                '&:hover': { bgcolor: 'action.hover' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              }}
            >
              <Stack alignItems="center" direction="row" spacing={1.25}>
                <CoinsIcon fontSize="var(--Icon-fontSize)" />
                <Stack>
                  <Typography component="span" variant="subtitle2">
                    {t('dashboard.settings.billing.creditsStore.title')}
                  </Typography>
                  <Typography color="text.secondary" component="span" variant="body2">
                    {t('dashboard.settings.billing.creditsStore.available')}:{' '}
                    <Typography color="text.primary" component="span" fontWeight={600} variant="inherit">
                      {formatCreditBalance(billing.creditWallet.available, language)}
                    </Typography>
                  </Typography>
                </Stack>
              </Stack>
            </ButtonBase>
          ) : null}
        </Stack>
        {error ? <Alert color="error">{error}</Alert> : null}
        {isLoading ? (
          <Card>
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          </Card>
        ) : billing ? (
          <Stack spacing={3}>
            <SubscriptionBilling
              billingState={billing.billingState}
              checkoutError={checkoutError}
              checkoutIntent={checkoutIntent}
              data={billing.limits}
              isCheckoutPending={isCheckoutPending}
              isTrialPaymentSourceSetupLoading={isTrialPaymentSourceSetupLoading}
              language={language}
              onAddPaymentMethod={() => {
                void openPaymentMethodDialog('billing');
              }}
              onCancelRenewal={handleCancelRenewal}
              onCancelTrial={handleCancelTrial}
              onCheckoutErrorClear={handleCheckoutErrorClear}
              onCheckoutIntentHandled={handleCheckoutIntentHandled}
              onReactivateRenewal={handleReactivateRenewal}
              onRetryRenewal={handleRetryRenewal}
              onStartCheckout={handleStartCheckout}
              paymentMethods={billing.paymentMethods}
              pendingAction={pendingAction}
              plansData={billing.plans}
              trialPaymentSourceSetup={trialPaymentSourceSetup}
            />
            <div
              data-testid="purchased-credits-section"
              ref={purchasedCreditsRef}
              style={{ outline: 'none', scrollMarginTop: 88 }}
              tabIndex={-1}
            >
              <CreditWalletCard
                catalog={billing.creditCatalog}
                isActivePaidSubscription={hasActivePaidSubscriptionData(billing.limits)}
                isPurchasing={isPurchasingCredits}
                language={language}
                onAddPaymentMethod={() => {
                  void openPaymentMethodDialog('credits');
                }}
                onPurchase={handlePurchaseCredits}
                paymentMethods={billing.paymentMethods}
                purchaseDialogResume={creditPurchaseDialogResume}
                purchases={billing.creditPurchases}
                wallet={billing.creditWallet}
              />
            </div>
          </Stack>
        ) : null}
      </Stack>
      <PaymentMethodFormDialog
        loading={isPaymentMethodSetupLoading}
        onClose={handlePaymentMethodDialogClose}
        onSubmit={handleAddPaymentMethod}
        open={isPaymentMethodOpen}
        setup={paymentMethodSetup}
        setupError={paymentMethodSetupError}
      />
    </React.Fragment>
  );
}

function normalizeCardYear(value: string): number {
  const year = Number(value);

  return year < 100 ? 2000 + year : year;
}

function formatCreditBalance(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(value);
}

function mergeCreditPurchaseResult(current: BillingState | null, result: CreditPurchaseResult): BillingState | null {
  if (!current) {
    return current;
  }

  const existingItems = current.creditPurchases.items.filter(
    (item) => String(item.id) !== String(result.payment_order.id)
  );

  return {
    ...current,
    creditPurchases: {
      ...current.creditPurchases,
      items: [result.payment_order, ...existingItems],
    },
    creditWallet: result.wallet,
  };
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

function hasActivePaidSubscriptionData(data: SubscriptionLimits): boolean {
  if (!hasActiveSubscriptionData(data)) {
    return false;
  }

  const subscription = isRecord(data.subscription) ? data.subscription : undefined;

  return (
    subscription?.status !== 'trialing' && subscription?.billing_mode === 'recurring' && subscription?.plan !== 'admin'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

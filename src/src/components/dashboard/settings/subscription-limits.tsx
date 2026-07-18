'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { ImageSquare as ImageSquareIcon } from '@phosphor-icons/react/dist/ssr/ImageSquare';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { SpeakerHigh as SpeakerHighIcon } from '@phosphor-icons/react/dist/ssr/SpeakerHigh';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { VideoCamera as VideoCameraIcon } from '@phosphor-icons/react/dist/ssr/VideoCamera';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { RadialBar, RadialBarChart } from 'recharts';

import { paths } from '@/paths';
import { NoSsr } from '@/components/core/no-ssr';
import { RouterLink } from '@/components/core/link';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { CheckoutIntent } from '@/lib/billing/checkout-intent';
import type { WompiCardDetails, WompiPaymentSourceSetup } from '@/lib/payments/api-client';
import type {
  JsonObject,
  JsonValue,
  SubscriptionLimits as SubscriptionLimitsData,
  SubscriptionPlan,
  SubscriptionPlans,
  SubscriptionTrial,
} from '@/lib/subscription/api-client';

export interface SubscriptionLimitsProps {
  data: SubscriptionLimitsData;
  language: string;
  plansData?: SubscriptionPlans;
}

export interface SubscriptionBillingProps extends SubscriptionLimitsProps {
  checkoutError?: string;
  checkoutIntent?: CheckoutIntent | null;
  isCheckoutPending?: boolean;
  isTrialPaymentSourceSetupLoading?: boolean;
  onCancelRenewal?: () => Promise<void>;
  onCancelTrial?: () => Promise<void>;
  onCheckoutErrorClear?: () => void;
  onCheckoutIntentHandled?: () => void;
  onReactivateRenewal?: () => Promise<void>;
  onStartCheckout?: (plan: SubscriptionPlan, trialPaymentMethod?: TrialPaymentMethod) => Promise<void>;
  pendingAction?: 'cancel-renewal' | 'cancel-trial' | 'reactivate-renewal' | null;
  trialPaymentSourceSetup?: WompiPaymentSourceSetup | null;
}

export interface TrialPaymentMethod {
  card: WompiCardDetails;
}

type BillingInterval = 'annual' | 'monthly';

const expirationMonths = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

interface CurrentSubscription {
  active?: boolean;
  billingMode?: string;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string;
  currency: string;
  interval: BillingInterval;
  lastBilledAt?: string;
  nextBillingAt?: string;
  planId?: string;
  planName: string;
  priceUsd?: number;
  renewsAt?: string;
  startedAt?: string;
  status?: string;
  trialCancelledAt?: string;
  trialConvertedAt?: string;
  trialDaysRemaining?: number;
  trialEndsAt?: string;
  trialStartedAt?: string;
}

interface BillingCycleOption {
  currency: string;
  description: string;
  disabled: boolean;
  features: string[];
  interval: BillingInterval;
  label: string;
  plan?: SubscriptionPlan;
  planId?: string;
  priceUsd?: number;
  processingAmount?: number;
  processingCurrency?: string;
  recommended: boolean;
  selected: boolean;
  trial?: SubscriptionTrial;
}

interface UsageMetric {
  color: string;
  icon: Icon;
  key: string;
  label: string;
  limit?: number;
  progress: number;
  remaining?: number;
  unlimited: boolean;
  used?: number;
}

const usedFields = ['used', 'current', 'count', 'usage', 'consumed'] as const;
const limitFields = ['limit', 'max', 'maximum', 'total', 'allowed', 'included'] as const;
const remainingFields = ['remaining', 'available', 'left'] as const;
const annualIntervals = new Set(['annual', 'annually', 'year', 'yearly']);

export function SubscriptionLimits({ data, language, plansData }: SubscriptionLimitsProps): React.JSX.Element {
  return (
    <Stack spacing={3}>
      <SubscriptionBilling data={data} language={language} plansData={plansData} />
      <SubscriptionUsage data={data} language={language} />
    </Stack>
  );
}

export function SubscriptionBilling({
  checkoutError = '',
  checkoutIntent,
  data,
  isCheckoutPending = false,
  isTrialPaymentSourceSetupLoading = false,
  language,
  onCancelRenewal,
  onCancelTrial,
  onCheckoutErrorClear,
  onCheckoutIntentHandled,
  onReactivateRenewal,
  onStartCheckout,
  pendingAction = null,
  plansData,
  trialPaymentSourceSetup = null,
}: SubscriptionBillingProps): React.JSX.Element {
  const { t } = useTranslation();
  const hasActiveSubscription = hasActiveSubscriptionData(data);
  const [acceptedTerms, setAcceptedTerms] = React.useState<boolean>(false);
  const [checkoutPlanId, setCheckoutPlanId] = React.useState<string | undefined>();
  const handledCheckoutIntentRef = React.useRef<string | null>(null);
  const subscription = getCurrentSubscription(data, plansData, t);

  React.useEffect(() => {
    if (hasActiveSubscription) {
      setAcceptedTerms(false);
      setCheckoutPlanId(undefined);
    }
  }, [hasActiveSubscription]);

  const cycles = getBillingCycles({ hasActiveSubscription, language, plansData, selectedPlanId: checkoutPlanId, subscription, t });
  const checkoutCycle = cycles.find((cycle) => cycle.planId === checkoutPlanId && !cycle.disabled);
  const selectedPlan = checkoutCycle?.plan;
  const canStartCheckout = Boolean(!hasActiveSubscription && acceptedTerms && selectedPlan && onStartCheckout && !isCheckoutPending);

  React.useEffect(() => {
    if (hasActiveSubscription || !checkoutIntent) {
      return;
    }

    const intentKey = getCheckoutIntentKey(checkoutIntent);

    if (handledCheckoutIntentRef.current === intentKey) {
      return;
    }

    const intendedPlanId = getCheckoutIntentPlanId(cycles, checkoutIntent);

    if (!intendedPlanId) {
      return;
    }

    handledCheckoutIntentRef.current = intentKey;

    if (checkoutPlanId !== intendedPlanId) {
      setAcceptedTerms(false);
      setCheckoutPlanId(intendedPlanId);
    }

    onCheckoutIntentHandled?.();
  }, [checkoutIntent, checkoutPlanId, cycles, hasActiveSubscription, onCheckoutIntentHandled]);

  const handleOpenCheckout = React.useCallback((planId: string): void => {
    onCheckoutErrorClear?.();
    setAcceptedTerms(false);
    setCheckoutPlanId(planId);
  }, [onCheckoutErrorClear]);

  const handleCloseCheckout = React.useCallback((): void => {
    if (isCheckoutPending) {
      return;
    }

    onCheckoutErrorClear?.();
    setAcceptedTerms(false);
    setCheckoutPlanId(undefined);
  }, [isCheckoutPending, onCheckoutErrorClear]);

  const handleStartCheckout = React.useCallback(async (trialPaymentMethod?: TrialPaymentMethod): Promise<void> => {
    if (!selectedPlan || !onStartCheckout) {
      return;
    }

    await onStartCheckout(selectedPlan, trialPaymentMethod);
  }, [onStartCheckout, selectedPlan]);

  if (!Object.keys(data).length && !plansData?.plans.length) {
    return (
      <Card>
        <CardHeader
          avatar={
            <Avatar>
              <CreditCardIcon fontSize="var(--Icon-fontSize)" />
            </Avatar>
          }
          subheader={t('dashboard.settings.billing.subheader')}
          title={t('dashboard.settings.billing.title')}
        />
        <CardContent>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.settings.billing.empty')}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid lg={5} xs={12}>
        {hasActiveSubscription ? (
          <CurrentPlanCard
            language={language}
            onCancelRenewal={onCancelRenewal}
            onCancelTrial={onCancelTrial}
            onReactivateRenewal={onReactivateRenewal}
            pendingAction={pendingAction}
            subscription={subscription}
            t={t}
          />
        ) : (
          <NoActiveSubscriptionCard t={t} trial={plansData?.trial} />
        )}
      </Grid>
      <Grid lg={7} xs={12}>
        <BillingCyclesCard
          cycles={cycles}
          hasActiveSubscription={hasActiveSubscription}
          language={language}
          onSelectPlan={handleOpenCheckout}
          planName={subscription.planName}
          t={t}
        />
      </Grid>
      {!hasActiveSubscription ? (
        <CheckoutAgreementDialog
          acceptedTerms={acceptedTerms}
          canStartCheckout={canStartCheckout}
          checkoutError={checkoutError}
          cycle={checkoutCycle}
          isCheckoutPending={isCheckoutPending}
          isTrialPaymentSourceSetupLoading={isTrialPaymentSourceSetupLoading}
          language={language}
          onAcceptedTermsChange={setAcceptedTerms}
          onCheckoutErrorClear={onCheckoutErrorClear}
          onClose={handleCloseCheckout}
          onStartCheckout={handleStartCheckout}
          open={Boolean(checkoutCycle)}
          t={t}
          trialPaymentSourceSetup={trialPaymentSourceSetup}
        />
      ) : null}
    </Grid>
  );
}

export function SubscriptionUsage({ data, language }: SubscriptionLimitsProps): React.JSX.Element {
  const { t } = useTranslation();

  if (!hasActiveSubscriptionData(data)) {
    return <SubscriptionRequiredCard t={t} />;
  }

  const metrics = getUsageMetrics(data, t);

  return <UsageOverview language={language} metrics={metrics} t={t} />;
}

function NoActiveSubscriptionCard({ t, trial }: { t: TFunction; trial?: SubscriptionTrial }): React.JSX.Element {
  const hasTrial = trial?.available === true;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Avatar
            sx={{
              '--Avatar-size': '48px',
              bgcolor: 'background.level1',
              color: 'text.primary',
            }}
          >
            <CreditCardIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
          <Box>
            <Typography color="text.secondary" variant="overline">
              {t('dashboard.settings.billing.noActive.eyebrow')}
            </Typography>
            <Typography sx={{ mt: 0.5 }} variant="h5">
              {t('dashboard.settings.billing.noActive.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
              {hasTrial
                ? t('dashboard.settings.billing.noActive.trialSubheader', { days: trial.days })
                : t('dashboard.settings.billing.noActive.subheader')}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SubscriptionRequiredCard({ t }: { t: TFunction }): React.JSX.Element {
  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar>
            <GaugeIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.usage.empty.subheader')}
        title={t('dashboard.settings.usage.empty.title')}
      />
      <CardContent>
        <Button component={RouterLink} href={paths.dashboard.settings.billing} startIcon={<CreditCardIcon />} variant="contained">
          {t('dashboard.settings.usage.empty.action')}
        </Button>
      </CardContent>
    </Card>
  );
}

function CurrentPlanCard({
  language,
  onCancelRenewal,
  onCancelTrial,
  onReactivateRenewal,
  pendingAction,
  subscription,
  t,
}: {
  language: string;
  onCancelRenewal?: () => Promise<void>;
  onCancelTrial?: () => Promise<void>;
  onReactivateRenewal?: () => Promise<void>;
  pendingAction?: 'cancel-renewal' | 'cancel-trial' | 'reactivate-renewal' | null;
  subscription: CurrentSubscription;
  t: TFunction;
}): React.JSX.Element {
  const status = subscription.status ?? (subscription.active === false ? 'inactive' : 'active');
  const isTrialing = status.toLowerCase() === 'trialing';
  const isRecurring = subscription.billingMode === 'recurring';
  const hasCancelledRenewal = subscription.cancelAtPeriodEnd === true;
  const action = getCurrentPlanAction({ isRecurring, isTrialing, onCancelRenewal, onCancelTrial, onReactivateRenewal, subscription, t });
  const actionPending = Boolean(action && pendingAction === action.pendingKey);
  const rows = [
    { name: t('dashboard.settings.billing.fields.billingCycle'), value: getIntervalLabel(subscription.interval, t) },
    ...(isTrialing
      ? [
          {
            name: t('dashboard.settings.billing.fields.trialEndsAt'),
            value: subscription.trialEndsAt
              ? formatDate(subscription.trialEndsAt, language)
              : t('dashboard.settings.billing.values.empty'),
          },
          {
            name: t('dashboard.settings.billing.fields.firstChargeAt'),
            value: subscription.nextBillingAt
              ? formatDate(subscription.nextBillingAt, language)
              : t('dashboard.settings.billing.values.empty'),
          },
        ]
      : [
          {
            name: t('dashboard.settings.billing.fields.renewsAt'),
            value: subscription.renewsAt ? formatDate(subscription.renewsAt, language) : t('dashboard.settings.billing.values.empty'),
          },
          {
            name: t('dashboard.settings.billing.fields.lastBilledAt'),
            value: subscription.lastBilledAt
              ? formatDate(subscription.lastBilledAt, language)
              : t('dashboard.settings.billing.values.empty'),
          },
        ]),
    {
      name: t('dashboard.settings.billing.fields.startedAt'),
      value: subscription.startedAt ? formatDate(subscription.startedAt, language) : t('dashboard.settings.billing.values.empty'),
    },
  ];

  return (
    <Card
      sx={{
        bgcolor: 'var(--mui-palette-neutral-950)',
        color: 'var(--mui-palette-common-white)',
        height: '100%',
      }}
    >
      <CardContent>
        <Stack spacing={4}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Avatar
                sx={{
                  '--Avatar-size': '48px',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: 'var(--mui-palette-common-white)',
                }}
              >
                <CrownIcon fontSize="var(--Icon-fontSize)" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography color="rgba(255,255,255,0.72)" variant="overline">
                  {t('dashboard.settings.billing.currentPlan.eyebrow')}
                </Typography>
                <Typography noWrap variant="h5">
                  {subscription.planName}
                </Typography>
              </Box>
            </Stack>
            <Chip
              color={getStatusColor(status)}
              label={getStatusLabel(status, t)}
              size="small"
              variant="soft"
            />
            {hasCancelledRenewal ? (
              <Chip color="warning" label={t('dashboard.settings.billing.status.renewalCancelled')} size="small" variant="soft" />
            ) : null}
          </Stack>

          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Typography sx={{ lineHeight: 1 }} variant="h2">
                {formatCurrency(subscription.priceUsd, subscription.currency, language)}
              </Typography>
              <Typography color="rgba(255,255,255,0.68)" variant="subtitle2">
                {getPeriodLabel(subscription.interval, t)}
              </Typography>
            </Stack>
            <Typography color="rgba(255,255,255,0.68)" sx={{ mt: 1 }} variant="body2">
              {getCurrentPlanSubheader(subscription, language, t)}
            </Typography>
          </Box>

          <Stack divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />} spacing={0}>
            {rows.map((row) => (
              <Stack
                direction="row"
                key={row.name}
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}
              >
                <Typography color="rgba(255,255,255,0.62)" variant="body2">
                  {row.name}
                </Typography>
                <Typography sx={{ textAlign: 'right' }} variant="subtitle2">
                  {row.value}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {action ? (
            <Stack spacing={1.25}>
              <Typography color="rgba(255,255,255,0.68)" variant="body2">
                {action.helper}
              </Typography>
              <Button
                color={action.color}
                disabled={actionPending || Boolean(pendingAction)}
                onClick={() => {
                  void action.onClick();
                }}
                startIcon={actionPending ? <CircularProgress color="inherit" size={16} /> : undefined}
                variant={action.variant}
              >
                {actionPending ? t('dashboard.settings.billing.actions.processing') : action.label}
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

interface CurrentPlanAction {
  color: 'error' | 'primary';
  helper: string;
  label: string;
  onClick: () => Promise<void>;
  pendingKey: 'cancel-renewal' | 'cancel-trial' | 'reactivate-renewal';
  variant: 'contained' | 'outlined';
}

function getCurrentPlanAction({
  isRecurring,
  isTrialing,
  onCancelRenewal,
  onCancelTrial,
  onReactivateRenewal,
  subscription,
  t,
}: {
  isRecurring: boolean;
  isTrialing: boolean;
  onCancelRenewal?: () => Promise<void>;
  onCancelTrial?: () => Promise<void>;
  onReactivateRenewal?: () => Promise<void>;
  subscription: CurrentSubscription;
  t: TFunction;
}): CurrentPlanAction | null {
  if (subscription.cancelAtPeriodEnd && onReactivateRenewal) {
    return {
      color: 'primary',
      helper: t('dashboard.settings.billing.currentPlan.reactivateHelper'),
      label: t('dashboard.settings.billing.actions.reactivateRenewal'),
      onClick: onReactivateRenewal,
      pendingKey: 'reactivate-renewal',
      variant: 'contained',
    };
  }

  if (isTrialing && onCancelTrial) {
    return {
      color: 'error',
      helper: t('dashboard.settings.billing.currentPlan.cancelTrialHelper'),
      label: t('dashboard.settings.billing.actions.cancelTrial'),
      onClick: onCancelTrial,
      pendingKey: 'cancel-trial',
      variant: 'contained',
    };
  }

  if (isRecurring && onCancelRenewal) {
    return {
      color: 'error',
      helper: t('dashboard.settings.billing.currentPlan.cancelRenewalHelper'),
      label: t('dashboard.settings.billing.actions.cancelRenewal'),
      onClick: onCancelRenewal,
      pendingKey: 'cancel-renewal',
      variant: 'contained',
    };
  }

  return null;
}

function getCurrentPlanSubheader(subscription: CurrentSubscription, language: string, t: TFunction): string {
  const status = subscription.status?.toLowerCase();
  const endDate = subscription.renewsAt ? formatDate(subscription.renewsAt, language) : t('dashboard.settings.billing.values.empty');

  if (subscription.cancelAtPeriodEnd && status === 'trialing') {
    return t('dashboard.settings.billing.currentPlan.trialCancelledSubheader', { date: endDate });
  }

  if (subscription.cancelAtPeriodEnd) {
    return t('dashboard.settings.billing.currentPlan.renewalCancelledSubheader', { date: endDate });
  }

  if (status === 'trialing') {
    const trialEndDate = subscription.trialEndsAt
      ? formatDate(subscription.trialEndsAt, language)
      : t('dashboard.settings.billing.values.empty');

    return t('dashboard.settings.billing.currentPlan.trialSubheader', {
      date: trialEndDate,
      days: subscription.trialDaysRemaining ?? '',
    });
  }

  return t('dashboard.settings.billing.currentPlan.subheader');
}

function BillingCyclesCard({
  cycles,
  hasActiveSubscription,
  language,
  onSelectPlan,
  planName,
  t,
}: {
  cycles: BillingCycleOption[];
  hasActiveSubscription: boolean;
  language: string;
  onSelectPlan: (planId: string) => void;
  planName: string;
  t: TFunction;
}): React.JSX.Element {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={
          <Avatar>
            <CreditCardIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.billing.cycles.subheader')}
        title={t('dashboard.settings.billing.cycles.title')}
      />
      <CardContent>
        <Grid container spacing={2}>
          {cycles.map((cycle) => (
            <Grid key={cycle.interval} md={6} xs={12}>
              <BillingCycleCard
                cycle={cycle}
                hasActiveSubscription={hasActiveSubscription}
                language={language}
                onSelectPlan={onSelectPlan}
                planName={planName}
                t={t}
              />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

function BillingCycleCard({
  cycle,
  hasActiveSubscription,
  language,
  onSelectPlan,
  planName,
  t,
}: {
  cycle: BillingCycleOption;
  hasActiveSubscription: boolean;
  language: string;
  onSelectPlan: (planId: string) => void;
  planName: string;
  t: TFunction;
}): React.JSX.Element {
  const isSelectable = !hasActiveSubscription && !cycle.disabled && cycle.planId;

  return (
    <Card
      sx={{
        borderColor: cycle.selected ? 'primary.main' : cycle.disabled ? 'divider' : 'neutral.300',
        borderRadius: 1,
        borderWidth: cycle.selected ? 2 : 1,
        height: '100%',
        opacity: cycle.disabled ? 0.62 : 1,
      }}
      variant="outlined"
    >
      <Stack spacing={2.5} sx={{ height: '100%', p: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            color={cycle.selected ? 'success' : 'default'}
            icon={cycle.selected ? <CheckCircleIcon weight="fill" /> : undefined}
            label={cycle.selected ? t('dashboard.settings.billing.cycles.selected') : cycle.label}
            size="small"
            variant="soft"
          />
          {cycle.disabled ? (
            <Chip color="default" label={t('dashboard.settings.billing.cycles.unavailable')} size="small" variant="soft" />
          ) : null}
          {cycle.recommended ? (
            <Chip color="primary" label={t('dashboard.settings.billing.cycles.bestValue')} size="small" variant="soft" />
          ) : null}
          {cycle.trial?.available ? (
            <Chip
              color="success"
              label={t('dashboard.settings.billing.cycles.freeTrial', { days: cycle.trial.days })}
              size="small"
              variant="soft"
            />
          ) : null}
        </Stack>

        <Box>
          <Typography variant="h5">{planName}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
            {cycle.description}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography sx={{ lineHeight: 1 }} variant="h3">
            {formatCurrency(cycle.priceUsd, cycle.currency, language)}
          </Typography>
          <Typography color="text.secondary" variant="subtitle2">
            {getPeriodLabel(cycle.interval, t)}
          </Typography>
        </Stack>

        <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {cycle.features.map((feature) => (
            <Stack component="li" direction="row" key={feature} spacing={1.25} sx={{ alignItems: 'flex-start' }}>
              <CheckCircleIcon color="var(--mui-palette-success-main)" fontSize="var(--icon-fontSize-md)" weight="fill" />
              <Typography color="text.secondary" variant="body2">
                {feature}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {!hasActiveSubscription ? (
          <Box sx={{ flex: '1 1 auto', minHeight: 0 }} />
        ) : null}

        {!hasActiveSubscription ? (
          <Button
            disabled={!isSelectable}
            fullWidth
            onClick={() => {
              if (cycle.planId) {
                onSelectPlan(cycle.planId);
              }
            }}
            startIcon={<CreditCardIcon />}
            variant="contained"
          >
            {cycle.trial?.available
              ? t('dashboard.settings.billing.actions.startTrial', { days: cycle.trial.days })
              : t('dashboard.settings.billing.actions.acquirePlan')}
          </Button>
        ) : null}
      </Stack>
    </Card>
  );
}

function CheckoutAgreementDialog({
  acceptedTerms,
  canStartCheckout,
  checkoutError,
  cycle,
  isCheckoutPending,
  isTrialPaymentSourceSetupLoading,
  language,
  onAcceptedTermsChange,
  onClose,
  onCheckoutErrorClear,
  onStartCheckout,
  open,
  t,
  trialPaymentSourceSetup,
}: {
  acceptedTerms: boolean;
  canStartCheckout: boolean;
  checkoutError: string;
  cycle?: BillingCycleOption;
  isCheckoutPending: boolean;
  isTrialPaymentSourceSetupLoading: boolean;
  language: string;
  onAcceptedTermsChange: (value: boolean) => void;
  onClose: () => void;
  onCheckoutErrorClear?: () => void;
  onStartCheckout: (trialPaymentMethod?: TrialPaymentMethod) => Promise<void>;
  open: boolean;
  t: TFunction;
  trialPaymentSourceSetup?: WompiPaymentSourceSetup | null;
}): React.JSX.Element {
  const trial = cycle?.trial?.available ? cycle.trial : undefined;
  const requiresPaymentSource = Boolean(cycle);
  const todayDisplayAmount = trial ? (trial.setup_amount_usd ?? 0) : cycle?.priceUsd;
  const processingAmount = trial ? (trial.setup_amount_cop ?? 0) : cycle?.processingAmount;
  const processingCurrency = cycle?.processingCurrency ?? 'COP';
  const firstChargeDate = trial ? formatFutureDate(trial.days, language) : undefined;
  const firstChargeAmount = cycle ? formatCurrency(cycle.priceUsd, cycle.currency, language) : t('dashboard.settings.billing.values.empty');
  const isMobile = useMediaQuery('down', 'sm');
  const [acceptedWompiContracts, setAcceptedWompiContracts] = React.useState<boolean>(false);
  const [trialCard, setTrialCard] = React.useState<WompiCardDetails>(() => emptyTrialCard());
  const expirationYears = React.useMemo(() => getExpirationYears(), []);
  const cardNumberError = trialCard.number.length > 0 && !isValidCardNumber(trialCard.number);
  const cvcError = trialCard.cvc.length > 0 && !isValidCvc(trialCard.cvc);
  const requiresWompiContracts = Boolean(
    trialPaymentSourceSetup?.acceptance.permalink || trialPaymentSourceSetup?.personal_data_auth.permalink
  );
  const canSubmit =
    canStartCheckout &&
    (!requiresPaymentSource ||
      (Boolean(trialPaymentSourceSetup) &&
        !isTrialPaymentSourceSetupLoading &&
        isTrialCardValid(trialCard) &&
        (!requiresWompiContracts || acceptedWompiContracts)));

  React.useEffect(() => {
    if (!open) {
      setAcceptedWompiContracts(false);
      setTrialCard(emptyTrialCard());
    }
  }, [open]);

  const handleTrialCardChange = React.useCallback(
    (field: keyof WompiCardDetails) =>
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        onCheckoutErrorClear?.();
        const value =
          field === 'cvc'
            ? normalizeCvc(event.target.value)
            : field === 'number'
              ? normalizeCardNumber(event.target.value)
              : event.target.value;

        setTrialCard((current) => ({ ...current, [field]: value }));
      },
    [onCheckoutErrorClear]
  );

  return (
    <Dialog fullScreen={isMobile} fullWidth maxWidth="lg" onClose={onClose} open={open}>
      <DialogTitle>{t('dashboard.settings.billing.checkout.title')}</DialogTitle>
      <DialogContent dividers sx={{ pb: { sm: 4, xs: 5 } }}>
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          {trial
            ? t('dashboard.settings.billing.checkout.trialSubheader', { days: trial.days })
            : t('dashboard.settings.billing.checkout.subheader')}
        </Typography>
        <Grid container spacing={{ sm: 3, xs: 2 }}>
          <Grid md={5} sx={{ order: { md: 0, xs: 2 } }} xs={12}>
            <Card sx={{ borderRadius: 1, height: '100%' }} variant="outlined">
              <Stack spacing={2} sx={{ p: 2.5 }}>
                <Typography variant="subtitle2">{t('dashboard.settings.billing.checkout.summaryTitle')}</Typography>
                <Stack divider={<Divider />} spacing={0}>
                  <SummaryRow
                    label={t('dashboard.settings.billing.fields.plan')}
                    value={
                      cycle
                        ? t('dashboard.settings.billing.checkout.planValue', { cycle: cycle.label })
                        : t('dashboard.settings.billing.values.empty')
                    }
                  />
                  <SummaryRow
                    label={t('dashboard.settings.billing.fields.billingCycle')}
                    value={cycle ? getIntervalLabel(cycle.interval, t) : t('dashboard.settings.billing.values.empty')}
                  />
                  <SummaryRow
                    label={
                      trial
                        ? t('dashboard.settings.billing.checkout.todayCharge')
                        : t('dashboard.settings.billing.checkout.displayPrice')
                    }
                    value={
                      cycle
                        ? formatCurrency(todayDisplayAmount, cycle.currency, language)
                        : t('dashboard.settings.billing.values.empty')
                    }
                  />
                  {trial ? (
                    <SummaryRow
                      label={t('dashboard.settings.billing.checkout.firstPlanCharge')}
                      value={
                        cycle
                          ? `${formatCurrency(cycle.priceUsd, cycle.currency, language)} - ${firstChargeDate}`
                          : t('dashboard.settings.billing.values.empty')
                      }
                    />
                  ) : null}
                  {!trial || (typeof processingAmount === 'number' && processingAmount > 0) ? (
                    <SummaryRow
                      label={t('dashboard.settings.billing.checkout.processingAmount')}
                      value={
                        typeof processingAmount === 'number'
                          ? formatCurrency(processingAmount, processingCurrency, language)
                          : t('dashboard.settings.billing.values.empty')
                      }
                    />
                  ) : null}
                </Stack>
                <Alert severity="info" variant="outlined">
                  {trial
                    ? t('dashboard.settings.billing.checkout.trialWompiNotice')
                    : t('dashboard.settings.billing.checkout.wompiNotice')}
                </Alert>
              </Stack>
            </Card>
          </Grid>
          <Grid md={7} sx={{ order: { md: 0, xs: 1 } }} xs={12}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2">{t('dashboard.settings.billing.terms.title')}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                  {trial
                    ? t('dashboard.settings.billing.terms.trialBody', {
                        days: trial.days,
                        interval: cycle ? getIntervalLabel(cycle.interval, t).toLowerCase() : '',
                      })
                    : t('dashboard.settings.billing.terms.body', {
                        interval: cycle ? getIntervalLabel(cycle.interval, t).toLowerCase() : '',
                      })}
                </Typography>
              </Box>
              {requiresPaymentSource ? (
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2">{t('dashboard.settings.billing.paymentMethod.title')}</Typography>
                  {isTrialPaymentSourceSetupLoading ? (
                    <Alert severity="info" variant="outlined">
                      {t('dashboard.settings.billing.paymentMethod.loading')}
                    </Alert>
                  ) : trialPaymentSourceSetup ? (
                    null
                  ) : (
                    <Alert severity="warning" variant="outlined">
                      {t('dashboard.settings.billing.paymentMethod.setupUnavailable')}
                    </Alert>
                  )}
                  <Grid container spacing={1.5}>
                    <Grid xs={12}>
                      <TextField
                        disabled={isCheckoutPending}
                        fullWidth
                        label={t('dashboard.settings.billing.paymentMethod.cardHolder')}
                        onChange={handleTrialCardChange('card_holder')}
                        value={trialCard.card_holder}
                      />
                    </Grid>
                    <Grid xs={12}>
                      <TextField
                        disabled={isCheckoutPending}
                        error={cardNumberError}
                        fullWidth
                        helperText={
                          cardNumberError ? t('dashboard.settings.billing.paymentMethod.cardNumberInvalid') : undefined
                        }
                        inputProps={{ inputMode: 'numeric', maxLength: 19, pattern: '[0-9]*' }}
                        label={t('dashboard.settings.billing.paymentMethod.cardNumber')}
                        onChange={handleTrialCardChange('number')}
                        value={trialCard.number}
                      />
                    </Grid>
                    <Grid sm={4} xs={4}>
                      <TextField
                        SelectProps={{ displayEmpty: true }}
                        disabled={isCheckoutPending}
                        fullWidth
                        label={t('dashboard.settings.billing.paymentMethod.expMonth')}
                        onChange={handleTrialCardChange('exp_month')}
                        select
                        value={trialCard.exp_month}
                      >
                        <MenuItem disabled value="">
                          MM
                        </MenuItem>
                        {expirationMonths.map((month) => (
                          <MenuItem key={month} value={month}>
                            {month}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid sm={4} xs={4}>
                      <TextField
                        SelectProps={{ displayEmpty: true }}
                        disabled={isCheckoutPending}
                        fullWidth
                        label={t('dashboard.settings.billing.paymentMethod.expYear')}
                        onChange={handleTrialCardChange('exp_year')}
                        select
                        value={trialCard.exp_year}
                      >
                        <MenuItem disabled value="">
                          YYYY
                        </MenuItem>
                        {expirationYears.map((year) => (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid sm={4} xs={4}>
                      <TextField
                        disabled={isCheckoutPending}
                        error={cvcError}
                        fullWidth
                        helperText={cvcError ? t('dashboard.settings.billing.paymentMethod.cvcInvalid') : undefined}
                        inputProps={{ inputMode: 'numeric', maxLength: 4, pattern: '[0-9]*' }}
                        label={t('dashboard.settings.billing.paymentMethod.cvc')}
                        onChange={handleTrialCardChange('cvc')}
                        type="password"
                        value={trialCard.cvc}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              ) : null}
              {trialPaymentSourceSetup ? (
                <WompiContractsAcceptance
                  checked={acceptedWompiContracts}
                  disabled={isCheckoutPending}
                  onChange={(value) => {
                    onCheckoutErrorClear?.();
                    setAcceptedWompiContracts(value);
                  }}
                  setup={trialPaymentSourceSetup}
                  t={t}
                />
              ) : null}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptedTerms}
                    onChange={(event) => {
                      onCheckoutErrorClear?.();
                      onAcceptedTermsChange(event.target.checked);
                    }}
                  />
                }
                label={
                  <Typography variant="body2">
                    {trial
                      ? t('dashboard.settings.billing.terms.trialAcceptance', {
                          amount: firstChargeAmount,
                          date: firstChargeDate,
                          days: trial.days,
                        })
                      : t('dashboard.settings.billing.terms.acceptance')}
                  </Typography>
                }
                sx={{ alignItems: 'flex-start', m: 0 }}
              />
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ alignItems: 'stretch', flexDirection: 'column', gap: 1.5, px: { sm: 3, xs: 2 }, py: 2 }}>
        {checkoutError ? (
          <Alert color="error" variant="outlined">
            {checkoutError}
          </Alert>
        ) : null}
        <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1} sx={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button disabled={isCheckoutPending} onClick={onClose} sx={{ width: { sm: 'auto', xs: '100%' } }} variant="outlined">
            {t('dashboard.settings.billing.actions.cancel')}
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              void onStartCheckout({ card: normalizedTrialCard(trialCard) });
            }}
            startIcon={isCheckoutPending ? <CircularProgress color="inherit" size={16} /> : <CreditCardIcon />}
            sx={{ width: { sm: 'auto', xs: '100%' } }}
            variant="contained"
          >
            {isCheckoutPending
              ? t('dashboard.settings.billing.actions.processing')
              : trial
                ? t('dashboard.settings.billing.actions.continueToTrial')
                : t('dashboard.settings.billing.actions.continueToPayment')}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

function WompiContractsAcceptance({
  checked,
  disabled,
  onChange,
  setup,
  t,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  setup: WompiPaymentSourceSetup;
  t: TFunction;
}): React.JSX.Element | null {
  if (!setup.acceptance.permalink && !setup.personal_data_auth.permalink) {
    return null;
  }

  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
        />
      }
      label={
        <Typography variant="body2">
          {t('dashboard.settings.billing.paymentMethod.wompiContractsAccepted')}{' '}
          {setup.acceptance.permalink ? (
            <Link href={setup.acceptance.permalink} rel="noreferrer" target="_blank">
              {t('dashboard.settings.billing.paymentMethod.termsLink')}
            </Link>
          ) : null}
          {setup.acceptance.permalink && setup.personal_data_auth.permalink ? ' · ' : null}
          {setup.personal_data_auth.permalink ? (
            <Link href={setup.personal_data_auth.permalink} rel="noreferrer" target="_blank">
              {t('dashboard.settings.billing.paymentMethod.privacyLink')}
            </Link>
          ) : null}
        </Typography>
      }
      sx={{ alignItems: 'flex-start', m: 0 }}
    />
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ textAlign: 'right' }} variant="subtitle2">
        {value}
      </Typography>
    </Stack>
  );
}

function emptyTrialCard(): WompiCardDetails {
  return {
    card_holder: '',
    cvc: '',
    exp_month: '',
    exp_year: '',
    number: '',
  };
}

function normalizedTrialCard(card: WompiCardDetails): WompiCardDetails {
  return {
    card_holder: card.card_holder.trim(),
    cvc: normalizeCvc(card.cvc),
    exp_month: card.exp_month.trim(),
    exp_year: card.exp_year.trim(),
    number: normalizeCardNumber(card.number),
  };
}

function isTrialCardValid(card: WompiCardDetails): boolean {
  const normalizedCard = normalizedTrialCard(card);
  const month = Number(normalizedCard.exp_month);

  return (
    normalizedCard.card_holder.trim().length >= 5 &&
    isValidCardNumber(normalizedCard.number) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    isValidExpirationYear(normalizedCard.exp_year) &&
    isValidCvc(normalizedCard.cvc)
  );
}

function normalizeCvc(value: string): string {
  return value.replace(/\D/gu, '').slice(0, 4);
}

function normalizeCardNumber(value: string): string {
  return value.replace(/\D/gu, '').slice(0, 19);
}

function isValidCvc(value: string): boolean {
  return /^\d{3,4}$/u.test(value);
}

function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\D/gu, '');

  if (!/^\d{12,19}$/u.test(digits)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function getExpirationYears(): string[] {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 10 }, (_, index) => String(currentYear + index));
}

function isValidExpirationYear(value: string): boolean {
  return getExpirationYears().includes(value);
}

function UsageOverview({
  language,
  metrics,
  t,
}: {
  language: string;
  metrics: UsageMetric[];
  t: TFunction;
}): React.JSX.Element {
  const primaryMetric = getPrimaryMetric(metrics);

  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar>
            <GaugeIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.billing.usage.subheader')}
        title={t('dashboard.settings.billing.usage.title')}
      />
      <CardContent>
        {metrics.length && primaryMetric ? (
          <Grid container spacing={3}>
            <Grid md={4} xs={12}>
              <UsageRadial language={language} metric={primaryMetric} t={t} />
            </Grid>
            <Grid md={8} xs={12}>
              <Grid container spacing={2}>
                {metrics.map((metric) => (
                  <Grid key={metric.key} lg={6} xs={12}>
                    <UsageMetricCard language={language} metric={metric} t={t} />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.settings.billing.emptySection')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function UsageRadial({
  language,
  metric,
  t,
}: {
  language: string;
  metric: UsageMetric;
  t: TFunction;
}): React.JSX.Element {
  const chartSize = 220;
  const chartValue = metric.unlimited ? 100 : metric.progress;
  const data = [
    { name: 'Empty', value: 100 },
    { name: 'Usage', value: chartValue },
  ] satisfies { name: string; value: number }[];

  return (
    <Stack spacing={2} sx={{ alignItems: 'center', height: '100%', justifyContent: 'center', textAlign: 'center' }}>
      <NoSsr fallback={<Box sx={{ height: `${chartSize}px`, width: `${chartSize}px` }} />}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            '& .recharts-layer path[name="Empty"]': { display: 'none' },
            '& .recharts-layer .recharts-radial-bar-background-sector': {
              fill: 'var(--mui-palette-neutral-100)',
            },
          }}
        >
          <RadialBarChart
            barSize={22}
            data={data}
            endAngle={-10}
            height={chartSize}
            innerRadius={138}
            startAngle={190}
            width={chartSize}
          >
            <RadialBar
              animationDuration={300}
              background
              cornerRadius={11}
              dataKey="value"
              endAngle={-320}
              fill="var(--mui-palette-primary-main)"
              startAngle={20}
            />
          </RadialBarChart>
          <Box
            sx={{
              alignItems: 'center',
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              left: 0,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          >
            <Box sx={{ mt: '-42px' }}>
              <Typography variant="h4">
                {metric.unlimited
                  ? t('dashboard.settings.billing.values.unlimited')
                  : new Intl.NumberFormat(language, { maximumFractionDigits: 0, style: 'percent' }).format(
                      metric.progress / 100
                    )}
              </Typography>
            </Box>
          </Box>
        </Box>
      </NoSsr>
      <Box sx={{ mt: '-68px' }}>
        <Typography variant="h6">{metric.label}</Typography>
        <Typography color="text.secondary" variant="body2">
          {getUsageSummary(metric, language, t)}
        </Typography>
      </Box>
    </Stack>
  );
}

function UsageMetricCard({
  language,
  metric,
  t,
}: {
  language: string;
  metric: UsageMetric;
  t: TFunction;
}): React.JSX.Element {
  const Icon = metric.icon;

  return (
    <Card sx={{ borderRadius: 1, height: '100%' }} variant="outlined">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar
            sx={{
              '--Avatar-size': '40px',
              bgcolor: 'background.level1',
              color: metric.color,
            }}
          >
            <Icon fontSize="var(--Icon-fontSize)" />
          </Avatar>
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography noWrap variant="subtitle2">
              {metric.label}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {metric.unlimited
                ? t('dashboard.settings.billing.values.unlimited')
                : t('dashboard.settings.billing.usage.progress', {
                    progress: new Intl.NumberFormat(language, { maximumFractionDigits: 0, style: 'percent' }).format(
                      metric.progress / 100
                    ),
                  })}
            </Typography>
          </Box>
          {typeof metric.remaining === 'number' && !metric.unlimited ? (
            <Chip
              label={t('dashboard.settings.billing.values.remaining', {
                remaining: formatNumber(metric.remaining, language),
              })}
              size="small"
              variant="soft"
            />
          ) : null}
        </Stack>
        <Typography variant="h5">{getUsageValue(metric, language, t)}</Typography>
        {!metric.unlimited && typeof metric.limit === 'number' && metric.limit > 0 ? (
          <LinearProgress sx={{ height: 8 }} value={metric.progress} variant="determinate" />
        ) : null}
      </Stack>
    </Card>
  );
}

function getCurrentSubscription(
  data: JsonObject,
  plansData: SubscriptionPlans | undefined,
  t: TFunction
): CurrentSubscription {
  const subscription = getRecordField(data, ['subscription']) ?? data;
  const planId = getStringField(subscription, ['plan', 'plan_id', 'planId', 'id']);
  const matchingPlan = plansData?.plans.find((plan) => plan.id === planId) ?? plansData?.plans[0];
  const interval = normalizeInterval(getStringField(subscription, ['interval', 'billing_cycle', 'billingCycle']));
  const priceUsd =
    getNumberField(subscription, ['price_usd', 'priceUsd', 'price']) ??
    (matchingPlan?.price_usd === null ? undefined : matchingPlan?.price_usd);

  return {
    active: typeof subscription.active === 'boolean' ? subscription.active : undefined,
    billingMode: getStringField(subscription, ['billing_mode', 'billingMode']),
    cancelAtPeriodEnd: getBooleanField(subscription, ['cancel_at_period_end', 'cancelAtPeriodEnd']),
    cancelledAt: getStringField(subscription, ['cancelled_at', 'cancelledAt', 'canceled_at', 'canceledAt']),
    currency: getStringField(subscription, ['currency']) ?? matchingPlan?.currency ?? plansData?.display_currency ?? 'USD',
    interval,
    lastBilledAt: getStringField(subscription, ['last_billed_at', 'lastBilledAt']),
    nextBillingAt: getStringField(subscription, ['next_billing_at', 'nextBillingAt']),
    planId,
    planName:
      getStringField(subscription, ['plan_name', 'planName', 'name']) ??
      matchingPlan?.name ??
      t('dashboard.settings.billing.currentPlan.fallbackName'),
    priceUsd,
    renewsAt: getStringField(subscription, ['renews_at', 'renewsAt', 'current_period_end', 'currentPeriodEnd']),
    startedAt: getStringField(subscription, ['started_at', 'startedAt', 'current_period_start', 'currentPeriodStart']),
    status: getStringField(subscription, ['status']),
    trialCancelledAt: getStringField(subscription, ['trial_cancelled_at', 'trialCancelledAt']),
    trialConvertedAt: getStringField(subscription, ['trial_converted_at', 'trialConvertedAt']),
    trialDaysRemaining: getNumberField(subscription, ['trial_days_remaining', 'trialDaysRemaining']),
    trialEndsAt: getStringField(subscription, ['trial_ends_at', 'trialEndsAt']),
    trialStartedAt: getStringField(subscription, ['trial_started_at', 'trialStartedAt']),
  };
}

function hasActiveSubscriptionData(data: JsonObject): boolean {
  const subscription = getRecordField(data, ['subscription']);

  if (!subscription) {
    return false;
  }

  if (subscription.active === false) {
    return false;
  }

  return Boolean(
    subscription.id ||
      subscription.plan ||
      subscription.plan_id ||
      subscription.planId ||
      subscription.name ||
      subscription.plan_name ||
      subscription.planName
  );
}

function getBillingCycles({
  hasActiveSubscription,
  language,
  plansData,
  selectedPlanId,
  subscription,
  t,
}: {
  hasActiveSubscription: boolean;
  language: string;
  plansData?: SubscriptionPlans;
  selectedPlanId?: string;
  subscription: CurrentSubscription;
  t: TFunction;
}): BillingCycleOption[] {
  const matchingPlans = plansData?.plans.filter((plan) => !subscription.planId || plan.id === subscription.planId) ?? [];
  const monthlyPlan = findPlanByInterval(matchingPlans, 'monthly') ?? findPlanByInterval(plansData?.plans ?? [], 'monthly');
  const annualPlan = findPlanByInterval(matchingPlans, 'annual') ?? findPlanByInterval(plansData?.plans ?? [], 'annual');
  const currentPrice = subscription.priceUsd;
  const monthlyPrice =
    monthlyPlan?.price_usd ??
    (subscription.interval === 'monthly'
      ? currentPrice
      : typeof currentPrice === 'number'
        ? Math.round((currentPrice / 10) * 100) / 100
        : undefined);
  const annualPrice =
    annualPlan?.price_usd ??
    (subscription.interval === 'annual'
      ? currentPrice
      : typeof monthlyPrice === 'number'
        ? Math.round(monthlyPrice * 10 * 100) / 100
        : undefined);
  const currency = monthlyPlan?.currency ?? annualPlan?.currency ?? subscription.currency;
  const processingCurrency = plansData?.processing_currency ?? 'COP';
  const trial = plansData?.trial?.available ? plansData.trial : undefined;
  const savings =
    typeof monthlyPrice === 'number' && typeof annualPrice === 'number'
      ? Math.max(monthlyPrice * 12 - annualPrice, 0)
      : undefined;

  return [
    {
      currency,
      description: t('dashboard.settings.billing.cycles.monthly.description'),
      disabled: !isPurchasablePlan(monthlyPlan),
      features: getPlanFeatures({ interval: 'monthly', language, plan: monthlyPlan, savings, t, currency, trial }),
      interval: 'monthly',
      label: t('dashboard.settings.billing.cycles.monthly.label'),
      plan: monthlyPlan,
      planId: monthlyPlan?.id,
      priceUsd: monthlyPrice,
      processingAmount: getProcessingAmount(monthlyPrice, plansData?.exchange_rate),
      processingCurrency,
      recommended: false,
      selected: hasActiveSubscription ? subscription.interval === 'monthly' : monthlyPlan?.id === selectedPlanId,
      trial,
    },
    {
      currency,
      description: t('dashboard.settings.billing.cycles.annual.description'),
      disabled: !isPurchasablePlan(annualPlan),
      features: getPlanFeatures({ interval: 'annual', language, plan: annualPlan, savings, t, currency, trial }),
      interval: 'annual',
      label: t('dashboard.settings.billing.cycles.annual.label'),
      plan: annualPlan,
      planId: annualPlan?.id,
      priceUsd: annualPrice,
      processingAmount: getProcessingAmount(annualPrice, plansData?.exchange_rate),
      processingCurrency,
      recommended: true,
      selected: hasActiveSubscription ? subscription.interval === 'annual' : annualPlan?.id === selectedPlanId,
      trial,
    },
  ];
}

function isPurchasablePlan(plan: SubscriptionPlan | undefined): plan is SubscriptionPlan {
  return Boolean(plan && plan.purchasable !== false && typeof plan.price_usd === 'number' && plan.price_usd > 0);
}

function getCheckoutIntentPlanId(cycles: BillingCycleOption[], intent: CheckoutIntent): string | undefined {
  const targetInterval = getCheckoutIntentInterval(intent);
  const targetPlan = normalizePlanKey(intent.plan);
  const matchingCycle = cycles.find((cycle) => {
    if (cycle.disabled || !cycle.planId) {
      return false;
    }

    if (targetInterval && cycle.interval !== targetInterval) {
      return false;
    }

    return !targetPlan || planMatchesIntent(cycle.plan, cycle.planId, targetPlan);
  });

  return matchingCycle?.planId;
}

function getCheckoutIntentKey(intent: CheckoutIntent): string {
  return [intent.intent, intent.plan ?? '', intent.cycle ?? ''].join(':');
}

function getCheckoutIntentInterval(intent: CheckoutIntent): BillingInterval | undefined {
  if (intent.cycle === 'year') {
    return 'annual';
  }

  if (intent.cycle === 'month') {
    return 'monthly';
  }

  return undefined;
}

function planMatchesIntent(plan: SubscriptionPlan | undefined, planId: string, targetPlan: string): boolean {
  const normalizedPlanId = normalizePlanKey(planId);
  const normalizedName = normalizePlanKey(plan?.name);

  return (
    normalizedPlanId === targetPlan ||
    getBasePlanKey(normalizedPlanId) === targetPlan ||
    normalizedName === targetPlan ||
    getBasePlanKey(normalizedName) === targetPlan
  );
}

function getBasePlanKey(value: string): string {
  return value.replace(/_(?:annual|annually|year|yearly|monthly|month)$/u, '');
}

function normalizePlanKey(value?: string): string {
  return value?.trim().toLowerCase().replace(/[^a-z0-9_-]/gu, '') ?? '';
}

function getProcessingAmount(priceUsd: number | undefined, exchangeRate: number | undefined): number | undefined {
  if (typeof priceUsd !== 'number' || typeof exchangeRate !== 'number' || exchangeRate <= 0) {
    return undefined;
  }

  return Math.round(priceUsd * exchangeRate * 100) / 100;
}

function findPlanByInterval(plans: SubscriptionPlan[], interval: BillingInterval): SubscriptionPlan | undefined {
  return plans.find((plan) => normalizeInterval(plan.interval) === interval);
}

function getPlanFeatures({
  currency,
  interval,
  language,
  plan,
  savings,
  t,
  trial,
}: {
  currency: string;
  interval: BillingInterval;
  language: string;
  plan?: SubscriptionPlan;
  savings?: number;
  t: TFunction;
  trial?: SubscriptionTrial;
}): string[] {
  const features = [
    t('dashboard.settings.billing.planFeatures.profiles', {
      countLabel: formatNumber(getPlanLimit(plan, 'profiles') ?? 1, language),
    }),
    t('dashboard.settings.billing.planFeatures.avatar', {
      images: formatNumber(getPlanLimit(plan, 'avatar_images') ?? 1, language),
      seconds: formatNumber(getPlanLimit(plan, 'avatar_video_seconds') ?? 5, language),
    }),
    t('dashboard.settings.billing.planFeatures.voice', {
      countLabel: formatNumber(getPlanLimit(plan, 'voice_clones') ?? 1, language),
    }),
    t('dashboard.settings.billing.planFeatures.chatMessages', {
      countLabel: formatNumber(getPlanLimit(plan, 'chat_messages') ?? 1000, language),
    }),
    t('dashboard.settings.billing.planFeatures.ttsCharacters', {
      countLabel: formatNumber(getPlanLimit(plan, 'tts_characters') ?? 10000, language),
    }),
    t('dashboard.settings.billing.planFeatures.credits', {
      countLabel: formatNumber(getPlanCreditsTotal(plan) ?? 1000, language),
    }),
  ];

  if (trial?.available) {
    features.unshift(t('dashboard.settings.billing.planFeatures.freeTrial', { days: trial.days }));
  }

  if (interval === 'annual' && typeof savings === 'number' && savings > 0) {
    features.push(
      t('dashboard.settings.billing.planFeatures.savings', {
        amount: formatCurrency(savings, currency, language),
      })
    );
  }

  return features;
}

function getPlanLimit(plan: SubscriptionPlan | undefined, metric: string): number | undefined {
  const value = plan?.limits?.[metric];

  return getNumericJsonValue(value);
}

function getPlanCreditsTotal(plan: SubscriptionPlan | undefined): number | undefined {
  return getNumericJsonValue(plan?.credits?.total);
}

function getNumericJsonValue(value: JsonValue | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return undefined;
}

function getUsageMetrics(data: JsonObject, t: TFunction): UsageMetric[] {
  const metrics = new Map<string, UsageMetric>();
  const sources = [
    getRecordField(data, ['limits']),
    getRecordField(data, ['quota']),
    getRecordField(data, ['quotas']),
  ].filter((source): source is JsonObject => Boolean(source));

  for (const source of sources) {
    addMetricsFromSource(metrics, source, t);
  }

  if (!metrics.size) {
    addMetricsFromSource(metrics, data, t);
  }

  return Array.from(metrics.values()).sort((a, b) => b.progress - a.progress);
}

function addMetricsFromSource(metrics: Map<string, UsageMetric>, source: JsonObject, t: TFunction): void {
  for (const [key, value] of Object.entries(source)) {
    if (metrics.has(key) || !isRecord(value)) {
      continue;
    }

    const metric = getUsageMetric(key, value, t);

    if (metric) {
      metrics.set(key, metric);
    }
  }
}

function getUsageMetric(key: string, value: JsonObject, t: TFunction): UsageMetric | null {
  const explicitUsed = getNumberField(value, usedFields);
  const explicitLimit = getNumberField(value, limitFields);
  const remaining = getNumberField(value, remainingFields);
  const unlimited = value.unlimited === true || hasNullField(value, limitFields) || explicitLimit === -1;
  const limit = explicitLimit;
  const used =
    explicitUsed ??
    (typeof limit === 'number' && typeof remaining === 'number' ? Math.max(limit - remaining, 0) : undefined);

  if (used === undefined && limit === undefined && remaining === undefined && !unlimited) {
    return null;
  }

  const progress =
    !unlimited && typeof used === 'number' && typeof limit === 'number' && limit > 0
      ? Math.min(Math.max((used / limit) * 100, 0), 100)
      : 0;

  return {
    color: getMetricColor(key),
    icon: getMetricIcon(key),
    key,
    label: getFieldLabel(key, t),
    limit: limit === -1 ? undefined : limit,
    progress,
    remaining,
    unlimited,
    used,
  };
}

function getPrimaryMetric(metrics: UsageMetric[]): UsageMetric | undefined {
  return metrics.find((metric) => metric.key.toLowerCase().includes('credit')) ?? metrics[0];
}

function getUsageValue(metric: UsageMetric, language: string, t: TFunction): string {
  if (metric.unlimited) {
    if (typeof metric.used === 'number') {
      return t('dashboard.settings.billing.values.usedOfLimit', {
        limit: t('dashboard.settings.billing.values.unlimited'),
        used: formatNumber(metric.used, language),
      });
    }

    return t('dashboard.settings.billing.values.unlimited');
  }

  if (typeof metric.used === 'number' && typeof metric.limit === 'number') {
    return t('dashboard.settings.billing.values.usedOfLimit', {
      limit: formatNumber(metric.limit, language),
      used: formatNumber(metric.used, language),
    });
  }

  if (typeof metric.used === 'number') {
    return t('dashboard.settings.billing.values.used', { used: formatNumber(metric.used, language) });
  }

  if (typeof metric.limit === 'number') {
    return formatNumber(metric.limit, language);
  }

  return t('dashboard.settings.billing.values.empty');
}

function getUsageSummary(metric: UsageMetric, language: string, t: TFunction): string {
  if (metric.unlimited) {
    return t('dashboard.settings.billing.usage.unlimitedSummary');
  }

  if (typeof metric.remaining === 'number') {
    return t('dashboard.settings.billing.usage.remainingSummary', {
      remaining: formatNumber(metric.remaining, language),
    });
  }

  return getUsageValue(metric, language, t);
}

function getMetricIcon(key: string): Icon {
  const normalized = key.toLowerCase();

  if (normalized.includes('credit')) {
    return CoinsIcon;
  }

  if (normalized.includes('profile')) {
    return UserCircleIcon;
  }

  if (normalized.includes('image') || normalized.includes('avatar')) {
    return normalized.includes('video') ? VideoCameraIcon : ImageSquareIcon;
  }

  if (normalized.includes('video')) {
    return VideoCameraIcon;
  }

  if (normalized.includes('voice')) {
    return MicrophoneIcon;
  }

  if (normalized.includes('tts') || normalized.includes('character')) {
    return SpeakerHighIcon;
  }

  if (normalized.includes('chat') || normalized.includes('message')) {
    return ChatsCircleIcon;
  }

  return GaugeIcon;
}

function getMetricColor(key: string): string {
  const normalized = key.toLowerCase();

  if (normalized.includes('credit')) {
    return 'var(--mui-palette-primary-main)';
  }

  if (normalized.includes('chat') || normalized.includes('message')) {
    return 'var(--mui-palette-success-main)';
  }

  if (normalized.includes('video') || normalized.includes('avatar')) {
    return 'var(--mui-palette-warning-main)';
  }

  if (normalized.includes('tts') || normalized.includes('voice') || normalized.includes('character')) {
    return 'var(--mui-palette-info-main)';
  }

  return 'var(--mui-palette-text-primary)';
}

function getIntervalLabel(interval: BillingInterval, t: TFunction): string {
  return interval === 'annual'
    ? t('dashboard.settings.billing.cycles.annual.label')
    : t('dashboard.settings.billing.cycles.monthly.label');
}

function getPeriodLabel(interval: BillingInterval, t: TFunction): string {
  return interval === 'annual'
    ? t('dashboard.settings.billing.cycles.annual.period')
    : t('dashboard.settings.billing.cycles.monthly.period');
}

function normalizeInterval(value?: string): BillingInterval {
  return value && annualIntervals.has(value.toLowerCase()) ? 'annual' : 'monthly';
}

function getStatusLabel(status: string, t: TFunction): string {
  return t(`dashboard.settings.billing.status.${toCamelCase(status)}`, { defaultValue: toTitle(status) });
}

function getStatusColor(status: string): 'default' | 'error' | 'success' | 'warning' {
  const normalized = status.toLowerCase();

  if (['active', 'first', 'paid', 'renewed', 'succeeded', 'valid'].includes(normalized)) {
    return 'success';
  }

  if (['canceled', 'cancelled', 'expired', 'failed', 'inactive'].includes(normalized)) {
    return 'error';
  }

  if (['past_due', 'pending', 'trialing'].includes(normalized)) {
    return 'warning';
  }

  return 'default';
}

function getRecordField(value: JsonObject, fields: string[]): JsonObject | undefined {
  for (const field of fields) {
    const recordValue = value[field];

    if (isRecord(recordValue)) {
      return recordValue;
    }
  }

  return undefined;
}

function getStringField(value: JsonObject, fields: string[]): string | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'string' && rawValue) {
      return rawValue;
    }
  }

  return undefined;
}

function getNumberField(value: JsonObject, fields: readonly string[]): number | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return rawValue;
    }

    if (typeof rawValue === 'string') {
      const parsedValue = Number(rawValue);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return undefined;
}

function getBooleanField(value: JsonObject, fields: readonly string[]): boolean | undefined {
  for (const field of fields) {
    const rawValue = value[field];

    if (typeof rawValue === 'boolean') {
      return rawValue;
    }
  }

  return undefined;
}

function hasNullField(value: JsonObject, fields: readonly string[]): boolean {
  return fields.some((field) => value[field] === null);
}

function isRecord(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getFieldLabel(field: string, t: TFunction): string {
  return t(`dashboard.settings.billing.fields.${toCamelCase(field)}`, { defaultValue: toTitle(field) });
}

function toCamelCase(value: string): string {
  const [first = '', ...rest] = value.split(/[-_\s]+/).filter(Boolean);

  return `${first}${rest.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join('')}`;
}

function toTitle(value: string): string {
  return value
    .replace(/(?<lower>[a-z])(?<upper>[A-Z])/g, '$<lower> $<upper>')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number | undefined, currency: string, language: string): string {
  if (typeof value !== 'number') {
    return '-';
  }

  return new Intl.NumberFormat(language, {
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    style: 'currency',
  }).format(value);
}

function formatDate(value: string, language: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
}

function formatFutureDate(days: number, language: string): string {
  const date = new Date();

  date.setDate(date.getDate() + days);

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
}

function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language).format(value);
}

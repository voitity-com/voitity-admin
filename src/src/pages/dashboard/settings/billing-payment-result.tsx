import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import type { PaymentOrder } from '@/lib/payments/api-client';
import { clearPendingPaymentOrderId, getPaymentOrder, getPendingPaymentOrderId } from '@/lib/payments/api-client';
import { logger } from '@/lib/default-logger';
import { RouterLink } from '@/components/core/link';

const metadata = { title: `Payment result | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;
const pendingStatuses = new Set(['pending']);
const failedStatuses = new Set(['declined', 'voided', 'error', 'expired']);

export function Page(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [searchParams] = useSearchParams();
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [order, setOrder] = React.useState<PaymentOrder | null>(null);
  const paymentOrderId = React.useMemo(() => getPaymentOrderId(searchParams), [searchParams]);

  const loadOrder = React.useCallback(async (): Promise<void> => {
    if (!paymentOrderId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const paymentOrder = await getPaymentOrder(paymentOrderId);
      setOrder(paymentOrder);

      if (normalizeStatus(paymentOrder.status) === 'approved') {
        clearPendingPaymentOrderId();
      }
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.settings.billing.paymentResult.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [paymentOrderId, t]);

  React.useEffect(() => {
    loadOrder().catch((err) => {
      logger.error(err);
    });
  }, [loadOrder]);

  React.useEffect(() => {
    if (!order || !pendingStatuses.has(normalizeStatus(order.status))) {
      return;
    }

    const timeout = window.setTimeout(() => {
      loadOrder().catch((err) => {
        logger.error(err);
      });
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadOrder, order]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={4}>
        <div>
          <Typography variant="h4">{t('dashboard.settings.billing.paymentResult.pageTitle')}</Typography>
        </div>
        {error ? <Alert color="error">{error}</Alert> : null}
        {isLoading ? (
          <Card>
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          </Card>
        ) : paymentOrderId && order ? (
          <PaymentResultCard language={language} onRefresh={loadOrder} order={order} t={t} />
        ) : (
          <MissingPaymentOrderCard t={t} />
        )}
      </Stack>
    </React.Fragment>
  );
}

function PaymentResultCard({
  language,
  onRefresh,
  order,
  t,
}: {
  language: string;
  onRefresh: () => Promise<void>;
  order: PaymentOrder;
  t: ReturnType<typeof useTranslation>['t'];
}): React.JSX.Element {
  const status = normalizeStatus(order.status);
  const isApproved = status === 'approved';
  const isPending = pendingStatuses.has(status);
  const isFailed = failedStatuses.has(status);
  const Icon = isApproved ? CheckCircleIcon : isFailed ? WarningCircleIcon : CreditCardIcon;

  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar
            sx={{
              bgcolor: isApproved
                ? 'success.main'
                : isFailed
                  ? 'error.main'
                  : 'background.level1',
              color: isApproved || isFailed ? 'common.white' : 'text.primary',
            }}
          >
            <Icon fontSize="var(--Icon-fontSize)" weight={isApproved ? 'fill' : undefined} />
          </Avatar>
        }
        subheader={getStatusDescription(status, t)}
        title={t('dashboard.settings.billing.paymentResult.cardTitle')}
      />
      <CardContent>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip color={getStatusColor(status)} label={getStatusLabel(status, t)} variant="soft" />
            {isPending ? (
              <Chip color="warning" label={t('dashboard.settings.billing.paymentResult.autoRefresh')} variant="soft" />
            ) : null}
          </Stack>

          <Stack divider={<Divider />} spacing={0}>
            <SummaryRow
              label={t('dashboard.settings.billing.fields.plan')}
              value={order.plan ? toTitle(order.plan) : t('dashboard.settings.billing.values.empty')}
            />
            <SummaryRow
              label={t('dashboard.settings.billing.paymentResult.reference')}
              value={order.reference ?? t('dashboard.settings.billing.values.empty')}
            />
            <SummaryRow
              label={t('dashboard.settings.billing.paymentResult.amount')}
              value={formatPaymentAmount(order, language, t)}
            />
            <SummaryRow
              label={t('dashboard.settings.billing.paymentResult.paidAt')}
              value={order.paid_at ? formatDate(order.paid_at, language) : t('dashboard.settings.billing.values.empty')}
            />
          </Stack>

          <Box>
            <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
              <Button component={RouterLink} href={paths.dashboard.settings.billing} variant="contained">
                {t('dashboard.settings.billing.paymentResult.actions.backToBilling')}
              </Button>
              {isApproved ? (
                <Button component={RouterLink} href={paths.dashboard.settings.usage} variant="outlined">
                  {t('dashboard.settings.billing.paymentResult.actions.viewUsage')}
                </Button>
              ) : null}
              {isPending ? (
                <Button
                  onClick={() => {
                    void onRefresh();
                  }}
                  startIcon={<ArrowClockwiseIcon />}
                  variant="outlined"
                >
                  {t('dashboard.settings.billing.paymentResult.actions.refresh')}
                </Button>
              ) : null}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function MissingPaymentOrderCard({ t }: { t: ReturnType<typeof useTranslation>['t'] }): React.JSX.Element {
  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar>
            <CreditCardIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.billing.paymentResult.missing.subheader')}
        title={t('dashboard.settings.billing.paymentResult.missing.title')}
      />
      <CardContent>
        <Button component={RouterLink} href={paths.dashboard.settings.billing} variant="contained">
          {t('dashboard.settings.billing.paymentResult.actions.backToBilling')}
        </Button>
      </CardContent>
    </Card>
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

function getPaymentOrderId(searchParams: URLSearchParams): string | null {
  return searchParams.get('payment_order_id') ?? searchParams.get('order_id') ?? getPendingPaymentOrderId();
}

function normalizeStatus(status: string | undefined): string {
  return (status ?? 'pending').toLowerCase();
}

function getStatusLabel(status: string, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`dashboard.settings.billing.status.${toCamelCase(status)}`, { defaultValue: toTitle(status) });
}

function getStatusDescription(status: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (status === 'approved') {
    return t('dashboard.settings.billing.paymentResult.status.approved');
  }

  if (pendingStatuses.has(status)) {
    return t('dashboard.settings.billing.paymentResult.status.pending');
  }

  if (failedStatuses.has(status)) {
    return t('dashboard.settings.billing.paymentResult.status.failed');
  }

  return t('dashboard.settings.billing.paymentResult.status.unknown');
}

function getStatusColor(status: string): 'default' | 'error' | 'success' | 'warning' {
  if (status === 'approved') {
    return 'success';
  }

  if (failedStatuses.has(status)) {
    return 'error';
  }

  if (pendingStatuses.has(status)) {
    return 'warning';
  }

  return 'default';
}

function formatPaymentAmount(order: PaymentOrder, language: string, t: ReturnType<typeof useTranslation>['t']): string {
  const amount = order.amounts?.display_amount_usd;
  const currency = order.amounts?.display_currency ?? 'USD';

  if (typeof amount !== 'number') {
    return t('dashboard.settings.billing.values.empty');
  }

  return new Intl.NumberFormat(language, {
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    style: 'currency',
  }).format(amount);
}

function formatDate(value: string, language: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
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

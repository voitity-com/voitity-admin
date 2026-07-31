import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';
import type { PaymentMethod } from '@/lib/payments/api-client';
import type { CreditCatalog, CreditPaymentOrder, CreditPurchases, CreditWallet } from '@/lib/subscription/api-client';
import { SubscriptionApiError } from '@/lib/subscription/api-client';

const wompiUrl = 'https://wompi.co/es/co/';
const creditRateKeys = [
  'chat_messages',
  'incoming_audio_seconds',
  'tts_characters',
  'avatar_images',
  'avatar_video_seconds',
  'voice_clones',
] as const;

export interface CreditWalletCardProps {
  catalog: CreditCatalog;
  isActivePaidSubscription: boolean;
  isPurchasing?: boolean;
  language: string;
  onAddPaymentMethod: () => void;
  onPurchase: (credits: number, paymentMethodId: number | string) => Promise<void>;
  paymentMethods: PaymentMethod[];
  purchaseDialogResume?: {
    key: number;
    paymentMethodId?: number | string;
  };
  purchases: CreditPurchases;
  wallet: CreditWallet;
}

export function CreditWalletCard({
  catalog,
  isActivePaidSubscription,
  isPurchasing = false,
  language,
  onAddPaymentMethod,
  onPurchase,
  paymentMethods,
  purchaseDialogResume,
  purchases,
  wallet,
}: CreditWalletCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [credits, setCredits] = React.useState(catalog.packages[0]?.credits ?? catalog.minimum_purchase_credits);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [purchaseError, setPurchaseError] = React.useState('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = React.useState<string>('');
  const [openPaymentMethodAfterExit, setOpenPaymentMethodAfterExit] = React.useState(false);
  const handledResumeKeyRef = React.useRef(0);
  const selectedPaymentMethod = paymentMethods.find(
    (method) => String(method.id) === selectedPaymentMethodId
  );
  const priceUsd = (credits / 1000) * catalog.price_per_1000_usd;
  const termsUrl = `${(config.publicProfile?.baseUrl || 'http://localhost:3001').replace(/\/+$/u, '')}${
    language.toLowerCase().startsWith('es') ? '/terminos' : '/terms'
  }`;
  const canPurchase =
    isActivePaidSubscription &&
    Boolean(selectedPaymentMethod?.is_chargeable) &&
    acceptedTerms &&
    credits >= catalog.minimum_purchase_credits &&
    credits <= catalog.maximum_purchase_credits &&
    (credits - catalog.minimum_purchase_credits) % catalog.purchase_step_credits === 0 &&
    !isPurchasing;

  const close = (): void => {
    if (isPurchasing) {
      return;
    }

    setAcceptedTerms(false);
    setPurchaseError('');
    setIsOpen(false);
  };

  const open = (): void => {
    setAcceptedTerms(false);
    setPurchaseError('');
    setSelectedPaymentMethodId(getPreferredPaymentMethodId(paymentMethods));
    setIsOpen(true);
  };

  const openPaymentMethodForm = (): void => {
    setPurchaseError('');
    setOpenPaymentMethodAfterExit(true);
    setIsOpen(false);
  };

  React.useEffect(() => {
    if (!purchaseDialogResume?.key || handledResumeKeyRef.current === purchaseDialogResume.key) {
      return;
    }

    handledResumeKeyRef.current = purchaseDialogResume.key;
    const preferred = paymentMethods.find(
      (method) => String(method.id) === String(purchaseDialogResume.paymentMethodId) && method.is_chargeable
    );
    const current = paymentMethods.find(
      (method) => String(method.id) === selectedPaymentMethodId && method.is_chargeable
    );

    setSelectedPaymentMethodId(
      preferred ? String(preferred.id) : current ? String(current.id) : getPreferredPaymentMethodId(paymentMethods)
    );
    setIsOpen(true);
  }, [paymentMethods, purchaseDialogResume, selectedPaymentMethodId]);

  React.useEffect(() => {
    if (!isOpen || selectedPaymentMethod?.is_chargeable) {
      return;
    }

    setSelectedPaymentMethodId(getPreferredPaymentMethodId(paymentMethods));
  }, [isOpen, paymentMethods, selectedPaymentMethod?.is_chargeable]);

  return (
    <Stack spacing={3}>
      <Card>
        <CardHeader
          action={
            <Button
              disabled={!isActivePaidSubscription || !catalog.enabled}
              onClick={open}
              startIcon={<PlusIcon />}
              variant="contained"
            >
              {t('dashboard.settings.billing.creditsStore.buy')}
            </Button>
          }
          avatar={<CoinsIcon fontSize="var(--Icon-fontSize)" />}
          subheader={t('dashboard.settings.billing.creditsStore.subheader')}
          sx={{
            alignItems: 'center',
            columnGap: 2,
            display: 'grid',
            gridTemplateAreas: {
              sm: '"avatar content action"',
              xs: '"avatar content" "action action"',
            },
            gridTemplateColumns: {
              sm: 'auto minmax(0, 1fr) auto',
              xs: 'auto minmax(0, 1fr)',
            },
            rowGap: { sm: 0, xs: 2 },
            '& .MuiCardHeader-action': {
              alignSelf: 'center',
              gridArea: 'action',
              m: 0,
              '& .MuiButton-root': {
                width: { sm: 'auto', xs: '100%' },
              },
            },
            '& .MuiCardHeader-avatar': {
              gridArea: 'avatar',
              mr: 0,
            },
            '& .MuiCardHeader-content': {
              gridArea: 'content',
              minWidth: 0,
            },
          }}
          title={t('dashboard.settings.billing.creditsStore.title')}
        />
        <CardContent>
          {!isActivePaidSubscription ? (
            <Alert color="info" sx={{ mb: 3 }}>
              {t('dashboard.settings.billing.creditsStore.requiresPaidPlan')}
            </Alert>
          ) : null}
          {wallet.debt > 0 ? (
            <Alert color="error" sx={{ mb: 3 }}>
              {t('dashboard.settings.billing.creditsStore.debt', { count: wallet.debt })}
            </Alert>
          ) : null}
          <Grid container spacing={3}>
            <WalletValue
              label={t('dashboard.settings.billing.creditsStore.available')}
              value={formatNumber(wallet.available, language)}
            />
            <WalletValue
              label={t('dashboard.settings.billing.creditsStore.reserved')}
              value={formatNumber(wallet.reserved, language)}
            />
            <WalletValue
              label={t('dashboard.settings.billing.creditsStore.lifetimePurchased')}
              value={formatNumber(wallet.lifetime_purchased, language)}
            />
            <WalletValue
              label={t('dashboard.settings.billing.creditsStore.lifetimeConsumed')}
              value={formatNumber(wallet.lifetime_consumed, language)}
            />
          </Grid>
        </CardContent>
      </Card>

      <CreditPurchaseHistory language={language} purchases={purchases.items} />

      <Dialog
        TransitionProps={{
          onExited: () => {
            if (openPaymentMethodAfterExit) {
              setOpenPaymentMethodAfterExit(false);
              onAddPaymentMethod();
            }
          },
        }}
        fullWidth
        maxWidth="sm"
        onClose={close}
        open={isOpen}
      >
        <DialogTitle>{t('dashboard.settings.billing.creditsStore.dialog.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              onChange={(_, value: number | null) => {
                if (value) {
                  setCredits(value);
                }
              }}
              value={catalog.packages.some((item) => item.credits === credits) ? credits : null}
            >
              {catalog.packages.map((item) => (
                <ToggleButton key={item.credits} value={item.credits}>
                  {formatNumber(item.credits, language)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <TextField
              fullWidth
              inputProps={{
                max: catalog.maximum_purchase_credits,
                min: catalog.minimum_purchase_credits,
                step: catalog.purchase_step_credits,
              }}
              label={t('dashboard.settings.billing.creditsStore.dialog.custom')}
              onChange={(event) => {
                setCredits(Number(event.target.value));
              }}
              type="number"
              value={credits}
            />
            <Stack divider={<Divider flexItem />} spacing={1.5}>
              <SummaryRow
                label={t('dashboard.settings.billing.creditsStore.dialog.credits')}
                value={formatNumber(credits, language)}
              />
              <SummaryRow
                label={t('dashboard.settings.billing.creditsStore.dialog.price')}
                value={formatCurrency(priceUsd, language)}
              />
            </Stack>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">
                {t('dashboard.settings.billing.creditsStore.dialog.paymentMethodTitle')}
              </Typography>
              {paymentMethods.length ? (
                <RadioGroup
                  aria-label={t('dashboard.settings.billing.creditsStore.dialog.paymentMethodTitle')}
                  onChange={(event) => {
                    setPurchaseError('');
                    setSelectedPaymentMethodId(event.target.value);
                  }}
                  value={selectedPaymentMethodId}
                >
                  <Stack
                    divider={<Divider flexItem />}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    {paymentMethods.map((method) => (
                      <FormControlLabel
                        control={<Radio />}
                        data-testid={`credit-payment-method-${method.id}`}
                        disabled={!method.is_chargeable}
                        key={method.id}
                        label={
                          <Stack
                            direction={{ sm: 'row', xs: 'column' }}
                            spacing={{ sm: 2, xs: 0.5 }}
                            sx={{
                              alignItems: { sm: 'center' },
                              justifyContent: 'space-between',
                              minWidth: 0,
                              py: 1,
                              width: '100%',
                            }}
                          >
                            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                              <CreditCardIcon fontSize="22px" />
                              <Typography noWrap variant="body2">
                                {paymentMethodLabel(
                                  method,
                                  t('dashboard.settings.billing.paymentMethod.savedCard')
                                )}
                              </Typography>
                            </Stack>
                            <Typography
                              color={method.is_chargeable ? 'text.secondary' : 'error.main'}
                              variant="caption"
                            >
                              {method.requires_attention
                                ? t('dashboard.settings.billing.creditsStore.dialog.rejectedCard')
                                : method.is_default
                                  ? t('dashboard.settings.billing.creditsStore.dialog.defaultCard')
                                  : method.is_chargeable
                                    ? t('dashboard.settings.billing.creditsStore.dialog.availableCard')
                                    : t('dashboard.settings.billing.creditsStore.dialog.unavailableCard')}
                            </Typography>
                          </Stack>
                        }
                        slotProps={{
                          typography: {
                            component: 'div',
                            sx: { flex: 1, minWidth: 0 },
                          },
                        }}
                        sx={{
                          alignItems: 'center',
                          m: 0,
                          minHeight: 64,
                          px: 1.5,
                          width: '100%',
                        }}
                        value={String(method.id)}
                      />
                    ))}
                  </Stack>
                </RadioGroup>
              ) : (
                <Alert severity="warning">
                  {t('dashboard.settings.billing.creditsStore.dialog.paymentMethodRequired')}
                </Alert>
              )}
              {!selectedPaymentMethod?.is_chargeable && paymentMethods.length ? (
                <Alert severity="warning">
                  {t('dashboard.settings.billing.creditsStore.dialog.noChargeablePaymentMethod')}
                </Alert>
              ) : null}
              <Button
                onClick={openPaymentMethodForm}
                size="small"
                startIcon={<PlusIcon />}
                sx={{ alignSelf: 'flex-start' }}
              >
                {paymentMethods.length
                  ? t('dashboard.settings.billing.creditsStore.dialog.addAnotherCard')
                  : t('dashboard.settings.billing.creditsStore.dialog.addCard')}
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">{t('dashboard.settings.billing.creditsStore.rates.title')}</Typography>
              {creditRateKeys.map((key) => (
                <SummaryRow
                  key={key}
                  label={t(`dashboard.settings.billing.creditsStore.rates.services.${key}`)}
                  value={t('dashboard.settings.billing.creditsStore.rates.value', {
                    amount: formatNumber(catalog.rates[key] ?? 0, language),
                    unit: t(`dashboard.settings.billing.creditsStore.rates.units.${key}`),
                  })}
                />
              ))}
            </Stack>
            <Alert color="info">
              {t('dashboard.settings.billing.creditsStore.dialog.wompiPrefix')}{' '}
              <Link href={wompiUrl} rel="noreferrer" target="_blank">
                Wompi
              </Link>{' '}
              {t('dashboard.settings.billing.creditsStore.dialog.wompiSuffix')}
            </Alert>
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(event.target.checked);
                  }}
                />
              }
              label={
                <Typography variant="body2">
                  {t('dashboard.settings.billing.creditsStore.dialog.acceptTerms')}{' '}
                  <Link href={termsUrl} rel="noreferrer" target="_blank">
                    {t('dashboard.settings.billing.creditsStore.dialog.terms')}
                  </Link>
                </Typography>
              }
            />
            {purchaseError ? <Alert severity="error">{purchaseError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={isPurchasing} onClick={close}>
            {t('dashboard.settings.billing.creditsStore.dialog.cancel')}
          </Button>
          <Button
            disabled={!canPurchase}
            onClick={() => {
              setPurchaseError('');
              if (!selectedPaymentMethod) {
                return;
              }

              onPurchase(credits, selectedPaymentMethod.id)
                .then(() => {
                  close();
                })
                .catch((error: unknown) => {
                  setPurchaseError(
                    error instanceof SubscriptionApiError && error.code === 'PAYMENT_METHOD_REQUIRED'
                      ? t('dashboard.settings.billing.creditsStore.dialog.paymentMethodRequired')
                      : error instanceof SubscriptionApiError && error.code === 'CREDIT_PAYMENT_DECLINED'
                        ? t('dashboard.settings.billing.creditsStore.errors.paymentDeclined')
                      : error instanceof Error
                        ? error.message
                        : t('dashboard.settings.billing.creditsStore.errors.purchase')
                  );
                });
            }}
            startIcon={isPurchasing ? <CircularProgress size={16} /> : undefined}
            variant="contained"
          >
            {t('dashboard.settings.billing.creditsStore.dialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function getPreferredPaymentMethodId(paymentMethods: PaymentMethod[]): string {
  const method =
    paymentMethods.find((item) => item.is_default && item.is_chargeable) ??
    paymentMethods.find((item) => item.is_chargeable);

  return method ? String(method.id) : '';
}

function paymentMethodLabel(paymentMethod: PaymentMethod, fallback: string): string {
  const brand = paymentMethod.brand?.trim() || fallback;
  const lastFour = paymentMethod.last_four?.trim();

  return lastFour ? `${brand} •••• ${lastFour}` : brand;
}

function WalletValue({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Grid md={3} sm={6} xs={12}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5 }} variant="h5">
        {value}
      </Typography>
    </Grid>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography variant="subtitle2">{value}</Typography>
    </Stack>
  );
}

function CreditPurchaseHistory({
  language,
  purchases,
}: {
  language: string;
  purchases: CreditPaymentOrder[];
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader
        subheader={t('dashboard.settings.billing.creditsStore.history.subheader')}
        title={t('dashboard.settings.billing.creditsStore.history.title')}
      />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('dashboard.settings.billing.creditsStore.history.date')}</TableCell>
              <TableCell>{t('dashboard.settings.billing.creditsStore.history.credits')}</TableCell>
              <TableCell>{t('dashboard.settings.billing.creditsStore.history.amount')}</TableCell>
              <TableCell>{t('dashboard.settings.billing.creditsStore.history.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.length ? (
              purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>{purchase.created_at ? formatDate(purchase.created_at, language) : '-'}</TableCell>
                  <TableCell>{formatNumber(purchase.credits, language)}</TableCell>
                  <TableCell>
                    {typeof purchase.amounts?.display_amount_usd === 'number'
                      ? formatCurrency(purchase.amounts.display_amount_usd, language)
                      : '-'}
                  </TableCell>
                  <TableCell>{t(`dashboard.settings.billing.status.${purchase.status}`, purchase.status)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }} variant="body2">
                    {t('dashboard.settings.billing.creditsStore.history.empty')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(value);
}

function formatCurrency(value: number, language: string): string {
  return new Intl.NumberFormat(language, { currency: 'USD', style: 'currency' }).format(value);
}

function formatDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value));
}

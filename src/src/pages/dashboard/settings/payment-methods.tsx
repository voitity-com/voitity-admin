import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import {
  addPaymentMethod,
  getPaymentMethodSetup,
  listPaymentMethods,
  type PaymentMethod,
  type PaymentMethodPayload,
  removePaymentMethod,
  setDefaultPaymentMethod,
  type WompiPaymentSourceSetup,
} from '@/lib/payments/api-client';
import { PaymentMethodFormDialog } from '@/components/dashboard/settings/payment-method-form-dialog';

const metadata = { title: `Payment methods | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;
const wompiWebsiteUrl = 'https://wompi.co/es/co/';

export function Page(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [methods, setMethods] = React.useState<PaymentMethod[]>([]);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isSetupLoading, setIsSetupLoading] = React.useState(false);
  const [setup, setSetup] = React.useState<WompiPaymentSourceSetup | null>(null);
  const [setupError, setSetupError] = React.useState('');
  const [pendingMethodId, setPendingMethodId] = React.useState<string | null>(null);
  const [methodToRemove, setMethodToRemove] = React.useState<PaymentMethod | null>(null);

  const loadMethods = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setMethods(await listPaymentMethods());
    } catch (loadError) {
      logger.error(loadError);
      setError(getErrorMessage(loadError, t('dashboard.settings.paymentMethods.errors.load')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  const openAddDialog = React.useCallback(async (): Promise<void> => {
    setIsAddOpen(true);
    setIsSetupLoading(true);
    setSetupError('');

    try {
      setSetup(await getPaymentMethodSetup());
    } catch (setupFailure) {
      logger.error(setupFailure);
      setSetup(null);
      setSetupError(getErrorMessage(setupFailure, t('dashboard.settings.paymentMethods.errors.setup')));
    } finally {
      setIsSetupLoading(false);
    }
  }, [t]);

  const handleAdd = React.useCallback(
    async (payload: PaymentMethodPayload): Promise<void> => {
      const method = await addPaymentMethod(payload);
      setMethods((current) => sortMethods([...current.filter((item) => item.id !== method.id), method]));
      setIsAddOpen(false);
      toast.success(t('dashboard.settings.paymentMethods.toasts.added'));
    },
    [t]
  );

  const handleSetDefault = React.useCallback(
    async (method: PaymentMethod): Promise<void> => {
      setPendingMethodId(String(method.id));

      try {
        const updated = await setDefaultPaymentMethod(method.id);
        setMethods((current) =>
          sortMethods(
            current.map((item) => ({
              ...item,
              is_default: item.id === updated.id,
            }))
          )
        );
        toast.success(t('dashboard.settings.paymentMethods.toasts.defaultUpdated'));
      } catch (mutationError) {
        logger.error(mutationError);
        toast.error(getErrorMessage(mutationError, t('dashboard.settings.paymentMethods.errors.default')));
      } finally {
        setPendingMethodId(null);
      }
    },
    [t]
  );

  const handleRemove = React.useCallback(async (): Promise<void> => {
    if (!methodToRemove) {
      return;
    }

    setPendingMethodId(String(methodToRemove.id));

    try {
      await removePaymentMethod(methodToRemove.id);
      setMethods((current) => current.filter((method) => method.id !== methodToRemove.id));
      setMethodToRemove(null);
      toast.success(t('dashboard.settings.paymentMethods.toasts.removed'));
    } catch (mutationError) {
      logger.error(mutationError);
      toast.error(getErrorMessage(mutationError, t('dashboard.settings.paymentMethods.errors.remove')));
    } finally {
      setPendingMethodId(null);
    }
  }, [methodToRemove, t]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        <Stack
          direction={{ sm: 'row', xs: 'column' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4">{t('dashboard.settings.paymentMethods.title')}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
              {t('dashboard.settings.paymentMethods.subtitle')}
            </Typography>
          </Box>
          <Button onClick={() => void openAddDialog()} startIcon={<PlusIcon />} variant="contained">
            {t('dashboard.settings.paymentMethods.actions.add')}
          </Button>
        </Stack>

        <Alert severity="info" variant="outlined">
          {t('dashboard.settings.paymentMethods.providerNotice')}{' '}
          <Link href={wompiWebsiteUrl} rel="noreferrer" target="_blank">
            Wompi
          </Link>
        </Alert>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Card>
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 6 }}>
              <CircularProgress />
            </Stack>
          ) : methods.length === 0 ? (
            <CardContent>
              <Stack spacing={2} sx={{ alignItems: 'center', py: 5, textAlign: 'center' }}>
                <CreditCardIcon fontSize="40px" />
                <Box>
                  <Typography variant="h6">{t('dashboard.settings.paymentMethods.empty.title')}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.settings.paymentMethods.empty.body')}
                  </Typography>
                </Box>
                <Button onClick={() => void openAddDialog()} startIcon={<PlusIcon />} variant="outlined">
                  {t('dashboard.settings.paymentMethods.actions.add')}
                </Button>
              </Stack>
            </CardContent>
          ) : (
            <Stack divider={<Divider />}>
              {methods.map((method) => {
                const isPending = pendingMethodId === String(method.id);
                const removeDisabled = method.is_default || isPending;
                const removeTooltip = method.is_default
                  ? t('dashboard.settings.paymentMethods.tooltips.defaultCannotBeRemoved')
                  : t('dashboard.settings.paymentMethods.actions.remove');

                return (
                  <Stack
                    direction={{ sm: 'row', xs: 'column' }}
                    key={method.id}
                    spacing={2}
                    sx={{
                      alignItems: { sm: 'center' },
                      justifyContent: 'space-between',
                      minHeight: 88,
                      px: { sm: 3, xs: 2 },
                      py: 2,
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Box
                        sx={{
                          alignItems: 'center',
                          bgcolor: 'background.level1',
                          borderRadius: 1,
                          display: 'flex',
                          flex: '0 0 auto',
                          height: 44,
                          justifyContent: 'center',
                          width: 60,
                        }}
                      >
                        <CreditCardIcon fontSize="24px" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 600 }}>
                            {getPaymentMethodLabel(method, t('dashboard.settings.paymentMethods.values.card'))}
                          </Typography>
                          {method.is_default ? (
                            <Chip
                              color="success"
                              icon={<CheckCircleIcon />}
                              label={t('dashboard.settings.paymentMethods.values.default')}
                              size="small"
                              variant="outlined"
                            />
                          ) : null}
                          {method.requires_attention ? (
                            <Chip
                              color="error"
                              label={t('dashboard.settings.paymentMethods.values.requiresAttention')}
                              size="small"
                              variant="soft"
                            />
                          ) : null}
                        </Stack>
                        <Typography color="text.secondary" variant="body2">
                          {getExpirationLabel(method, language, t('dashboard.settings.paymentMethods.values.noExpiration'))}
                        </Typography>
                        {method.requires_attention ? (
                          <Typography color="error.main" variant="body2">
                            {t('dashboard.settings.paymentMethods.values.lastPaymentRejected')}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', alignSelf: { sm: 'auto', xs: 'flex-end' } }}>
                      {!method.is_default ? (
                        <Button
                          disabled={!method.is_chargeable || isPending}
                          onClick={() => {
                            void handleSetDefault(method);
                          }}
                          size="small"
                          startIcon={isPending ? <CircularProgress size={14} /> : <CheckCircleIcon />}
                        >
                          {t('dashboard.settings.paymentMethods.actions.makeDefault')}
                        </Button>
                      ) : null}
                      <Tooltip title={removeTooltip}>
                        <span>
                          <IconButton
                            aria-label={t('dashboard.settings.paymentMethods.actions.remove')}
                            color="error"
                            disabled={removeDisabled}
                            onClick={() => {
                              setMethodToRemove(method);
                            }}
                          >
                            <TrashIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Card>
      </Stack>

      <PaymentMethodFormDialog
        loading={isSetupLoading}
        onClose={() => {
          setIsAddOpen(false);
        }}
        onSubmit={handleAdd}
        open={isAddOpen}
        setup={setup}
        setupError={setupError}
      />

      <Dialog
        onClose={() => {
          setMethodToRemove(null);
        }}
        open={Boolean(methodToRemove)}
      >
        <DialogTitle>{t('dashboard.settings.paymentMethods.removeDialog.title')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.settings.paymentMethods.removeDialog.body', {
              lastFour: methodToRemove?.last_four ?? t('dashboard.settings.paymentMethods.values.unknown'),
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMethodToRemove(null);
            }}
          >
            {t('dashboard.settings.paymentMethods.actions.cancel')}
          </Button>
          <Button
            color="error"
            onClick={() => {
              void handleRemove();
            }}
            variant="contained"
          >
            {t('dashboard.settings.paymentMethods.actions.remove')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function sortMethods(methods: PaymentMethod[]): PaymentMethod[] {
  return [...methods].sort((left, right) => Number(right.is_default) - Number(left.is_default));
}

function getPaymentMethodLabel(method: PaymentMethod, fallback: string): string {
  const brand = method.brand?.trim() || fallback;
  const lastFour = method.last_four?.trim();

  return lastFour ? `${brand} •••• ${lastFour}` : brand;
}

function getExpirationLabel(method: PaymentMethod, language: string, fallback: string): string {
  if (!method.expiration_month || !method.expiration_year) {
    return fallback;
  }

  const date = new Date(method.expiration_year, method.expiration_month - 1, 1);

  return new Intl.DateTimeFormat(language, { month: '2-digit', year: 'numeric' }).format(date);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

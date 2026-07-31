'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Unstable_Grid2';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import type { TFunction } from 'i18next';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import {
  initializeWompiSession,
  type PaymentMethodPayload,
  tokenizeWompiCard,
  type WompiPaymentSourceSetup,
} from '@/lib/payments/api-client';
import { useMediaQuery } from '@/hooks/use-media-query';

const expirationMonths = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

interface FormValues {
  accept_provider_contracts: boolean;
  card_holder: string;
  cvc: string;
  exp_month: string;
  exp_year: string;
  number: string;
}

export interface PaymentMethodFormDialogProps {
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: PaymentMethodPayload) => Promise<void>;
  open: boolean;
  setup?: WompiPaymentSourceSetup | null;
  setupError?: string;
}

export function PaymentMethodFormDialog({
  loading = false,
  onClose,
  onSubmit,
  open,
  setup,
  setupError = '',
}: PaymentMethodFormDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('down', 'sm');
  const years = React.useMemo(() => getExpirationYears(), []);
  const requiresProviderAcceptance = Boolean(setup?.acceptance.permalink || setup?.personal_data_auth.permalink);
  const schema = React.useMemo(
    () => createSchema(t, requiresProviderAcceptance),
    [requiresProviderAcceptance, t]
  );
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
    setValue,
  } = useForm<FormValues>({
    defaultValues: emptyValues(),
    resolver: zodResolver(schema),
  });

  React.useEffect(() => {
    if (!open) {
      reset(emptyValues());
    }
  }, [open, reset]);

  const submit = React.useCallback(
    async (values: FormValues): Promise<void> => {
      if (!setup) {
        setError('root', { message: t('dashboard.settings.paymentMethods.errors.setup') });
        return;
      }

      try {
        const card = {
          card_holder: values.card_holder.trim(),
          cvc: values.cvc,
          exp_month: values.exp_month,
          exp_year: values.exp_year,
          number: values.number,
        };
        const [session, token] = await Promise.all([
          initializeWompiSession(setup),
          tokenizeWompiCard(setup, card),
        ]);

        // Remove primary account data from controlled fields as soon as tokenization finishes.
        setValue('number', '');
        setValue('cvc', '');

        await onSubmit({
          accept_personal_auth: setup.personal_data_auth.acceptance_token,
          acceptance_token: setup.acceptance.acceptance_token,
          customer_data: {
            device_id: session.device_id,
            full_name: values.card_holder.trim(),
          },
          metadata: {
            card: {
              brand: token.brand ?? token.name,
              exp_month: Number(token.exp_month ?? values.exp_month),
              exp_year: normalizeYear(token.exp_year ?? values.exp_year),
              last_four: token.last_four,
            },
            wompi_environment: setup.environment,
          },
          session_id: session.session_id,
          token: token.id,
          type: 'CARD',
        });
        reset(emptyValues());
      } catch (error) {
        setValue('number', '');
        setValue('cvc', '');
        setError('root', {
          message: error instanceof Error ? error.message : t('dashboard.settings.paymentMethods.errors.add'),
        });
      }
    },
    [onSubmit, reset, setError, setValue, setup, t]
  );

  return (
    <Dialog fullScreen={isMobile} fullWidth maxWidth="sm" onClose={isSubmitting ? undefined : onClose} open={open}>
      <form onSubmit={handleSubmit(submit)}>
        <DialogTitle>{t('dashboard.settings.paymentMethods.addDialog.title')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {setupError ? <Alert severity="error">{setupError}</Alert> : null}
            {errors.root?.message ? <Alert severity="error">{errors.root.message}</Alert> : null}
            <Grid container spacing={1.5}>
              <Grid xs={12}>
                <Controller
                  control={control}
                  name="card_holder"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      autoComplete="cc-name"
                      disabled={loading || isSubmitting}
                      error={Boolean(errors.card_holder)}
                      fullWidth
                      helperText={errors.card_holder?.message}
                      label={t('dashboard.settings.paymentMethods.fields.cardHolder')}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12}>
                <Controller
                  control={control}
                  name="number"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      autoComplete="cc-number"
                      disabled={loading || isSubmitting}
                      error={Boolean(errors.number)}
                      fullWidth
                      helperText={errors.number?.message}
                      inputProps={{ inputMode: 'numeric', maxLength: 19 }}
                      label={t('dashboard.settings.paymentMethods.fields.cardNumber')}
                      onChange={(event) => {
                        field.onChange(formatCardNumber(event.target.value));
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid xs={4}>
                <Controller
                  control={control}
                  name="exp_month"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      autoComplete="cc-exp-month"
                      disabled={loading || isSubmitting}
                      error={Boolean(errors.exp_month)}
                      fullWidth
                      label={t('dashboard.settings.paymentMethods.fields.expMonth')}
                      select
                    >
                      {expirationMonths.map((month) => (
                        <MenuItem key={month} value={month}>
                          {month}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid xs={4}>
                <Controller
                  control={control}
                  name="exp_year"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      autoComplete="cc-exp-year"
                      disabled={loading || isSubmitting}
                      error={Boolean(errors.exp_year)}
                      fullWidth
                      label={t('dashboard.settings.paymentMethods.fields.expYear')}
                      select
                    >
                      {years.map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid xs={4}>
                <Controller
                  control={control}
                  name="cvc"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      autoComplete="cc-csc"
                      disabled={loading || isSubmitting}
                      error={Boolean(errors.cvc)}
                      fullWidth
                      helperText={errors.cvc?.message}
                      inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                      label={t('dashboard.settings.paymentMethods.fields.cvc')}
                      onChange={(event) => {
                        field.onChange(event.target.value.replace(/\D/gu, '').slice(0, 4));
                      }}
                      type="password"
                    />
                  )}
                />
              </Grid>
            </Grid>
            {requiresProviderAcceptance ? (
              <Controller
                control={control}
                name="accept_provider_contracts"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        disabled={loading || isSubmitting}
                        onChange={(event) => {
                          field.onChange(event.target.checked);
                        }}
                      />
                    }
                    label={
                      <span>
                        {t('dashboard.settings.paymentMethods.addDialog.acceptProvider')}{' '}
                        {setup?.acceptance.permalink ? (
                          <Link href={setup.acceptance.permalink} rel="noreferrer" target="_blank">
                            {t('dashboard.settings.paymentMethods.addDialog.acceptanceRegulation')}
                          </Link>
                        ) : null}
                        {setup?.acceptance.permalink && setup.personal_data_auth.permalink ? ' / ' : null}
                        {setup?.personal_data_auth.permalink ? (
                          <Link href={setup.personal_data_auth.permalink} rel="noreferrer" target="_blank">
                            {t('dashboard.settings.paymentMethods.addDialog.personalDataAuthorization')}
                          </Link>
                        ) : null}
                      </span>
                    }
                  />
                )}
              />
            ) : null}
            {errors.accept_provider_contracts?.message ? (
              <Alert severity="warning">{errors.accept_provider_contracts.message}</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={isSubmitting} onClick={onClose}>
            {t('dashboard.settings.paymentMethods.actions.cancel')}
          </Button>
          <Button
            disabled={loading || isSubmitting || !setup}
            startIcon={<CreditCardIcon />}
            type="submit"
            variant="contained"
          >
            {isSubmitting
              ? t('dashboard.settings.paymentMethods.actions.adding')
              : t('dashboard.settings.paymentMethods.actions.add')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function createSchema(t: TFunction, requiresProviderAcceptance: boolean): zod.ZodType<FormValues> {
  return zod.object({
    accept_provider_contracts: requiresProviderAcceptance
      ? zod.literal(true, {
          errorMap: () => ({ message: t('dashboard.settings.paymentMethods.validation.providerAcceptance') }),
        })
      : zod.boolean(),
    card_holder: zod.string().trim().min(3, t('dashboard.settings.paymentMethods.validation.cardHolder')),
    cvc: zod.string().regex(/^\d{3,4}$/u, t('dashboard.settings.paymentMethods.validation.cvc')),
    exp_month: zod.string().regex(/^(?:0[1-9]|1[0-2])$/u, t('dashboard.settings.paymentMethods.validation.expiration')),
    exp_year: zod.string().refine((value) => Number(value) >= new Date().getFullYear(), {
      message: t('dashboard.settings.paymentMethods.validation.expiration'),
    }),
    number: zod.string().refine(isValidCardNumber, {
      message: t('dashboard.settings.paymentMethods.validation.cardNumber'),
    }),
  });
}

function emptyValues(): FormValues {
  return {
    accept_provider_contracts: false,
    card_holder: '',
    cvc: '',
    exp_month: '',
    exp_year: '',
    number: '',
  };
}

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/gu, '')
    .slice(0, 19)
    .replace(/(?<chunk>\d{4})(?=\d)/gu, '$<chunk> ');
}

function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\D/gu, '');

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (double) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

function getExpirationYears(): string[] {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 16 }, (_, index) => String(currentYear + index));
}

function normalizeYear(value: string): number {
  const year = Number(value);

  return year < 100 ? 2000 + year : year;
}

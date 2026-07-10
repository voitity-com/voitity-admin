'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { z as zod } from 'zod';

import { paths } from '@/paths';
import { authClient } from '@/lib/auth/custom/client';
import { getSupportedLanguage } from '@/lib/i18n';
import { RouterLink } from '@/components/core/link';
import { DynamicLogo } from '@/components/core/logo';
import { toast } from '@/components/core/toaster';

interface Values {
  email: string;
  password: string;
  passwordConfirmation: string;
}

type LinkValidationStatus = 'checking' | 'idle' | 'invalid' | 'valid';

export function ResetPasswordForm(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const emailParam = searchParams.get('email') ?? '';
  const localeParam = searchParams.get('locale');
  const isResetMode = Boolean(token && emailParam);
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  const [isPending, setIsPending] = React.useState<boolean>(false);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [successMessage, setSuccessMessage] = React.useState<null | string>(null);
  const [linkValidationMessage, setLinkValidationMessage] = React.useState<null | string>(null);
  const [linkValidationStatus, setLinkValidationStatus] = React.useState<LinkValidationStatus>(
    isResetMode ? 'checking' : 'idle'
  );
  const isPasswordUpdated = Boolean(successMessage && isResetMode);
  const isResetLinkChecking = isResetMode && linkValidationStatus === 'checking';
  const isResetLinkInvalid = isResetMode && linkValidationStatus === 'invalid';

  React.useEffect(() => {
    if (!localeParam) {
      return;
    }

    const nextLanguage = getSupportedLanguage(localeParam);
    const activeLanguage = getSupportedLanguage(currentLanguage);

    if (activeLanguage !== nextLanguage) {
      i18n.changeLanguage(nextLanguage).catch(() => {
        // Keep the current language if the requested one cannot be loaded.
      });
    }
  }, [currentLanguage, i18n, localeParam]);

  React.useEffect(() => {
    if (!isResetMode) {
      setLinkValidationMessage(null);
      setLinkValidationStatus('idle');
      return;
    }

    if (successMessage) {
      return;
    }

    let isActive = true;
    setLinkValidationMessage(null);
    setLinkValidationStatus('checking');

    authClient
      .validatePasswordResetLink({
        email: emailParam,
        locale: getSupportedLanguage(localeParam ?? currentLanguage),
        token,
      })
      .then((result) => {
        if (!isActive) {
          return;
        }

        if (result.error) {
          setLinkValidationMessage(result.error);
          setLinkValidationStatus('invalid');
          return;
        }

        setLinkValidationMessage(result.message ?? null);
        setLinkValidationStatus(result.status === 'valid' ? 'valid' : 'invalid');
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setLinkValidationMessage(t('auth.resetPassword.validation.unavailable'));
        setLinkValidationStatus('invalid');
      });

    return () => {
      isActive = false;
    };
  }, [currentLanguage, emailParam, isResetMode, localeParam, successMessage, t, token]);

  const schema = React.useMemo(() => {
    if (!isResetMode) {
      return zod.object({
        email: zod
          .string()
          .min(1, { message: t('auth.resetPassword.validation.emailRequired') })
          .email({ message: t('auth.resetPassword.validation.emailInvalid') }),
        password: zod.string(),
        passwordConfirmation: zod.string(),
      });
    }

    return zod
      .object({
        email: zod
          .string()
          .min(1, { message: t('auth.resetPassword.validation.emailRequired') })
          .email({ message: t('auth.resetPassword.validation.emailInvalid') }),
        password: zod.string().min(8, { message: t('auth.resetPassword.validation.passwordMin') }),
        passwordConfirmation: zod.string().min(1, {
          message: t('auth.resetPassword.validation.passwordConfirmationRequired'),
        }),
      })
      .refine((value) => value.password === value.passwordConfirmation, {
        message: t('auth.resetPassword.validation.passwordMismatch'),
        path: ['passwordConfirmation'],
      });
  }, [isResetMode, t]);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    trigger,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: { email: emailParam, password: '', passwordConfirmation: '' },
    resolver: zodResolver(schema),
  });

  React.useEffect(() => {
    reset({ email: emailParam, password: '', passwordConfirmation: '' });
  }, [emailParam, reset]);

  React.useEffect(() => {
    if (errors.email || errors.password || errors.passwordConfirmation) {
      trigger(['email', 'password', 'passwordConfirmation']).catch(() => {
        // ignore
      });
    }
  }, [currentLanguage, errors.email, errors.password, errors.passwordConfirmation, trigger]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setIsPending(true);
      setSuccessMessage(null);

      const result = isResetMode
        ? await authClient.updatePassword({
            email: emailParam,
            password: values.password,
            passwordConfirmation: values.passwordConfirmation,
            token,
          })
        : await authClient.resetPassword({
            email: values.email,
            locale: getSupportedLanguage(currentLanguage),
      });

      if (result.error) {
        if (isResetMode) {
          setLinkValidationMessage(result.error);
          setLinkValidationStatus('invalid');
          setIsPending(false);
          return;
        }

        setError('root', { type: 'server', message: result.error });
        setIsPending(false);
        return;
      }

      const message = isResetMode
        ? t('auth.resetPassword.success.updated')
        : t('auth.resetPassword.success.requested');

      setSuccessMessage(message);
      toast.success(message);
      reset({ email: isResetMode ? emailParam : '', password: '', passwordConfirmation: '' });
      setIsPending(false);
    },
    [currentLanguage, emailParam, isResetMode, reset, setError, t, token]
  );

  return (
    <Stack spacing={4}>
      <div>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-block', fontSize: 0 }}>
          <DynamicLogo colorDark="light" colorLight="dark" height={32} width={122} />
        </Box>
      </div>
      <Stack spacing={1}>
        <Typography variant="h5">
          {isPasswordUpdated
            ? t('auth.resetPassword.successTitle')
            : isResetLinkInvalid
              ? t('auth.resetPassword.invalidTitle')
              : isResetLinkChecking
                ? t('auth.resetPassword.checkingTitle')
                : isResetMode
                  ? t('auth.resetPassword.updateTitle')
                  : t('auth.resetPassword.requestTitle')}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {isPasswordUpdated
            ? t('auth.resetPassword.successDescription')
            : isResetLinkInvalid
              ? t('auth.resetPassword.invalidDescription')
              : isResetLinkChecking
                ? t('auth.resetPassword.checkingDescription')
                : isResetMode
                  ? t('auth.resetPassword.updateDescription')
                  : t('auth.resetPassword.requestDescription')}
        </Typography>
      </Stack>
      {isPasswordUpdated ? (
        <Stack spacing={2}>
          <Alert color="success">{successMessage}</Alert>
          <Button component={RouterLink} href={paths.auth.custom.signIn} variant="contained">
            {t('auth.resetPassword.actions.signIn')}
          </Button>
        </Stack>
      ) : isResetLinkChecking ? (
        <Alert color="info">{t('auth.resetPassword.validation.checking')}</Alert>
      ) : isResetLinkInvalid ? (
        <Stack spacing={2}>
          <Alert color="error">{linkValidationMessage ?? t('auth.resetPassword.validation.unavailable')}</Alert>
          <Button component={RouterLink} href={paths.auth.custom.resetPassword} variant="contained">
            {t('auth.resetPassword.actions.requestNewLink')}
          </Button>
          <Button component={RouterLink} href={paths.auth.custom.signIn} variant="outlined">
            {t('auth.resetPassword.actions.signIn')}
          </Button>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormControl error={Boolean(errors.email)}>
                  <InputLabel>{t('auth.resetPassword.fields.email')}</InputLabel>
                  <OutlinedInput
                    {...field}
                    disabled={isResetMode}
                    label={t('auth.resetPassword.fields.email')}
                    type="email"
                  />
                  {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            {isResetMode ? (
              <React.Fragment>
                <Controller
                  control={control}
                  name="password"
                  render={({ field }) => (
                    <FormControl error={Boolean(errors.password)}>
                      <InputLabel>{t('auth.resetPassword.fields.password')}</InputLabel>
                      <OutlinedInput
                        {...field}
                        endAdornment={
                          showPassword ? (
                            <EyeIcon
                              cursor="pointer"
                              fontSize="var(--icon-fontSize-md)"
                              onClick={(): void => {
                                setShowPassword(false);
                              }}
                            />
                          ) : (
                            <EyeSlashIcon
                              cursor="pointer"
                              fontSize="var(--icon-fontSize-md)"
                              onClick={(): void => {
                                setShowPassword(true);
                              }}
                            />
                          )
                        }
                        label={t('auth.resetPassword.fields.password')}
                        type={showPassword ? 'text' : 'password'}
                      />
                      {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
                    </FormControl>
                  )}
                />
                <Controller
                  control={control}
                  name="passwordConfirmation"
                  render={({ field }) => (
                    <FormControl error={Boolean(errors.passwordConfirmation)}>
                      <InputLabel>{t('auth.resetPassword.fields.passwordConfirmation')}</InputLabel>
                      <OutlinedInput
                        {...field}
                        label={t('auth.resetPassword.fields.passwordConfirmation')}
                        type={showPassword ? 'text' : 'password'}
                      />
                      {errors.passwordConfirmation ? (
                        <FormHelperText>{errors.passwordConfirmation.message}</FormHelperText>
                      ) : null}
                    </FormControl>
                  )}
                />
              </React.Fragment>
            ) : null}
            {successMessage ? <Alert color="success">{successMessage}</Alert> : null}
            {errors.root ? <Alert color="error">{errors.root.message}</Alert> : null}
            <Button disabled={isPending} type="submit" variant="contained">
              {isResetMode ? t('auth.resetPassword.actions.update') : t('auth.resetPassword.actions.request')}
            </Button>
            {!isResetMode ? (
              <Link component={RouterLink} href={paths.auth.custom.signIn} variant="subtitle2">
                {t('auth.resetPassword.actions.backToSignIn')}
              </Link>
            ) : null}
          </Stack>
        </form>
      )}
    </Stack>
  );
}

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
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
import {
  buildAuthPathWithCheckoutIntent,
  getCheckoutAnalyticsParameters,
  getCheckoutIntentFromSearch,
  getStoredCheckoutIntent,
  persistCheckoutIntentFromSearch,
} from '@/lib/billing/checkout-intent';
import { trackAnalyticsEvent } from '@/lib/google-analytics';
import { getSupportedLanguage } from '@/lib/i18n';
import { fetchGoogleProfile } from '@/lib/google/profile';
import { requestGoogleAccessToken } from '@/lib/google/oauth';
import { useUser } from '@/hooks/use-user';
import { RouterLink } from '@/components/core/link';
import { DynamicLogo } from '@/components/core/logo';
import { toast } from '@/components/core/toaster';

interface OAuthProvider {
  id: 'google';
  name: string;
  logo: string;
}

const oAuthProviders = [{ id: 'google', name: 'Google', logo: '/assets/logo-google.svg' }] satisfies OAuthProvider[];

interface Values {
  email: string;
  name: string;
  password: string;
  passwordConfirmation: string;
}

const defaultValues = { email: '', name: '', password: '', passwordConfirmation: '' } satisfies Values;

export function SignUpForm(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const { checkSession } = useUser();
  const [searchParams] = useSearchParams();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const previousLanguageRef = React.useRef(currentLanguage);
  const signupStartedRef = React.useRef(false);

  const [isPending, setIsPending] = React.useState<boolean>(false);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [successMessage, setSuccessMessage] = React.useState<null | string>(null);
  const signInHref = React.useMemo(
    () => buildAuthPathWithCheckoutIntent(paths.auth.custom.signIn, searchParams),
    [searchParams]
  );
  const analyticsParameters = React.useMemo(
    () => getCheckoutAnalyticsParameters(getCheckoutIntentFromSearch(searchParams) ?? getStoredCheckoutIntent()),
    [searchParams]
  );

  const markSignupStarted = React.useCallback(
    (method: 'email' | 'google'): void => {
      if (signupStartedRef.current) {
        return;
      }

      signupStartedRef.current = true;
      trackAnalyticsEvent('signup_started', { ...analyticsParameters, method });
    },
    [analyticsParameters]
  );

  const schema = React.useMemo(
    () =>
      zod
        .object({
          email: zod
            .string()
            .min(1, { message: t('auth.signUp.validation.emailRequired') })
            .email({ message: t('auth.signUp.validation.emailInvalid') }),
          name: zod.string().trim().min(1, { message: t('auth.signUp.validation.nameRequired') }),
          password: zod.string().min(8, { message: t('auth.signUp.validation.passwordMin') }),
          passwordConfirmation: zod.string().min(1, {
            message: t('auth.signUp.validation.passwordConfirmationRequired'),
          }),
        })
        .refine((value) => value.password === value.passwordConfirmation, {
          message: t('auth.signUp.validation.passwordMismatch'),
          path: ['passwordConfirmation'],
        }),
    [t]
  );

  const {
    control,
    clearErrors,
    handleSubmit,
    reset,
    setError,
    trigger,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (previousLanguageRef.current === currentLanguage) {
      return;
    }

    previousLanguageRef.current = currentLanguage;

    if (errors.email || errors.name || errors.password || errors.passwordConfirmation) {
      trigger(['email', 'name', 'password', 'passwordConfirmation']).catch(() => {
        // ignore
      });
    }
  }, [currentLanguage, errors.email, errors.name, errors.password, errors.passwordConfirmation, trigger]);

  React.useEffect(() => {
    persistCheckoutIntentFromSearch(searchParams);
  }, [searchParams]);

  const handleGoogleAuth = React.useCallback(async (): Promise<void> => {
    markSignupStarted('google');
    setIsPending(true);

    try {
      const accessToken = await requestGoogleAccessToken();
      const profile = await fetchGoogleProfile(accessToken);
      const { error } = await authClient.signUpWithGoogle({
        accessToken,
        locale: getSupportedLanguage(currentLanguage),
        profile,
      });

      if (error) {
        throw new Error(error);
      }

      trackAnalyticsEvent('sign_up', { ...analyticsParameters, method: 'google' });
      await checkSession?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.signUp.errors.googleAuth');
      setError('root', { type: 'server', message });
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }, [analyticsParameters, checkSession, currentLanguage, markSignupStarted, setError, t]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      markSignupStarted('email');
      setIsPending(true);
      setSuccessMessage(null);
      clearErrors('root');

      const { error } = await authClient.signUp({
        email: values.email,
        locale: getSupportedLanguage(currentLanguage),
        name: values.name.trim(),
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      });

      if (error) {
        setError('root', { type: 'server', message: error });
        setIsPending(false);
        return;
      }

      trackAnalyticsEvent('sign_up', { ...analyticsParameters, method: 'email' });
      const feedback = t('auth.signUp.verificationSent');
      setSuccessMessage(feedback);
      reset(defaultValues);
      toast.success(t('auth.signUp.verificationSentToast'));
      setIsPending(false);
    },
    [analyticsParameters, clearErrors, currentLanguage, markSignupStarted, reset, setError, t]
  );

  return (
    <Stack spacing={4}>
      <div>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-block', fontSize: 0 }}>
          <DynamicLogo colorDark="light" colorLight="dark" height={32} width={122} />
        </Box>
      </div>
      <Stack spacing={1}>
        <Typography variant="h5">{t('auth.signUp.title')}</Typography>
        <Typography color="text.secondary" variant="body2">
          {t('auth.signUp.hasAccount')}{' '}
          <Link component={RouterLink} href={signInHref} variant="subtitle2">
            {t('auth.signUp.signIn')}
          </Link>
        </Typography>
      </Stack>
      <Stack spacing={3}>
        <Stack spacing={2}>
          {oAuthProviders.map(
            (provider): React.JSX.Element => (
              <Button
                color="secondary"
                disabled={isPending}
                endIcon={<Box alt="" component="img" height={24} src={provider.logo} width={24} />}
                key={provider.id}
                onClick={handleGoogleAuth}
                variant="outlined"
              >
                {t('auth.signUp.continueWith', { provider: provider.name })}
              </Button>
            )
          )}
        </Stack>
        <Divider>{t('auth.signUp.divider')}</Divider>
        <form
          onFocusCapture={() => {
            markSignupStarted('email');
          }}
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack spacing={2}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <FormControl error={Boolean(errors.name)}>
                  <InputLabel>{t('auth.signUp.fields.name')}</InputLabel>
                  <OutlinedInput {...field} label={t('auth.signUp.fields.name')} />
                  {errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormControl error={Boolean(errors.email)}>
                  <InputLabel>{t('auth.signUp.fields.email')}</InputLabel>
                  <OutlinedInput {...field} label={t('auth.signUp.fields.email')} type="email" />
                  {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <FormControl error={Boolean(errors.password)}>
                  <InputLabel>{t('auth.signUp.fields.password')}</InputLabel>
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
                    label={t('auth.signUp.fields.password')}
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
                  <InputLabel>{t('auth.signUp.fields.passwordConfirmation')}</InputLabel>
                  <OutlinedInput
                    {...field}
                    label={t('auth.signUp.fields.passwordConfirmation')}
                    type={showPassword ? 'text' : 'password'}
                  />
                  {errors.passwordConfirmation ? (
                    <FormHelperText>{errors.passwordConfirmation.message}</FormHelperText>
                  ) : null}
                </FormControl>
              )}
            />
            {successMessage ? <Alert color="success">{successMessage}</Alert> : null}
            {errors.root ? <Alert color="error">{errors.root.message}</Alert> : null}
            <Button disabled={isPending} type="submit" variant="contained">
              {t('auth.signUp.actions.submit')}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Stack>
  );
}
